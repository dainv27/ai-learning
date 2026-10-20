/**
 * Pure time helper. The clock is injectable so tests can be deterministic.
 * The result is always UTC in ISO 8601 form (Date.prototype.toISOString ends with 'Z').
 *
 * @param {() => Date} clock
 * @returns {{ now: string }}
 */
export function getNow(clock = () => new Date()) {
  const date = clock();
  return { now: date.toISOString() };
}
