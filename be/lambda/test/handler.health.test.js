import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/handler.js';

function v2Event(method, rawPath) {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath,
    rawQueryString: '',
    headers: { accept: 'application/json' },
    requestContext: { http: { method, path: rawPath } },
    isBase64Encoded: false,
  };
}

test('GET /health through handler returns 200 with exact body {"status":"ok"}', async () => {
  const res = await handler(v2Event('GET', '/health'));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, '{"status":"ok"}');
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
});

test('POST /health through handler returns 405 with Allow: GET', async () => {
  const res = await handler(v2Event('POST', '/health'));
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, 'GET');
});

test('unknown path returns 404 through handler', async () => {
  const res = await handler(v2Event('GET', '/does-not-exist'));
  assert.equal(res.statusCode, 404);
});

test('GET /provinces through handler is unaffected by the health route', async () => {
  const res = await handler(v2Event('GET', '/provinces'));
  assert.notEqual(res.body, '{"status":"ok"}');
});
