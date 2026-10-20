const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

export function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': JSON_CONTENT_TYPE, ...headers },
    body: JSON.stringify(body),
  };
}

// Static data, so successful responses may be cached publicly for one day.
export function ok(data) {
  return jsonResponse(
    200,
    { data, total: data.length },
    { 'Cache-Control': 'public, max-age=86400' },
  );
}

export function errorResponse(statusCode, code, message, extraHeaders = {}) {
  return jsonResponse(
    statusCode,
    { error: { code, message } },
    { 'Cache-Control': 'no-store', ...extraHeaders },
  );
}
