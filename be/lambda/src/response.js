const CONTENT_TYPE = 'application/json; charset=utf-8';

export function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': CONTENT_TYPE, ...extraHeaders },
    body: JSON.stringify(body),
  };
}

export function errorResponse(statusCode, code, message, extraHeaders = {}) {
  return json(
    statusCode,
    { error: { code, message } },
    { 'Cache-Control': 'no-store', ...extraHeaders },
  );
}
