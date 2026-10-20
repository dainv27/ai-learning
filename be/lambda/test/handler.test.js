import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, handler } from '../src/handler.js';

function makeEvent(method, rawPath = '/uptime') {
  return {
    version: '2.0',
    routeKey: `ANY ${rawPath}`,
    rawPath,
    rawQueryString: '',
    headers: { host: 'abc123.execute-api.example.amazonaws.com' },
    requestContext: {
      http: { method, path: rawPath, protocol: 'HTTP/1.1', sourceIp: '203.0.113.1' },
    },
    isBase64Encoded: false,
  };
}

function assertCommonHeaders(res) {
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(typeof res.body, 'string');
}

test('GET /uptime returns 200 with numeric uptimeSeconds', async () => {
  const h = createHandler({ now: () => 17_500, start: 5000 });
  const res = await h(makeEvent('GET'));
  assert.equal(res.statusCode, 200);
  assertCommonHeaders(res);
  const body = JSON.parse(res.body);
  assert.deepEqual(body, { uptimeSeconds: 12 });
  assert.equal(typeof body.uptimeSeconds, 'number');
});

test('default exported handler returns a non-negative number', async () => {
  const res = await handler(makeEvent('GET'));
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(typeof body.uptimeSeconds, 'number');
  assert.ok(body.uptimeSeconds >= 0);
});

for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']) {
  test(`${method} /uptime returns 405 with Allow: GET`, async () => {
    const h = createHandler({ now: () => 1000, start: 0 });
    const res = await h(makeEvent(method));
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.Allow, 'GET');
    assertCommonHeaders(res);
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'METHOD_NOT_ALLOWED');
    assert.equal(typeof body.error.message, 'string');
  });
}

test('unknown path returns 404 with error shape', async () => {
  const h = createHandler({ now: () => 1000, start: 0 });
  const res = await h(makeEvent('GET', '/nope'));
  assert.equal(res.statusCode, 404);
  assertCommonHeaders(res);
  assert.equal(JSON.parse(res.body).error.code, 'NOT_FOUND');
});

test('two warm invocations on the same handler return non-decreasing uptime', async () => {
  let t = 1000;
  const h = createHandler({ now: () => t, start: 1000 });
  const first = JSON.parse((await h(makeEvent('GET'))).body).uptimeSeconds;
  t += 3000;
  const second = JSON.parse((await h(makeEvent('GET'))).body).uptimeSeconds;
  assert.equal(first, 0);
  assert.equal(second, 3);
  assert.ok(second >= first);
});

test('unexpected exception returns generic 500 without leaking internals', async () => {
  const h = createHandler({
    now: () => {
      throw new Error('secret internal detail');
    },
    start: 0,
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const res = await h(makeEvent('GET'));
    assert.equal(res.statusCode, 500);
    assertCommonHeaders(res);
    assert.equal(JSON.parse(res.body).error.code, 'INTERNAL_ERROR');
    assert.ok(!res.body.includes('secret'));
  } finally {
    console.error = originalError;
  }
});

test('v1-style event without v2 fields is not served as GET /uptime', async () => {
  const h = createHandler({ now: () => 1000, start: 0 });
  const res = await h({ httpMethod: 'GET', path: '/uptime' });
  assert.equal(res.statusCode, 404);
  assertCommonHeaders(res);
});
