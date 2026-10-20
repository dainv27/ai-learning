/**
 * Pure echo logic, independent of AWS.
 *
 * @param {Record<string, string> | undefined | null} params query string parameters
 * @returns {{ ok: true, body: { echo: string } } | { ok: false, code: string, message: string }}
 */
export function buildEcho(params) {
  const q = params ? params.q : undefined;
  if (typeof q !== 'string' || q.length === 0) {
    return {
      ok: false,
      code: 'MISSING_Q',
      message: 'Query parameter "q" is required and must not be empty.',
    };
  }
  return { ok: true, body: { echo: q } };
}
