import { performance } from 'node:perf_hooks';

/**
 * Monotonic clock in milliseconds. Cannot go backwards, unlike Date.now().
 * @returns {number}
 */
export function nowMs() {
  return performance.now();
}

/**
 * Captured ONCE when the module is initialized (container cold start).
 * It must never be reassigned or recomputed inside the handler, so uptime
 * keeps growing across warm invocations.
 */
export const containerStartMs = nowMs();

/**
 * Pure: whole seconds elapsed between startMs and nowMs, never negative.
 * @param {number} startMs
 * @param {number} nowMsValue
 * @returns {number}
 */
export function computeUptimeSeconds(startMs, nowMsValue) {
  const elapsedMs = nowMsValue - startMs;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 0;
  }
  return Math.floor(elapsedMs / 1000);
}

/**
 * Uptime of this container in seconds.
 * @param {() => number} [now] injectable monotonic clock
 * @param {number} [start] injectable start time
 * @returns {number}
 */
export function getUptimeSeconds(now = nowMs, start = containerStartMs) {
  return computeUptimeSeconds(start, now());
}
