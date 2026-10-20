import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNow } from '../src/time.js';

const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

test('getNow returns the fixed clock value as ISO 8601 UTC with milliseconds', () => {
  const fixed = new Date('2024-05-01T12:34:56.789Z');
  assert.deepEqual(getNow(() => fixed), { now: '2024-05-01T12:34:56.789Z' });
});

test('getNow output always ends with Z and has millisecond precision', () => {
  const result = getNow(() => new Date('2030-12-31T23:59:59.000Z'));
  assert.match(result.now, ISO_UTC_MS);
});

test('getNow uses the real clock by default and returns a current ISO string', () => {
  const before = Date.now();
  const result = getNow();
  const after = Date.now();
  assert.match(result.now, ISO_UTC_MS);
  const t = Date.parse(result.now);
  assert.ok(t >= before && t <= after, 'timestamp should be within the test window');
});

test('getNow reads the clock on every call (no caching)', () => {
  let calls = 0;
  const clock = () => {
    calls += 1;
    return new Date(Date.UTC(2024, 0, 1, 0, 0, calls));
  };
  const first = getNow(clock);
  const second = getNow(clock);
  assert.equal(calls, 2);
  assert.notEqual(first.now, second.now);
});
