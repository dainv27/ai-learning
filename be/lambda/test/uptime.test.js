import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeUptimeSeconds,
  getUptimeSeconds,
  containerStartMs,
} from '../src/uptime.js';

test('computeUptimeSeconds returns 0 when no time has elapsed', () => {
  assert.equal(computeUptimeSeconds(1000, 1000), 0);
});

test('computeUptimeSeconds returns whole seconds', () => {
  assert.equal(computeUptimeSeconds(0, 5000), 5);
});

test('computeUptimeSeconds floors partial seconds', () => {
  assert.equal(computeUptimeSeconds(0, 5999), 5);
});

test('computeUptimeSeconds never returns a negative number', () => {
  assert.equal(computeUptimeSeconds(5000, 1000), 0);
});

test('computeUptimeSeconds returns 0 for non-finite input', () => {
  assert.equal(computeUptimeSeconds(0, NaN), 0);
  assert.equal(computeUptimeSeconds(undefined, 1000), 0);
});

test('containerStartMs is captured once at module scope as a number', () => {
  assert.equal(typeof containerStartMs, 'number');
  assert.ok(Number.isFinite(containerStartMs));
});

test('warm invocations in the same module instance return non-decreasing uptime', () => {
  let fakeNow = 10_000;
  const now = () => fakeNow;
  const start = 10_000;

  const first = getUptimeSeconds(now, start);
  fakeNow += 2500;
  const second = getUptimeSeconds(now, start);
  fakeNow += 40_000;
  const third = getUptimeSeconds(now, start);

  assert.equal(first, 0);
  assert.equal(second, 2);
  assert.equal(third, 42);
  assert.ok(second >= first);
  assert.ok(third >= second);
});
