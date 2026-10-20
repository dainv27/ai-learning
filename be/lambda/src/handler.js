import { getUptimeSeconds } from './uptime.js';

const UPTIME_PATH = '/uptime';

const BASE_HEADERS = Object.freeze({
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
});

function response(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

function errorResponse(statusCode, code, message, extraHeaders = {}) {
  return response(statusCode, { error: { code, message } }, extraHeaders);
}

/**
 * Builds a handler. The clock is injectable for tests; production uses the
 * default monotonic clock and the module-scope container start time.
 * @param {{ now?: () => number, start?: number }} [options]
 */
export function createHandler(options = {}) {
  const { now, start } = options;

  return async function handler(event) {
    try {
      const method = event?.requestContext?.http?.method;
      const path = event?.rawPath;

      if (path !== UPTIME_PATH) {
        return errorResponse(404, 'NOT_FOUND', 'Route not found');
      }

      if (method !== 'GET') {
        return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', {
          Allow: 'GET',
        });
      }

      const uptimeSeconds = getUptimeSeconds(now, start);
      return response(200, { uptimeSeconds });
    } catch (err) {
      console.error('Unhandled error', err?.name);
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
  };
}

export const handler = createHandler();
