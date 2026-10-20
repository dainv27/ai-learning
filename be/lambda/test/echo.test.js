import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEcho } from '../src/echo.js';

test('returns echo payload for a non-empty q', () => {
  assert.deepEqual(buildEcho({ q: 'hello' }), { ok: true, body: { echo: 'hello' } });
});

test('keeps special characters untouched', () => {
  const q = 'a "b" \\ c ñ';
  assert.deepEqual(buildEcho({ q }), { ok: true, body: { echo: q } });
});

test('missing q is rejected', () => {
  const r = buildEcho({});
  assert.equal(r.ok, false);
  assert.equal(r.code, 'MISSING_Q');
});

test('empty q is rejected', () => {
  assert.equal(buildEcho({ q: '' }).ok, false);
});

test('undefined or null params are rejected without throwing', () => {
  assert.equal(buildEcho(undefined).code, 'MISSING_Q');
  assert.equal(buildEcho(null).code, 'MISSING_Q');
});

test('non-string q is rejected', () => {
  assert.equal(buildEcho({ q: 42 }).ok, false);
});
