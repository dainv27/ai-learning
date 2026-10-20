import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, handler as defaultHandler } from '../src/handler.js';

const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FIXED = new Date('2024-05-01T12:34:56.789Z');
const fixedHandler = createHandler(() => FIXED);

function makeEvent({ method = 'GET', path = '/time', query } = {}) {
  return {
    version: '2.0',
    routeKey: 'ANY /time',
    rawPath: path,
    rawQueryString: query ?? '',
    queryStringParameters: query ? Object.fromEntries(new URLSearchParams(query)) : undefined,
    headers: { host: 'example.execute-api.localhost', accept: '*/*' },
    requestContext: {
      accountId: 'anonymous',
      apiId: 'example',
      domainName: 'example.execute-api.localhost',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'node:test',
      },
      requestId: 'test-request',
      routeKey: 'ANY /time',
      stage: '$default',
      time: '01/May/2024:12:34:56 +0000',
      timeEpoch: FIXED.getTime(),
    },
    isBase64Encoded: false,
  };
}

test('GET /time returns 200 with JSON body {now} as ISO 8601 UTC', async () => {
  const res = await fixedHandler(makeEvent());
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body, 'string');
  assert.deepEqual(JSON.parse(res.body), { now: '2024-05-01T12:34:56.789Z' });
  assert.match(JSON.parse(res.body).now, ISO_UTC_MS);
});

test('200 response sets Content-Type and Cache-Control: no-store', async () => {
  const res = await fixedHandler(makeEvent());
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('default handler export answers GET /time with a current UTC time', async () => {
  const before = Date.now();
  const res = await defaultHandler(makeEvent());
  const after = Date.now();
  assert.equal(res.statusCode, 200);
  const { now } = JSON.parse(res.body);
  assert.match(now, ISO_UTC_MS);
  const t = Date.parse(now);
  assert.ok(t >= before && t <= after);
});

test('tz query parameter is ignored: valid tz still returns UTC 200', async () => {
  const res = await fixedHandler(makeEvent({ query: 'tz=Asia/Ho_Chi_Minh' }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { now: '2024-05-01T12:34:56.789Z' });
});

test('tz query parameter is ignored: invalid tz does not cause 400', async () => {
  const res = await fixedHandler(makeEvent({ query: 'tz=Not/AZone' }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { now: '2024-05-01T12:34:56.789Z' });
});

for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']) {
  test(`${method} /time returns 405 with Allow: GET and error body`, async () => {
    const res = await fixedHandler(makeEvent({ method }));
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.Allow, 'GET');
    assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
    assert.equal(res.headers['Cache-Control'], 'no-store');
    const body = JSON.parse(res.body);
    assert.equal(body.error.code, 'METHOD_NOT_ALLOWED');
    assert.equal(typeof body.error.message, 'string');
  });
}

test('wrong path returns 404 with JSON error body and no-store header', async () => {
  const res = await fixedHandler(makeEvent({ path: '/nope' }));
  assert.equal(res.statusCode, 404);
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.parse(res.body).error.code, 'NOT_FOUND');
});

test('wrong path with non-GET method still returns 404, not 405', async () => {
  const res = await fixedHandler(makeEvent({ method: 'POST', path: '/other' }));
  assert.equal(res.statusCode, 404);
});

test('unexpected exception returns generic 500 without internals', async () => {
  const boom = createHandler(() => {
    throw new Error('secret internal detail');
  });
  const res = await boom(makeEvent());
  assert.equal(res.statusCode, 500);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
  const body = JSON.parse(res.body);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.ok(!res.body.includes('secret internal detail'));
});
