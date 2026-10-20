import { describe, it, expect } from 'vitest';
import { call, setup, sign, upstreamCalls, ENV } from './helpers';
import { responseHeaders } from '../src/headers';

const ok = () => new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } });

describe('authentication', () => {
  it('returns 401 for missing, malformed, expired and wrong-aud tokens without calling upstream', async () => {
    const f = setup(ok);
    for (const token of [null, 'a.b.c', await sign({ exp: 1 }), await sign({ aud: ['x'] })]) {
      const res = await call('/service-a/api/x', { token });
      expect(res.status).toBe(401);
    }
    expect(upstreamCalls(f)).toHaveLength(0);
  });
});

describe('configuration', () => {
  it.each([
    ['missing aud', { ACCESS_AUD: undefined }],
    ['missing team domain', { ACCESS_TEAM_DOMAIN: undefined }],
    ['foreign team domain', { ACCESS_TEAM_DOMAIN: 'evil.example.com' }],
    ['missing origin', { SERVICE_A_ORIGIN: undefined }],
    ['http origin', { SERVICE_A_ORIGIN: 'http://service-a.internal.example' }],
    ['ip origin', { SERVICE_A_ORIGIN: 'https://127.0.0.1' }],
    ['private ip origin', { SERVICE_B_ORIGIN: 'https://10.0.0.5' }],
    ['localhost origin', { SERVICE_A_ORIGIN: 'https://localhost' }],
  ])('returns 503 for %s', async (_n, patch) => {
    const f = setup(ok);
    const res = await call('/service-a/api/x', {}, { ...ENV, ...patch });
    expect(res.status).toBe(503);
    expect(upstreamCalls(f)).toHaveLength(0);
  });
});

describe('routing', () => {
  it('404 unknown service, 405 bad method', async () => {
    const f = setup(ok);
    expect((await call('/unknown/api/x')).status).toBe(404);
    const res = await call('/service-a/api/x', { method: 'DELETE' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toContain('GET');
    expect(upstreamCalls(f)).toHaveLength(0);
  });

  it.each([
    '/service-a/api%2Fx',
    '/service-a/api/%2fx',
    '/service-a/api/a%5cb',
    '/service-a/api/%00',
    '/service-a/api/%252e%252e/x',
    '/service-a/api//x',
    '/service-a/api/%2E%2e/x',
  ])('400 for %s', async (p) => {
    const f = setup(ok);
    expect((await call(p)).status).toBe(400);
    expect(upstreamCalls(f)).toHaveLength(0);
  });
});

describe('forwarding', () => {
  it('strips sensitive headers, keeps allowed ones and ignores client-chosen targets', async () => {
    const f = setup(ok);
    const res = await call('/service-a/api/users?x=1&url=https://evil.example.com', {
      headers: {
        cookie: 'sid=1',
        authorization: 'Bearer secret',
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '1.2.3.4',
        host: 'evil.example.com',
        'content-type': 'application/json',
        accept: 'application/json',
      },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('hello');
    const [url, init] = upstreamCalls(f)[0];
    const h = init.headers as Headers;
    expect(url).toBe('https://service-a.internal.example/api/users?x=1&url=https://evil.example.com');
    expect(init.redirect).toBe('manual');
    for (const n of ['cookie', 'authorization', 'x-forwarded-for', 'x-real-ip', 'cf-access-jwt-assertion']) {
      expect(h.has(n)).toBe(false);
    }
    expect(h.get('content-type')).toBe('application/json');
    expect(h.get('accept')).toBe('application/json');
    expect(h.get('x-forwarded-host')).toBe('proxy.example.com');
    expect(h.get('x-request-id')).toBeTruthy();
    expect(res.headers.get('x-request-id')).toBe(h.get('x-request-id'));
  });

  it('streams the request body', async () => {
    const f = setup(ok);
    await call('/service-a/api/items', { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
    const init = upstreamCalls(f)[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(ReadableStream);
  });

  it('does not return Set-Cookie or hop-by-hop headers', async () => {
    setup(() => new Response('x', { headers: { 'set-cookie': 'a=b', 'x-keep': '1' } }));
    const res = await call('/service-a/api/x');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('x-keep')).toBe('1');
    const h = responseHeaders(
      new Headers({ 'set-cookie': 'a=b', connection: 'close', 'transfer-encoding': 'chunked', upgrade: 'x', 'x-keep': '1' }),
      'https://service-a.internal.example', 'service-a', 'id',
    );
    expect([...h.keys()].sort()).toEqual(['x-keep', 'x-request-id']);
  });
});

describe('redirects', () => {
  it('does not follow redirects, rewrites internal Location and blocks external Location', async () => {
    let loc = 'https://service-a.internal.example/api/new?a=1';
    const f = setup(() => new Response(null, { status: 302, headers: { location: loc } }));
    let res = await call('/service-a/api/x');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/service-a/api/new?a=1');
    loc = 'https://evil.example.com/x';
    res = await call('/service-a/api/x');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBeNull();
    expect(upstreamCalls(f)).toHaveLength(2);
  });
});

describe('upstream failures', () => {
  it('504 on timeout', async () => {
    setup((_u, init) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason))));
    const res = await call('/service-a/api/slow', {}, { ...ENV, UPSTREAM_TIMEOUT_MS: '20' });
    expect(res.status).toBe(504);
  });

  it('502 on connect failure without leaking origin details', async () => {
    setup(() => { throw new TypeError('connect ECONNREFUSED service-a.internal.example'); });
    const res = await call('/service-a/api/x');
    expect(res.status).toBe(502);
    const body = await res.text();
    expect(body).not.toContain('internal');
    expect(body).not.toContain('ECONNREFUSED');
  });
});
