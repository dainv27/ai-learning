import { buildEcho } from './echo.js';

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(statusCode, payload, extraHeaders = {}) {
  return {
    statusCode,
    headers: { ...BASE_HEADERS, ...extraHeaders },
    body: JSON.stringify(payload),
  };
}

function errorResponse(statusCode, code, message, extraHeaders = {}) {
  return json(statusCode, { error: { code, message } }, extraHeaders);
}

export async function handler(event) {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath;

    if (path !== '/echo') {
      return errorResponse(404, 'NOT_FOUND', 'Route not found.');
    }

    if (method !== 'GET') {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', {
        allow: 'GET',
      });
    }

    const result = buildEcho(event.queryStringParameters);
    if (!result.ok) {
      return errorResponse(400, result.code, result.message);
    }
    return json(200, result.body);
  } catch {
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error.');
  }
}
