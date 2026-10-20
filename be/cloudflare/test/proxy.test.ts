import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/config';

const BASE: Env = {
  PROXY_API_KEYS: 'test-key-1,test-key-2',
  ORDERS_ORIGIN: 'https://orders.internal.example.com',
  USERS_ORIGIN: 'https://users.internal.example.com',
  UPSTREAM_TIMEOUT_MS: '50',
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response('ok', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function call(path: string, init: RequestInit = {}, env: Env = BASE, token: string | null = 'test-key-1') {
  const headers = new Headers(init.headers);
  if (token !== null) headers.set('authorization', `Bearer ${token}`);
  return worker.fetch(new Request(`https://proxy.example.com${path}`, { ...init, headers }), env);
}

function upstreamCall(): [string, RequestInit] {
  return fetchMock.mock.calls[0] as [string, RequestInit];
}

describe('health and auth', () => {
  it('serves /__health without auth', async () => {
    const res = await call('/__health', {}, BASE, null);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('returns 401 for missing and wrong tokens without calling upstream', async () => {
    const none = await call('/orders/x', {}, BASE, null);
    const bad = await call('/orders/x', {}, BASE, 'nope');
    expect(none.status).toBe(401);
    expect(bad.status).toBe(401);
    const body = (await bad.json()) as { requestId: string };
    expect(body.requestId).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails closed with 503 when PROXY_API_KEYS is unset or empty', async () => {
    const a = await call('/orders/x', {}, { ...BASE, PROXY_API_KEYS: undefined });
    const b = await call('/orders/x', {}, { ...BASE, PROXY_API_KEYS: ' , ' });
    expect(a.status).toBe(503);
    expect(b.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('routing', () => {
  it('hides unknown keys before auth and returns 404 after', async () => {
    expect((await call('/nope/x', {}, BASE, null)).status).toBe(401);
    expect((await call('/nope/x')).status).toBe(404);
    expect((await call('/constructor/x')).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 405 with Allow for disallowed methods', async () => {
    const res = await call('/users/1', { method: 'POST', body: 'x' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toContain('GET');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['/orders/%2e%2e%2fadmin', '/orders//x', '/orders/a%5Cb'])('rejects unsafe path %s with 400', async (p) => {
    const res = await call(p);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a non-https origin', async () => {
    const res = await call('/orders/x', {}, { ...BASE, ORDERS_ORIGIN: 'http://orders.internal.example.com' });
    expect(res.status).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('forwarding', () => {
  it('builds the upstream URL from the registry and keeps the query unchanged', async () => {
    await call('/orders/v1/items?a=1&b=%20x');
    const [url, init] = upstreamCall();
    expect(url).toBe('https://orders.internal.example.com/v1/items?a=1&b=%20x');
    expect(init.redirect).toBe('manual');
  });

  it('strips client headers and adds proxy headers and Access tokens', async () => {
    const env = { ...BASE, UPSTREAM_ACCESS_CLIENT_ID: 'id-placeholder', UPSTREAM_ACCESS_CLIENT_SECRET: 'secret-placeholder' };
    const res = await call(
      '/orders/x',
      {
        headers: {
          cookie: 'sid=1',
          'cf-connecting-ip': '203.0.113.9',
          'cf-ray': 'abc',
          'x-forwarded-for': '6.6.6.6',
          'x-forwarded-host': 'evil.example.com',
          'x-request-id': 'spoofed',
          connection: 'keep-alive',
          accept: 'application/json',
        },
      },
      env,
    );
    const h = new Headers(upstreamCall()[1].headers);
    expect(h.get('authorization')).toBeNull();
    expect(h.get('cookie')).toBeNull();
    expect(h.get('cf-ray')).toBeNull();
    expect(h.get('cf-connecting-ip')).toBeNull();
    expect(h.get('x-forwarded-host')).toBeNull();
    expect(h.get('x-forwarded-for')).toBe('203.0.113.9');
    expect(h.get('accept')).toBe('application/json');
    expect(h.get('x-request-id')).not.toBe('spoofed');
    expect(h.get('x-request-id')).toBe(res.headers.get('x-request-id'));
    expect(h.get('cf-access-client-id')).toBe('id-placeholder');
    expect(h.get('cf-access-client-secret')).toBe('secret-placeholder');
  });

  it('strips internal response headers', async () => {
    fetchMock.mockImplementation(async () => {
      const h = new Headers({ 'content-type': 'text/plain', server: 'internal-nginx', 'x-powered-by': 'Express', 'x-internal-trace': 't', 'x-envoy-upstream': 'e' });
      h.append('set-cookie', 'a=1; Domain=internal.example.com');
      return new Response('body', { status: 200, headers: h });
    });
    const res = await call('/orders/x');
    expect(res.status).toBe(200);
    expect(res.headers.get('server')).toBeNull();
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-internal-trace')).toBeNull();
    expect(res.headers.get('x-envoy-upstream')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('content-type')).toBe('text/plain');
  });

  it('does not follow redirects and rewrites or drops Location', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 302, headers: { location: 'https://orders.internal.example.com/v2/y?q=1' } }));
    const internal = await call('/orders/x');
    expect(internal.status).toBe(302);
    expect(internal.headers.get('location')).toBe('/orders/v2/y?q=1');

    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 302, headers: { location: 'https://other.internal.example.com/z' } }));
    const external = await call('/orders/x');
    expect(external.status).toBe(302);
    expect(external.headers.get('location')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps an upstream timeout to 504', async () => {
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const res = await call('/orders/slow');
    expect(res.status).toBe(504);
    const body = (await res.json()) as { requestId: string; error: string };
    expect(body.error).toBe('upstream_timeout');
    expect(body.requestId).toBeTruthy();
  });

  it('maps upstream failure to a generic 502 without leaking details', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:443'));
    const res = await call('/orders/x');
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain('10.0.0.5');
    expect(text).not.toContain('internal.example.com');
  });

  it('streams request and response bodies without buffering', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('chunk1'));
        c.close();
      },
    });
    fetchMock.mockImplementation(async () => new Response(stream, { status: 200 }));
    const res = await call('/orders/upload', { method: 'POST', body: 'payload' });
    const [, init] = upstreamCall();
    expect(init.body).toBeInstanceOf(ReadableStream);
    expect(res.body).toBeInstanceOf(ReadableStream);
    expect(await res.text()).toBe('chunk1');
  });
});
