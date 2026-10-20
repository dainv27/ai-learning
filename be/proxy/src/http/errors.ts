export type ErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'payload_too_large'
  | 'bad_gateway'
  | 'gateway_timeout'
  | 'internal_error';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  method_not_allowed: 405,
  payload_too_large: 413,
  bad_gateway: 502,
  gateway_timeout: 504,
  internal_error: 500,
};

// Messages passed here are static strings written by this code. Never pass upstream URLs, secrets or stack traces.
export class ProxyError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly headers: Record<string, string>;

  constructor(code: ErrorCode, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.name = 'ProxyError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.headers = headers;
  }
}

export function toProxyError(err: unknown): ProxyError {
  if (err instanceof ProxyError) {
    return err;
  }
  return new ProxyError('internal_error', 'Internal error');
}

export function errorResponse(err: ProxyError, requestId: string): Response {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Request-Id': requestId,
  });
  for (const [name, value] of Object.entries(err.headers)) {
    headers.set(name, value);
  }
  return new Response(JSON.stringify({ error: { code: err.code, message: err.message } }), {
    status: err.status,
    headers,
  });
}
