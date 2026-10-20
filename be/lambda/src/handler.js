import { getNow } from './time.js';

const BASE_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
});

const TIME_PATH = '/time';
const ALLOWED_METHOD = 'GET';

function respond(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

function errorResponse(statusCode, code, message, extraHeaders = {}) {
  return respond(statusCode, { error: { code, message } }, extraHeaders);
}

/**
 * Builds the Lambda handler with an injectable clock.
 * The tz query parameter is deliberately never read: the response is always UTC.
 *
 * @param {() => Date} [clock]
 * @returns {(event: object) => Promise<object>}
 */
export function createHandler(clock) {
  return async function handler(event) {
    try {
      const method = event?.requestContext?.http?.method;
      const path = event?.rawPath;

      if (path !== TIME_PATH) {
        return errorResponse(404, 'NOT_FOUND', 'Resource not found.');
      }

      if (method !== ALLOWED_METHOD) {
        return errorResponse(
          405,
          'METHOD_NOT_ALLOWED',
          'Method not allowed. Use GET.',
          { Allow: ALLOWED_METHOD },
        );
      }

      return respond(200, getNow(clock));
    } catch (err) {
      console.error('Unhandled error', err);
      return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
    }
  };
}

export const handler = createHandler();
