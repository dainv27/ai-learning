import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/handler.js';

function makeEvent({ method = 'GET', path = '/echo', query } = {}) {
  const event = {
    version: '2.0',
    routeKey: 'ANY /echo',
    rawPath: path,
    rawQueryString: '',
    headers: { host: 'example.execute-api.local' },
    requestContext: {
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1' },
    },
    isBase64Encoded: false,
  };
  if (query !== undefined) event.queryStringParameters = query;
  return event;
}

function assertJsonHeaders(res) {
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(res.headers['cache-control'], 'no-store');
  assert.equal(typeof res.body, 'string');
}

test('GET /echo?q=hello returns 200 with echo body', async () => {
  const res = await handler(makeEvent({ query: { q: 'hello' } }));
  assert.equal(res.statusCode, 200);
  assertJsonHeaders(res);
  assert.deepEqual(JSON.parse(res.body), { echo: 'hello' });
});

test('special characters in q are safely encoded', async () => {
  const q = 'he said "hi" \\ {"x":1} ñ';
  const res = await handler(makeEvent({ query: { q } }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, JSON.stringify({ echo: q }));
  assert.deepEqual(JSON.parse(res.body), { echo: q });
});

test('missing q returns 400 MISSING_Q', async () => {
  const res = await handler(makeEvent({ query: { other: 'x' } }));
  assert.equal(res.statusCode, 400);
  assertJsonHeaders(res);
  assert.equal(JSON.parse(res.body).error.code, 'MISSING_Q');
});

test('empty q returns 400', async () => {
  const res = await handler(makeEvent({ query: { q: '' } }));
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error.code, 'MISSING_Q');
});

test('no query string at all returns 400', async () => {
  const res = await handler(makeEvent());
  assert.equal(res.statusCode, 400);
});

test('other path returns 404', async () => {
  const res = await handler(makeEvent({ path: '/other', query: { q: 'a' } }));
  assert.equal(res.statusCode, 404);
  assertJsonHeaders(res);
  assert.equal(JSON.parse(res.body).error.code, 'NOT_FOUND');
});

for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
  test(`${method} /echo returns 405 with Allow: GET`, async () => {
    const res = await handler(makeEvent({ method, query: { q: 'a' } }));
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow, 'GET');
    assertJsonHeaders(res);
    assert.equal(JSON.parse(res.body).error.code, 'METHOD_NOT_ALLOWED');
  });
}

test('malformed event returns generic 500', async () => {
  const res = await handler(null);
  assert.equal(res.statusCode, 500);
  assertJsonHeaders(res);
  const body = JSON.parse(res.body);
  assert.equal(body.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(res.body, /TypeError|stack|at /);
});

test('exception while reading params returns 500 without leaking message', async () => {
  const event = makeEvent();
  Object.defineProperty(event, 'queryStringParameters', {
    get() {
      throw new Error('secret internal detail');
    },
  });
  const res = await handler(event);
  assert.equal(res.statusCode, 500);
  assert.doesNotMatch(res.body, /secret internal detail/);
});
