import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

// Loader so the delivered TypeScript can be imported by plain Node (needs Node >= 22.13).
const HOOKS = `
export async function resolve(specifier, context, nextResolve) {
  const rel = specifier.startsWith('./') || specifier.startsWith('../');
  const hasExt = ['.ts', '.js', '.mjs', '.json'].some((e) => specifier.endsWith(e));
  if (rel && !hasExt) {
    try { return await nextResolve(specifier + '.ts', context); } catch (e) {}
  }
  return nextResolve(specifier, context);
}
export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.ts')) {
    const fs = await import('node:fs/promises');
    const mod = await import('node:module');
    let src = await fs.readFile(new URL(url), 'utf8');
    src = src.split('import { Env,').join('import { type Env,');
    return { format: 'module', source: mod.stripTypeScriptTypes(src), shortCircuit: true };
  }
  return nextLoad(url, context);
}
`;
register('data:text/javascript,' + encodeURIComponent(HOOKS), import.meta.url);

const SRC = new URL('../../be/cloudflare/src/', import.meta.url);
const ROOT = new URL('../../be/cloudflare/', import.meta.url);
const worker = (await import(new URL('index.ts', SRC).href)).default;
const { parseRoute } = await import(new URL('router.ts', SRC).href);
const { authenticate } = await import(new URL('auth.ts', SRC).href);
const { lookupService, resolveOrigin } = await import(new URL('config.ts', SRC).href);
const { buildUpstreamHeaders, buildClientHeaders } = await import(new URL('headers.ts', SRC).href);

const BASE = {
  PROXY_API_KEYS: 'test-key-1,test-key-2',
  ORDERS_ORIGIN: 'https://orders.internal.example.com',
  USERS_ORIGIN: 'https://users.internal.example.com',
  UPSTREAM_TIMEOUT_MS: '100',
};
const ORDERS = 'https://orders.internal.example.com';

const realFetch = globalThis.fetch;
let calls = [];
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(impl = async () => new Response('ok', { status: 200 })) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init || {} });
    return impl(url, init || {});
  };
}

function call(path, init = {}, env = BASE, token = 'test-key-1') {
  const headers = new Headers(init.headers);
  if (token !== null) headers.set('authorization', 'Bearer ' + token);
  return worker.fetch(new Request('https://proxy.example.com' + path, { ...init, headers }), env);
}

async function race(p, ms) {
  let t;
  const timeout = new Promise((r) => { t = setTimeout(() => r('timeout'), ms); });
  try { return await Promise.race([p, timeout]); } finally { clearTimeout(t); }
}

function req(headers) {
  return new Request('https://proxy.example.com/orders/x', { headers });
}

// ---------- Unit ----------

test('[TC-001] parseRoute accepts safe paths and rejects unsafe ones', () => {
  const ok = parseRoute('/orders/v1/items');
  assert.equal(ok.ok, true);
  assert.equal(ok.service, 'orders');
  assert.equal(ok.path, '/v1/items');
  const bad = [
    '/orders//x',
    '/orders/a\\b',
    '/orders/a%5Cb',
    '/orders/%2e%2e%2fadmin',
    '/orders/%252e%252e%252fadmin',
    '/orders/a%2f%2fb',
    '/orders/%E0%A4%A',
  ];
  for (const p of bad) {
    assert.equal(parseRoute(p).ok, false, 'must reject ' + p);
  }
});

test('[TC-002] authenticate checks Bearer tokens and fails closed', () => {
  const keys = 'k-one, k-two';
  const r = (h) => req(h);
  assert.equal(authenticate(r({ authorization: 'Bearer k-one' }), keys), 'ok');
  assert.equal(authenticate(r({ authorization: 'Bearer k-two' }), keys), 'ok');
  assert.equal(authenticate(r({ authorization: 'Bearer nope' }), keys), 'unauthorized');
  assert.equal(authenticate(r({ authorization: 'Bearer k-on' }), keys), 'unauthorized', 'prefix must not match');
  assert.equal(authenticate(r({ authorization: 'Bearer k-onex' }), keys), 'unauthorized', 'longer must not match');
  assert.equal(authenticate(r({ authorization: 'Basic k-one' }), keys), 'unauthorized');
  assert.equal(authenticate(r({}), keys), 'unauthorized');
  for (const empty of [undefined, '', ' , ']) {
    assert.equal(authenticate(r({ authorization: 'Bearer k-one' }), empty), 'unconfigured');
  }
});

test('[TC-003] lookupService only resolves registered keys and resolveOrigin enforces https', () => {
  assert.ok(lookupService('orders'));
  assert.ok(lookupService('users'));
  for (const k of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'nope', '']) {
    assert.equal(lookupService(k), null, 'must not resolve ' + k);
  }
  const def = lookupService('orders');
  assert.equal(resolveOrigin({ ORDERS_ORIGIN: ORDERS }, def), ORDERS);
  assert.equal(resolveOrigin({ ORDERS_ORIGIN: 'http://orders.internal.example.com' }, def), null);
  assert.equal(resolveOrigin({ ORDERS_ORIGIN: 'https://user:pw@orders.internal.example.com' }, def), null);
  assert.equal(resolveOrigin({ ORDERS_ORIGIN: 'not a url' }, def), null);
  assert.equal(resolveOrigin({}, def), null);
});

test('[TC-004] header filters remove client and internal headers in both directions', () => {
  const up = buildUpstreamHeaders(
    new Headers({
      authorization: 'Bearer secret',
      cookie: 'sid=1',
      host: 'proxy.example.com',
      'cf-ray': 'abc',
      'cf-connecting-ip': '203.0.113.9',
      'x-forwarded-host': 'evil.example.com',
      'x-forwarded-for': '6.6.6.6',
      connection: 'keep-alive',
      accept: 'application/json',
    }),
    'rid-1',
  );
  for (const h of ['authorization', 'cookie', 'cf-ray', 'cf-connecting-ip', 'x-forwarded-host', 'connection']) {
    assert.equal(up.get(h), null, h + ' must not be forwarded');
  }
  assert.equal(up.get('accept'), 'application/json');
  assert.equal(up.get('x-request-id'), 'rid-1');
  assert.notEqual(up.get('x-forwarded-for'), '6.6.6.6');

  const upstream = new Headers({
    'content-type': 'text/plain',
    server: 'nginx',
    'x-powered-by': 'Express',
    'x-internal-trace': 't',
    'x-envoy-upstream-service-time': '3',
    'cf-cache-status': 'HIT',
  });
  upstream.append('set-cookie', 'a=1; Domain=internal.example.com');
  const down = buildClientHeaders(upstream, 'rid-2', 'orders', ORDERS + '/x');
  for (const h of ['server', 'x-powered-by', 'x-internal-trace', 'x-envoy-upstream-service-time', 'cf-cache-status', 'set-cookie']) {
    assert.equal(down.get(h), null, h + ' must be stripped');
  }
  assert.equal(down.get('content-type'), 'text/plain');
  assert.equal(down.get('x-request-id'), 'rid-2');
});

// ---------- Integration ----------

test('[TC-010] health check is unauthenticated and static', async () => {
  mockFetch();
  const res = await call('/__health', {}, BASE, null);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok' });
  assert.equal(calls.length, 0);
});

test('[TC-011] missing or invalid credentials give 401 and never reach upstream', async () => {
  mockFetch();
  const none = await call('/orders/x', {}, BASE, null);
  const bad = await call('/orders/x', {}, BASE, 'wrong');
  const basic = await call('/orders/x', { headers: { authorization: 'Basic test-key-1' } }, BASE, null);
  const empty = await call('/orders/x', { headers: { authorization: 'Bearer ' } }, BASE, null);
  for (const [name, r] of [['none', none], ['bad', bad], ['basic', basic], ['empty', empty]]) {
    assert.equal(r.status, 401, name + ' must be 401');
  }
  assert.equal(calls.length, 0, 'upstream must not be called');
});

test('[TC-012] unconfigured PROXY_API_KEYS fails closed with 503', async () => {
  mockFetch();
  for (const keys of [undefined, '', ' , ']) {
    const env = { ...BASE, PROXY_API_KEYS: keys };
    assert.equal((await call('/orders/x', {}, env)).status, 503, 'with token, keys=' + JSON.stringify(keys));
    assert.equal((await call('/orders/x', {}, env, null)).status, 503, 'without token, keys=' + JSON.stringify(keys));
  }
  assert.equal(calls.length, 0);
});

test('[TC-013] unknown service key is indistinguishable before auth', async () => {
  mockFetch();
  const a = await call('/nope/x', {}, BASE, null);
  const b = await call('/orders/x', {}, BASE, null);
  const c = await call('/orders/%2e%2e%2fadmin', {}, BASE, null);
  assert.equal(a.status, 401);
  assert.equal(b.status, 401);
  assert.equal(c.status, 401);
  const ja = await a.json();
  const jb = await b.json();
  assert.equal(ja.error, jb.error);
  assert.equal(ja.message, jb.message);
  assert.equal(calls.length, 0);
});

test('[TC-014] authenticated unknown service key returns 404', async () => {
  mockFetch();
  for (const k of ['nope', 'constructor', '__proto__', 'toString']) {
    const res = await call('/' + k + '/x');
    assert.equal(res.status, 404, k + ' must be 404');
  }
  assert.equal(calls.length, 0);
});

test('[TC-015] disallowed method returns 405 with Allow', async () => {
  mockFetch();
  const post = await call('/users/1', { method: 'POST', body: 'x' });
  assert.equal(post.status, 405);
  assert.ok((post.headers.get('allow') || '').includes('GET'), 'Allow header must list GET');
  const del = await call('/users/1', { method: 'DELETE' });
  assert.equal(del.status, 405);
  assert.equal(calls.length, 0);
});

test('[TC-016] path traversal variants are rejected with 400', async () => {
  const bad = [
    '/orders/%2e%2e%2fadmin',
    '/orders/%2E%2E%2Fadmin',
    '/orders//x',
    '/orders/a%5Cb',
    '/orders/a%5cb',
    '/orders/%252e%252e%252fadmin',
    '/orders/a%2f%2fb',
    '/orders/%E0%A4%A',
  ];
  for (const p of bad) {
    mockFetch();
    const res = await call(p);
    assert.equal(res.status, 400, p + ' must be 400');
    assert.equal(calls.length, 0, p + ' must not reach upstream');
  }
  mockFetch();
  await call('/orders/%2e%2e/admin');
  for (const c of calls) {
    assert.ok(!c.url.includes('/admin'), 'collapsed traversal must not reach upstream: ' + c.url);
  }
});

test('[TC-017] upstream host is never client-controlled', async () => {
  const paths = ['/orders/@evil.example.com/x', '/orders/.evil.example.com', '/orders/https:/evil.example.com/x', '/orders/:8080/x', '/orders/x@evil.example.com'];
  for (const p of paths) {
    mockFetch();
    await call(p, { headers: { host: 'evil.example.com', 'x-forwarded-host': 'evil.example.com' } });
    assert.ok(calls.length <= 1, 'at most one upstream call');
    for (const c of calls) {
      assert.equal(new URL(c.url).origin, ORDERS, 'origin must come from registry for ' + p + ' but was ' + c.url);
    }
  }
});

test('[TC-018] non-https, credentialed, invalid or missing origin is refused', async () => {
  const origins = ['http://orders.internal.example.com', 'https://u:p@orders.internal.example.com', 'garbage', undefined];
  for (const o of origins) {
    mockFetch();
    const res = await call('/orders/x', {}, { ...BASE, ORDERS_ORIGIN: o });
    assert.equal(res.status, 502, 'origin ' + o + ' must be refused');
    assert.equal(calls.length, 0);
  }
});

test('[TC-019] query string and encoded path are passed through unchanged', async () => {
  mockFetch();
  const res = await call('/orders/a%20b/c?a=1&b=%20x&c=a+b&d=%2e%2e');
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ORDERS + '/a%20b/c?a=1&b=%20x&c=a+b&d=%2e%2e');
});

test('[TC-020] client request headers are stripped before upstream', async () => {
  mockFetch();
  await call('/orders/x', {
    headers: {
      cookie: 'sid=1',
      'cf-connecting-ip': '203.0.113.9',
      'cf-ray': 'abc',
      'cf-ipcountry': 'VN',
      'x-forwarded-for': '6.6.6.6',
      'x-forwarded-host': 'evil.example.com',
      'x-forwarded-proto': 'http',
      'x-real-ip': '7.7.7.7',
      forwarded: 'for=8.8.8.8',
      connection: 'keep-alive',
      accept: 'application/json',
    },
  });
  const h = new Headers(calls[0].init.headers);
  for (const n of ['authorization', 'cookie', 'cf-ray', 'cf-ipcountry', 'cf-connecting-ip', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip', 'forwarded', 'connection']) {
    assert.equal(h.get(n), null, n + ' must not reach upstream');
  }
  assert.equal(h.get('accept'), 'application/json');
  assert.equal(h.get('x-forwarded-for'), '203.0.113.9');

  mockFetch();
  await call('/orders/x', { headers: { 'x-forwarded-for': '6.6.6.6' } });
  const h2 = new Headers(calls[0].init.headers);
  assert.notEqual(h2.get('x-forwarded-for'), '6.6.6.6', 'client-supplied X-Forwarded-For must not be forwarded');
  assert.equal(h2.get('authorization'), null);
});

test('[TC-021] internal response headers are stripped', async () => {
  mockFetch(async () => {
    const h = new Headers({
      'content-type': 'text/plain',
      server: 'internal-nginx',
      'x-powered-by': 'Express',
      'x-internal-trace': 't',
      'x-envoy-upstream-service-time': '5',
      'cf-cache-status': 'HIT',
    });
    h.append('set-cookie', 'a=1; Domain=internal.example.com');
    return new Response('body', { status: 200, headers: h });
  });
  const res = await call('/orders/x');
  assert.equal(res.status, 200);
  for (const n of ['server', 'x-powered-by', 'x-internal-trace', 'x-envoy-upstream-service-time', 'cf-cache-status', 'set-cookie']) {
    assert.equal(res.headers.get(n), null, n + ' must be stripped');
  }
  assert.equal(res.headers.get('content-type'), 'text/plain');
  assert.equal(await res.text(), 'body');
});

test('[TC-022] redirects are not followed and Location does not leak internal hosts', async () => {
  mockFetch(async () => new Response(null, { status: 302, headers: { location: ORDERS + '/v2/y?q=1' } }));
  const same = await call('/orders/x');
  assert.equal(same.status, 302, 'redirect must be returned, not followed');
  assert.equal(calls.length, 1, 'redirect must not be followed');
  assert.equal(calls[0].init.redirect, 'manual');
  const loc = same.headers.get('location');
  assert.ok(loc === null || !loc.includes('internal.example.com'), 'Location leaked: ' + loc);

  mockFetch(async () => new Response(null, { status: 302, headers: { location: 'https://secret.internal.example.com/z' } }));
  const other = await call('/orders/x');
  assert.equal(other.status, 302);
  const loc2 = other.headers.get('location');
  assert.ok(loc2 === null || !loc2.includes('internal.example.com'), 'Location leaked: ' + loc2);
});

test('[TC-023] upstream timeout maps to 504', async () => {
  mockFetch((url, init) => new Promise((_, reject) => {
    init.signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const res = await race(call('/orders/slow', {}, { ...BASE, UPSTREAM_TIMEOUT_MS: '50' }), 1500);
  assert.notEqual(res, 'timeout', 'worker did not enforce the upstream timeout');
  assert.equal(res.status, 504);
  const body = await res.json();
  assert.ok(body.requestId);
});

test('[TC-024] upstream failure maps to a generic 502 without leaking details', async () => {
  mockFetch(async () => {
    throw new Error('connect ECONNREFUSED 10.0.0.5:443 orders.internal.example.com');
  });
  const res = await call('/orders/x');
  assert.equal(res.status, 502);
  const text = await res.text();
  for (const s of ['ECONNREFUSED', '10.0.0.5', 'internal.example.com']) {
    assert.ok(!text.includes(s), 'body leaks ' + s);
  }
});

test('[TC-025] every error response is generic JSON with a request id', async () => {
  const cases = [
    [400, () => call('/orders//x'), null],
    [401, () => call('/orders/x', {}, BASE, null), null],
    [404, () => call('/nope/x'), null],
    [405, () => call('/users/1', { method: 'POST', body: 'x' }), null],
    [502, () => call('/orders/x', {}, { ...BASE, ORDERS_ORIGIN: 'http://orders.internal.example.com' }), null],
    [503, () => call('/orders/x', {}, { ...BASE, PROXY_API_KEYS: undefined }), null],
  ];
  for (const [status, run] of cases) {
    mockFetch();
    const res = await run();
    assert.equal(res.status, status);
    const text = await res.text();
    const body = JSON.parse(text);
    assert.equal(typeof body.error, 'string');
    assert.equal(typeof body.requestId, 'string');
    assert.ok(body.requestId.length > 0);
    assert.equal(res.headers.get('x-request-id'), body.requestId, 'header and body request id must match');
    assert.ok(!text.includes('internal.example.com'), 'no internal hostnames in error body');
    assert.ok(!/\n\s+at /.test(text) && !text.includes('stack'), 'no stack trace in error body');
  }
});

test('[TC-026] the same X-Request-Id is sent upstream and returned to the client', async () => {
  mockFetch();
  const res = await call('/orders/x', { headers: { 'x-request-id': 'spoofed-id' } });
  const up = new Headers(calls[0].init.headers).get('x-request-id');
  assert.ok(up, 'upstream must receive X-Request-Id');
  assert.notEqual(up, 'spoofed-id');
  assert.equal(res.headers.get('x-request-id'), up);
});

test('[TC-027] request body is streamed to upstream', async () => {
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(enc.encode('hello '));
      c.enqueue(enc.encode('world'));
      c.close();
    },
  });
  let seen = null;
  let isStream = false;
  mockFetch(async (url, init) => {
    isStream = init.body instanceof ReadableStream;
    seen = await new Response(init.body).text();
    return new Response('done', { status: 201 });
  });
  const headers = new Headers({ authorization: 'Bearer test-key-1', 'content-type': 'text/plain' });
  const res = await worker.fetch(
    new Request('https://proxy.example.com/orders/upload', { method: 'POST', body: stream, headers, duplex: 'half' }),
    BASE,
  );
  assert.equal(res.status, 201);
  assert.equal(isStream, true, 'request body must be passed as a ReadableStream, not buffered');
  assert.equal(seen, 'hello world');
});

test('[TC-028] response body is streamed to the client', async () => {
  const enc = new TextEncoder();
  let ctrl;
  const stream = new ReadableStream({
    start(c) {
      ctrl = c;
      c.enqueue(enc.encode('first|'));
    },
  });
  mockFetch(async () => new Response(stream, { status: 200 }));
  const res = await race(call('/orders/stream'), 1000);
  assert.notEqual(res, 'timeout', 'worker buffered the upstream body instead of streaming');
  const reader = res.body.getReader();
  const first = await race(reader.read(), 1000);
  assert.notEqual(first, 'timeout', 'first chunk must arrive before upstream finishes');
  assert.equal(new TextDecoder().decode(first.value), 'first|');
  ctrl.enqueue(enc.encode('second'));
  ctrl.close();
  let rest = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    rest += new TextDecoder().decode(value);
  }
  assert.equal(rest, 'second');
});

test('[TC-029] Access service-token headers are sent only when fully configured', async () => {
  mockFetch();
  await call('/orders/x', {}, { ...BASE, UPSTREAM_ACCESS_CLIENT_ID: 'id-placeholder', UPSTREAM_ACCESS_CLIENT_SECRET: 'secret-placeholder' });
  let h = new Headers(calls[0].init.headers);
  assert.equal(h.get('cf-access-client-id'), 'id-placeholder');
  assert.equal(h.get('cf-access-client-secret'), 'secret-placeholder');

  mockFetch();
  await call('/orders/x');
  h = new Headers(calls[0].init.headers);
  assert.equal(h.get('cf-access-client-id'), null);
  assert.equal(h.get('cf-access-client-secret'), null);

  mockFetch();
  await call('/orders/x', {}, { ...BASE, UPSTREAM_ACCESS_CLIENT_ID: 'id-placeholder' });
  h = new Headers(calls[0].init.headers);
  assert.equal(h.get('cf-access-client-secret'), null, 'secret must not be sent when the pair is incomplete');
});

test('[TC-030] allowed methods and bodies are forwarded and every configured key works', async () => {
  let body = null;
  mockFetch(async (url, init) => {
    if (init.body) body = await new Response(init.body).text();
    return new Response('created', { status: 201 });
  });
  const post = await call('/orders/items', { method: 'POST', body: 'payload', headers: { 'content-type': 'text/plain' } });
  assert.equal(post.status, 201);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(body, 'payload');

  mockFetch(async () => new Response(null, { status: 204 }));
  const del = await call('/orders/items/1', { method: 'DELETE' }, BASE, 'test-key-2');
  assert.equal(del.status, 204);
  assert.equal(calls[0].init.method, 'DELETE');
  assert.equal(calls[0].url, ORDERS + '/items/1');
});

test('[TC-031] wrangler.toml and package.json are valid and contain no secrets', () => {
  const toml = readFileSync(new URL('wrangler.toml', ROOT), 'utf8');
  const m = toml.match(/^compatibility_date\s*=\s*\x22(\d{4}-\d{2}-\d{2})\x22/m);
  assert.ok(m, 'compatibility_date must be a quoted YYYY-MM-DD date');
  assert.ok(!Number.isNaN(Date.parse(m[1])), 'compatibility_date must be a real date');
  assert.ok(toml.includes('main = \x22src/index.ts\x22'), 'main must be src/index.ts');
  assert.ok(!/^\s*PROXY_API_KEYS\s*=/m.test(toml), 'PROXY_API_KEYS must not be set in wrangler.toml');
  assert.ok(!/^\s*UPSTREAM_ACCESS_CLIENT_(ID|SECRET)\s*=/m.test(toml), 'Access secrets must not be set in wrangler.toml');
  const pkg = JSON.parse(readFileSync(new URL('package.json', ROOT), 'utf8'));
  assert.ok(pkg.scripts && pkg.scripts.test, 'package.json must define a test script');
  assert.ok(pkg.scripts.typecheck || pkg.scripts.tsc, 'package.json must define a typecheck script');
});
