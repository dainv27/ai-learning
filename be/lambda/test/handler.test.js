import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/handler.js';

function makeEvent({ method = 'GET', rawPath = '/provinces', query } = {}) {
  const rawQueryString = query ? new URLSearchParams(query).toString() : '';
  return {
    version: '2.0',
    routeKey: 'GET /provinces',
    rawPath,
    rawQueryString,
    queryStringParameters: query,
    headers: { accept: 'application/json', 'user-agent': 'node-test' },
    requestContext: {
      http: { method, path: rawPath, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'node-test' },
      requestId: 'test-request',
      routeKey: 'GET /provinces',
      stage: '$default',
    },
    isBase64Encoded: false,
  };
}

test('200 returns all 63 provinces when q is absent', async () => {
  const res = await handler(makeEvent());
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'public, max-age=86400');
  const body = JSON.parse(res.body);
  assert.equal(body.total, 63);
  assert.equal(body.data.length, 63);
  assert.equal(body.data[0].code, '01');
});

test('200 returns all 63 provinces when q is empty', async () => {
  const res = await handler(makeEvent({ query: { q: '' } }));
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).total, 63);
});

test('200 matches "da nang" to Đà Nẵng', async () => {
  const res = await handler(makeEvent({ query: { q: 'da nang' } }));
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.total, 1);
  assert.equal(body.data[0].name, 'Đà Nẵng');
});

test('200 matches "dong nai" to Đồng Nai', async () => {
  const res = await handler(makeEvent({ query: { q: 'dong nai' } }));
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.total, 1);
  assert.equal(body.data[0].name, 'Đồng Nai');
});

test('200 search is case-insensitive', async () => {
  const res = await handler(makeEvent({ query: { q: 'HA NOI' } }));
  assert.equal(res.statusCode, 200);
  const names = JSON.parse(res.body).data.map((p) => p.name);
  assert.ok(names.includes('Hà Nội'));
});

test('200 returns an empty list when nothing matches', async () => {
  const res = await handler(makeEvent({ query: { q: 'zzz' } }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { data: [], total: 0 });
});

test('200 accepts q of exactly 100 characters', async () => {
  const res = await handler(makeEvent({ query: { q: 'a'.repeat(100) } }));
  assert.equal(res.statusCode, 200);
});

test('400 when q is longer than 100 characters', async () => {
  const res = await handler(makeEvent({ query: { q: 'a'.repeat(101) } }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.parse(res.body).error.code, 'INVALID_QUERY');
});

test('400 when q is repeated (comma-joined by payload v2)', async () => {
  const res = await handler(makeEvent({ query: { q: 'ha,noi' } }));
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error.code, 'INVALID_QUERY');
});

test('404 for an unknown path', async () => {
  const res = await handler(makeEvent({ rawPath: '/districts' }));
  assert.equal(res.statusCode, 404);
  assert.equal(JSON.parse(res.body).error.code, 'NOT_FOUND');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('405 for a non-GET method, with Allow header', async () => {
  const res = await handler(makeEvent({ method: 'POST' }));
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET');
  assert.equal(JSON.parse(res.body).error.code, 'METHOD_NOT_ALLOWED');
});

test('500 returns a generic error without internals', async (t) => {
  const errorLog = mock.method(console, 'error', () => {});
  const broken = {
    get rawPath() {
      throw new Error('boom: internal detail');
    },
    requestContext: { http: { method: 'GET' } },
  };
  const res = await handler(broken);
  assert.equal(res.statusCode, 500);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  const body = JSON.parse(res.body);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.ok(!res.body.includes('boom'));
  assert.equal(errorLog.mock.callCount(), 1);
});
