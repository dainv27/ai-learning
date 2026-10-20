import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The delivered code is TypeScript with extensionless imports: transpile it to a temp dir first.
const SRC = (f) => fileURLToPath(new URL('../../be/cloudflare/' + f, import.meta.url));
const NAMES = ['config', 'auth', 'router', 'headers', 'index'];
const QUOTES = [String.fromCharCode(39), String.fromCharCode(34)];
const BS = String.fromCharCode(92);
let M = null;
let loadError = null;
try {
  if (typeof nodeModule.stripTypeScriptTypes !== 'function') throw new Error('node:module.stripTypeScriptTypes is not available (needs Node >= 22.13)');
  const dir = mkdtempSync(join(tmpdir(), 'qa-proxy-'));
  for (const n of NAMES) {
    let code = nodeModule.stripTypeScriptTypes(readFileSync(SRC('src/' + n + '.ts'), 'utf8'));
    for (const m of NAMES) for (const q of QUOTES) code = code.replaceAll('from ' + q + './' + m + q, 'from ' + q + './' + m + '.mjs' + q);
    writeFileSync(join(dir, n + '.mjs'), code);
  }
  const load = (n) => import(pathToFileURL(join(dir, n + '.mjs')).href);
  M = { worker: (await load('index')).default, auth: await load('auth'), router: await load('router'), headers: await load('headers') };
} catch (e) {
  loadError = e;
}
const mods = () => {
  if (!M) throw new Error('Delivered code could not be loaded: ' + (loadError && loadError.message));
  return M;
};

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'test-aud';
const ENV = {
  ACCESS_TEAM_DOMAIN: TEAM,
  ACCESS_AUD: AUD,
  SERVICE_A_ORIGIN: 'https://service-a.internal.example',
  SERVICE_B_ORIGIN: 'https://service-b.internal.example',
  UPSTREAM_TIMEOUT_MS: '200',
};
const JWKS_URL = 'https://' + TEAM + '/cdn-cgi/access/certs';

const pair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
const b64u = (x) => Buffer.from(x).toString('base64url');
const nowSec = () => Math.floor(Date.now() / 1000);

async function sign(claims = {}, header = {}) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', ...header }));
  const p = b64u(JSON.stringify({ iss: 'https://' + TEAM, aud: [AUD], exp: nowSec() + 300, nbf: nowSec() - 10, ...claims }));
  const s = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, Buffer.from(h + '.' + p));
  return h + '.' + p + '.' + b64u(s);
}

const realFetch = globalThis.fetch;
let jwksFetches = 0;
function setup(upstream = () => new Response('ok')) {
  if (M) M.auth.clearJwksCache();
  jwksFetches = 0;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === JWKS_URL) {
      jwksFetches++;
      return Response.json({ keys: [{ ...publicJwk, kid: 'k1', alg: 'RS256', use: 'sig' }] });
    }
    calls.push({ url, init });
    return upstream(url, init);
  };
  return calls;
}
afterEach(() => {
  globalThis.fetch = realFetch;
  if (M) M.auth.clearJwksCache();
});

async function call(path, opts = {}, env = ENV) {
  const { token = await sign(), headers, ...rest } = opts;
  const h = new Headers(headers);
  if (token) h.set('cf-access-jwt-assertion', token);
  return mods().worker.fetch(new Request('https://proxy.example.com' + path, { ...rest, headers: h }), env);
}

const ok = () => new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } });

test('[TC-001] valid token is proxied to the origin taken from the binding', async () => {
  const calls = setup(ok);
  const res = await call('/service-a/api/users?x=1');
  assert.equal(res.status, 200);
  assert.equal(await res.text(), 'hello');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://service-a.internal.example/api/users?x=1');
  const res2 = await call('/service-b/health');
  assert.equal(res2.status, 200);
  assert.equal(calls[1].url, 'https://service-b.internal.example/health');
});

test('[TC-002] missing or malformed token gives 401 and no upstream call', async () => {
  const calls = setup(ok);
  for (const token of [null, '', 'abc', 'a.b', 'a.b.c']) {
    const res = await call('/service-a/api/x', { token });
    assert.equal(res.status, 401, 'token ' + JSON.stringify(token));
  }
  assert.equal(calls.length, 0);
});

test('[TC-003] expired, wrong aud, wrong iss and future nbf give 401', async () => {
  const calls = setup(ok);
  const bad = [
    { exp: 1 },
    { aud: ['other'] },
    { aud: 'other' },
    { iss: 'https://evil.example.com' },
    { nbf: nowSec() + 3600 },
    { exp: undefined },
  ];
  for (const claims of bad) {
    const res = await call('/service-a/api/x', { token: await sign(claims) });
    assert.equal(res.status, 401, JSON.stringify(claims));
  }
  assert.equal(calls.length, 0);
});

test('[TC-004] bad alg, unknown kid, tampered signature or payload give 401', async () => {
  const calls = setup(ok);
  const tokens = [];
  tokens.push(await sign({}, { alg: 'none' }));
  tokens.push(await sign({}, { alg: 'HS256' }));
  tokens.push(await sign({}, { kid: 'unknown' }));
  const good = await sign();
  const [h, p, s] = good.split('.');
  tokens.push(h + '.' + p + '.');
  tokens.push(good.slice(0, -6) + 'AAAAAA');
  const forged = b64u(JSON.stringify({ iss: 'https://' + TEAM, aud: [AUD], exp: 9999999999 }));
  tokens.push(h + '.' + forged + '.' + s);
  const noneHeader = b64u(JSON.stringify({ alg: 'none', kid: 'k1' }));
  tokens.push(noneHeader + '.' + p + '.');
  for (const token of tokens) {
    const res = await call('/service-a/api/x', { token });
    assert.equal(res.status, 401, token.slice(0, 40));
  }
  assert.equal(calls.length, 0);
});

test('[TC-005] JWKS fetch failure fails closed with 401', async () => {
  setup(ok);
  let nonJwks = 0;
  globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== JWKS_URL) nonJwks++;
    throw new TypeError('network down');
  };
  const res = await call('/service-a/api/x');
  assert.equal(res.status, 401);
  assert.equal(nonJwks, 0, 'nothing may be forwarded when the keys cannot be fetched');
});

test('[TC-006] aud as string or array is accepted and the JWKS is cached', async () => {
  const calls = setup(ok);
  assert.equal((await call('/service-a/api/x', { token: await sign({ aud: AUD }) })).status, 200);
  assert.equal((await call('/service-a/api/x', { token: await sign({ aud: ['x', AUD] }) })).status, 200);
  assert.equal(calls.length, 2);
  assert.equal(jwksFetches, 1, 'JWKS should be cached between requests');
});

test('[TC-007] missing or invalid Access config returns 503 and never forwards', async () => {
  const patches = [
    { ACCESS_AUD: undefined },
    { ACCESS_TEAM_DOMAIN: undefined },
    { ACCESS_TEAM_DOMAIN: '' },
    { ACCESS_TEAM_DOMAIN: 'evil.example.com' },
    { SERVICE_A_ORIGIN: undefined },
    { SERVICE_B_ORIGIN: undefined },
  ];
  for (const patch of patches) {
    const calls = setup(ok);
    const res = await call('/service-a/api/x', {}, { ...ENV, ...patch });
    assert.equal(res.status, 503, JSON.stringify(patch));
    assert.equal(calls.length, 0);
    const noTok = await call('/service-a/api/x', { token: null }, { ...ENV, ...patch });
    assert.equal(noTok.status, 503, 'no fallback without a token: ' + JSON.stringify(patch));
  }
});

test('[TC-008] unsafe origin bindings return 503', async () => {
  const patches = [
    { SERVICE_A_ORIGIN: 'http://service-a.internal.example' },
    { SERVICE_A_ORIGIN: 'https://127.0.0.1' },
    { SERVICE_B_ORIGIN: 'https://10.0.0.5' },
    { SERVICE_B_ORIGIN: 'https://192.168.1.1' },
    { SERVICE_A_ORIGIN: 'https://localhost' },
    { SERVICE_A_ORIGIN: 'https://user:pw@service-a.internal.example' },
    { SERVICE_A_ORIGIN: 'not a url' },
    { SERVICE_A_ORIGIN: '' },
  ];
  for (const patch of patches) {
    const calls = setup(ok);
    const res = await call('/service-a/api/x', {}, { ...ENV, ...patch });
    assert.equal(res.status, 503, JSON.stringify(patch));
    assert.equal(calls.length, 0);
  }
});

test('[TC-009] unknown service, root and non-allowed prefix return 404', async () => {
  const calls = setup(ok);
  for (const p of ['/unknown/api/x', '/', '/constructor/api', '/__proto__/api', '/service-a/other', '/service-a/apix']) {
    const res = await call(p);
    assert.equal(res.status, 404, p);
  }
  assert.equal(calls.length, 0);
});

test('[TC-010] disallowed method returns 405 with Allow header', async () => {
  const calls = setup(ok);
  const a = await call('/service-a/api/x', { method: 'DELETE' });
  assert.equal(a.status, 405);
  assert.ok((a.headers.get('allow') || '').includes('GET'), 'Allow header must list permitted methods');
  const b = await call('/service-b/public/x', { method: 'POST', body: 'x' });
  assert.equal(b.status, 405);
  assert.equal(calls.length, 0);
});

test('[TC-011] route() rejects traversal, encoded and control characters with 400', () => {
  const { route } = mods().router;
  const paths = [
    '/service-a/api/../x',
    '/service-a/api/./x',
    '/service-a/api/%2e%2e/x',
    '/service-a/api/%2E/x',
    '/service-a/api%2Fx',
    '/service-a/api/%2fx',
    '/service-a/api/a%5Cb',
    '/service-a/api/a%5cb',
    '/service-a/api/a%00b',
    '/service-a/api/%252e%252e/x',
    '/service-a/api/%252f',
    '/service-a/api//x',
    '/service-a//api',
    '/service-a/api/a' + BS + 'b',
    '/service-a/api/a%0ab',
    '/service-a/api/a' + String.fromCharCode(1) + 'b',
    '/service-a/api/%zz',
  ];
  for (const p of paths) {
    const r = route('GET', p);
    assert.equal(r.ok, false, p);
    assert.equal(r.status, 400, p);
  }
});

test('[TC-012] encoded-slash, backslash, NUL, double-encoding and // return 400 end to end', async () => {
  const calls = setup(ok);
  const paths = [
    '/service-a/api%2Fx',
    '/service-a/api/%2fx',
    '/service-a/api/a%5cb',
    '/service-a/api/%00',
    '/service-a/api/%252e%252e/x',
    '/service-a/api//x',
  ];
  for (const p of paths) {
    const res = await call(p);
    assert.equal(res.status, 400, p);
  }
  assert.equal(calls.length, 0);
});

test('[TC-013] prefix matching respects segment boundaries', () => {
  const { route } = mods().router;
  const a = route('GET', '/service-a/api');
  assert.equal(a.ok, true);
  assert.equal(a.key, 'service-a');
  assert.equal(a.path, '/api');
  const b = route('GET', '/service-a/api/users/42');
  assert.equal(b.ok, true);
  assert.equal(b.path, '/api/users/42');
  for (const p of ['/service-a/apix', '/service-a/api2/x', '/service-a/other']) {
    const r = route('GET', p);
    assert.equal(r.ok, false, p);
    assert.equal(r.status, 404, p);
  }
  assert.equal(route('GET', '/service-b/health').ok, true);
});

test('[TC-025] literal dot segments never reach an upstream outside the allowlist', async () => {
  const calls = setup(ok);
  for (const p of ['/service-a/api/../x', '/service-a/api/%2E%2e/x', '/service-a/api/../../service-b/health']) {
    const res = await call(p);
    assert.ok([400, 404].includes(res.status), p + ' got ' + res.status);
  }
  assert.equal(calls.length, 0);
});

test('[TC-014] authentication runs before routing', async () => {
  const calls = setup(ok);
  assert.equal((await call('/unknown/x', { token: null })).status, 401);
  assert.equal((await call('/service-a/api//x', { token: null })).status, 401);
  assert.equal((await call('/service-a/api/x', { token: null, method: 'DELETE' })).status, 401);
  assert.equal(calls.length, 0);
});

test('[TC-020] upstreamUrl builds origin + path + query and re-checks the host', () => {
  const { upstreamUrl } = mods().router;
  const origin = 'https://service-a.internal.example';
  assert.equal(upstreamUrl(origin, '/api/x', '?a=1').toString(), origin + '/api/x?a=1');
  assert.throws(() => upstreamUrl(origin, '@evil.example.com/x', ''));
});

test('[TC-021] origin never comes from client input', async () => {
  const calls = setup(ok);
  await call('/service-a/api/x?url=https://evil.example.com&host=evil.example.com', {
    headers: { host: 'evil.example.com', 'x-forwarded-host': 'evil.example.com' },
  });
  await call('/service-a/api/@evil.example.com/x');
  await call('/service-a/api/x?@evil.example.com');
  assert.ok(calls.length >= 1);
  for (const c of calls) {
    const u = new URL(c.url);
    assert.equal(u.protocol, 'https:');
    assert.equal(u.host, 'service-a.internal.example', c.url);
  }
});

test('[TC-015] sensitive request headers are stripped, allowed ones kept', async () => {
  const calls = setup(ok);
  const res = await call('/service-a/api/users', {
    headers: {
      cookie: 'sid=1',
      authorization: 'Bearer secret',
      'x-forwarded-for': '1.2.3.4',
      'x-forwarded-proto': 'http',
      'x-forwarded-host': 'evil.example.com',
      'x-real-ip': '1.2.3.4',
      'cf-access-client-id': 'abc',
      'cf-access-authenticated-user-email': 'a@b.c',
      'content-type': 'application/json',
      accept: 'application/json',
    },
  });
  assert.equal(res.status, 200);
  const init = calls[0].init;
  const h = new Headers(init.headers);
  for (const n of ['cookie', 'authorization', 'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip', 'cf-access-jwt-assertion', 'cf-access-client-id', 'cf-access-authenticated-user-email']) {
    assert.equal(h.has(n), false, n + ' must not be forwarded');
  }
  assert.equal(h.get('content-type'), 'application/json');
  assert.equal(h.get('accept'), 'application/json');
  assert.equal(h.get('x-forwarded-host'), 'proxy.example.com');
  assert.ok(h.get('x-request-id'), 'x-request-id must be added');
  assert.equal(init.redirect, 'manual');
});

test('[TC-016] Set-Cookie and hop-by-hop response headers are dropped', async () => {
  setup(() => new Response('x', { headers: { 'set-cookie': 'a=b', 'x-keep': '1' } }));
  const res = await call('/service-a/api/x');
  assert.equal(res.headers.get('set-cookie'), null);
  assert.equal(res.headers.get('x-keep'), '1');
  const { responseHeaders } = mods().headers;
  const h = responseHeaders(
    new Headers({ 'set-cookie': 'a=b', connection: 'close', 'transfer-encoding': 'chunked', upgrade: 'x', 'x-keep': '1' }),
    'https://service-a.internal.example',
    'service-a',
    'id',
  );
  for (const n of ['set-cookie', 'connection', 'transfer-encoding', 'upgrade']) assert.equal(h.has(n), false, n);
  assert.equal(h.get('x-keep'), '1');
});

test('[TC-017] redirects are not followed; internal Location rewritten, external removed', async () => {
  let loc = 'https://service-a.internal.example/api/new?a=1';
  const calls = setup(() => new Response(null, { status: 302, headers: { location: loc } }));
  let res = await call('/service-a/api/x');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/service-a/api/new?a=1');
  loc = 'https://evil.example.com/x';
  res = await call('/service-a/api/x');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), null);
  assert.equal(calls.length, 2, 'the redirect target must not be fetched');
});

test('[TC-018] upstream timeout returns 504', async () => {
  const calls = setup((_u, init) => {
    if (!init || !init.signal) return new Response('no signal passed', { status: 200 });
    return new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason)));
  });
  const res = await call('/service-a/api/slow');
  assert.equal(res.status, 504);
  assert.ok(calls[0].init.signal, 'upstream call must carry an abort signal');
  const body = await res.text();
  assert.ok(!body.includes('internal.example'));
});

test('[TC-019] upstream connect failure returns 502 without leaking details', async () => {
  setup(() => {
    throw new TypeError('connect ECONNREFUSED service-a.internal.example:443');
  });
  const res = await call('/service-a/api/x');
  assert.equal(res.status, 502);
  const text = await res.text();
  assert.ok(!text.includes('internal.example'), 'origin leaked');
  assert.ok(!text.includes('ECONNREFUSED'), 'error text leaked');
  assert.ok(!text.includes('stack'));
  assert.equal(typeof JSON.parse(text).error, 'string');
});

test('[TC-022] request body is streamed to upstream', async () => {
  const calls = setup(ok);
  const res = await call('/service-a/api/items', { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
  assert.equal(res.status, 200);
  const init = calls[0].init;
  assert.equal(init.method, 'POST');
  assert.ok(init.body instanceof ReadableStream, 'body should be a stream, not a buffered string');
  assert.equal(await new Response(init.body).text(), '{"a":1}');
});

test('[TC-023] error responses are generic JSON', async () => {
  setup(ok);
  const responses = [
    await call('/service-a/api/x', { token: null }),
    await call('/service-a/api/x', {}, { ...ENV, ACCESS_AUD: undefined }),
    await call('/unknown/x'),
    await call('/service-a/api/x', { method: 'DELETE' }),
    await call('/service-a/api//x'),
  ];
  const statuses = responses.map((r) => r.status);
  assert.deepEqual(statuses, [401, 503, 404, 405, 400]);
  for (const r of responses) {
    assert.ok((r.headers.get('content-type') || '').includes('application/json'));
    const text = await r.text();
    assert.equal(typeof JSON.parse(text).error, 'string');
    assert.ok(!text.includes('internal.example'));
    assert.ok(!text.includes('node_modules'));
  }
});

test('[TC-024] wrangler.toml contains placeholders only', () => {
  const toml = readFileSync(SRC('wrangler.toml'), 'utf8');
  const origins = toml.split('\n').filter((l) => /^SERVICE_[A-Z_]+_ORIGIN/.test(l));
  assert.ok(origins.length >= 2, 'origin vars should be declared');
  for (const l of origins) assert.ok(l.includes('.internal.example'), l);
  assert.ok(!/PROXY_API_KEY|SECRET\s*=|PASSWORD|PRIVATE KEY/i.test(toml), 'no secrets in wrangler.toml');
});
