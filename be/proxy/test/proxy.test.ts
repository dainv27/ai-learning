import { createExecutionContext, env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../src/index';
import type { Env } from '../src/types/env';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}

// Test-only values. Not real secrets. Real values come from wrangler secrets.
const CLIENT_TOKEN = 'test-client-token';
const UPSTREAM_TOKEN = 'test-upstream-token';
const BASE = 'https://proxy.test';

const upstreamFetch = vi.fn<(req: Request) => Promise<Response>>();

async function call(path: string, init: RequestInit = {}, withAuth = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (withAuth) {
    headers.set('Authorization', `Bearer ${CLIENT_TOKEN}`);
  }
  const request = new Request(`${BASE}${path}`, { ...init, headers });
  return worker.fetch(request, env, createExecutionContext());
}

beforeEach(() => {
  upstreamFetch.mockReset();
  vi.stubGlobal('fetch', upstreamFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('health', () => {
  it('serves GET /healthz locally without upstream or auth', async () => {
    const res = await call('/healthz', {}, false);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

describe('passthrough', () => {
  it('returns 200 and forwards only allowlisted headers with injected credential', async () => {
    upstreamFetch.mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'session=abc',
          server: 'internal-nginx',
          'x-powered-by': 'internal',
        },
      }),
    );

    const res = await call('/example/v1/items/42?limit=5', {
      method: 'GET',
      headers: {
        Cookie: 'a=b',
        'X-Forwarded-For': '203.0.113.9',
        Accept: 'application/json',
      },
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"ok":true}');
    expect(upstreamFetch).toHaveBeenCalledTimes(1);

    const sent = upstreamFetch.mock.calls[0][0];
    expect(sent.url).toBe('https://example-internal.invalid/v1/items/42?limit=5');
    expect(sent.redirect).toBe('manual');
    expect(sent.headers.get('cookie')).toBeNull();
    expect(sent.headers.get('x-forwarded-for')).toBeNull();
    expect(sent.headers.get('accept')).toBe('application/json');
    expect(sent.headers.get('authorization')).toBe(`Bearer ${UPSTREAM_TOKEN}`);
    expect(sent.headers.get('x-request-id')).toBeTruthy();

    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('server')).toBeNull();
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('content-type')).toBe('application/json');
  });

  it('does not follow upstream redirects and drops Location', async () => {
    upstreamFetch.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: 'https://internal.invalid/login' } }),
    );
    const res = await call('/example/status');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBeNull();
    expect(upstreamFetch.mock.calls[0][0].redirect).toBe('manual');
  });
});

describe('authentication', () => {
  it('returns 401 when the credential is missing and never calls upstream', async () => {
    const res = await call('/example/v1/items', {}, false);
    expect(res.status).toBe(401);
    expect((await res.json() as { error: { code: string } }).error.code).toBe('unauthorized');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns 403 when the credential is wrong and never calls upstream', async () => {
    const res = await call('/example/v1/items', { headers: { Authorization: 'Bearer wrong-token' } }, false);
    expect(res.status).toBe(403);
    expect((await res.json() as { error: { code: string } }).error.code).toBe('forbidden');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

describe('routing allowlist', () => {
  it('returns 404 for an unknown service key', async () => {
    const res = await call('/unknown-service/v1/items');
    expect(res.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns 404 for a path outside the allowed prefixes', async () => {
    const res = await call('/example/admin/secret');
    expect(res.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns 404 for a prefix that only partially matches a segment', async () => {
    const res = await call('/example/v1/itemsx');
    expect(res.status).toBe(404);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns 405 with an Allow header for a disallowed method', async () => {
    const res = await call('/example/v1/items', { method: 'DELETE' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD, POST');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

describe('path validation (400)', () => {
  it('rejects encoded slash', async () => {
    const res = await call('/example/v1%2Fitems');
    expect(res.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects encoded dot-segments', async () => {
    const res = await call('/example/v1/%2e%2e%2Fsecret');
    expect(res.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects double slashes', async () => {
    const res = await call('/example//v1/items');
    expect(res.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects encoded control characters', async () => {
    const res = await call('/example/v1/items%0a');
    expect(res.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects over-long URLs', async () => {
    const res = await call(`/example/v1/items/${'a'.repeat(2100)}`);
    expect(res.status).toBe(400);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

describe('body limits (413)', () => {
  it('rejects a declared Content-Length above the cap', async () => {
    const res = await call('/example/v1/items', {
      method: 'POST',
      body: 'x',
      headers: { 'content-length': '2000000' },
    });
    expect(res.status).toBe(413);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects a streamed body that exceeds the cap', async () => {
    upstreamFetch.mockImplementation(async (req: Request) => {
      await req.text();
      return new Response('ok', { status: 200 });
    });
    const chunk = new Uint8Array(600_000);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk);
        controller.enqueue(chunk);
        controller.close();
      },
    });
    const res = await call('/example/v1/items', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
    expect(res.status).toBe(413);
  });
});

describe('upstream failures', () => {
  it('maps connection errors to 502 without leaking the upstream origin', async () => {
    upstreamFetch.mockRejectedValue(new TypeError('connection refused'));
    const res = await call('/example/v1/items');
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain('example-internal');
    expect(text).not.toContain(UPSTREAM_TOKEN);
    expect(JSON.parse(text)).toEqual({ error: { code: 'bad_gateway', message: 'Upstream service is unavailable' } });
  });

  it('maps abort or timeout to 504', async () => {
    upstreamFetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const res = await call('/example/v1/items');
    expect(res.status).toBe(504);
    expect((await res.json() as { error: { code: string } }).error.code).toBe('gateway_timeout');
  });
});
