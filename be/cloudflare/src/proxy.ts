import { Env, getTimeoutMs } from './config';

export class UpstreamError extends Error {
  kind: 'timeout' | 'failed';
  constructor(kind: 'timeout' | 'failed') {
    super(kind);
    this.kind = kind;
  }
}

/**
 * Calls the upstream with a timeout (until response headers arrive),
 * redirect: 'manual' and the original request body stream (never buffered).
 */
export async function forward(
  request: Request,
  upstreamUrl: string,
  headers: Headers,
  env: Env,
): Promise<Response> {
  if (env.UPSTREAM_ACCESS_CLIENT_ID && env.UPSTREAM_ACCESS_CLIENT_SECRET) {
    headers.set('CF-Access-Client-Id', env.UPSTREAM_ACCESS_CLIENT_ID);
    headers.set('CF-Access-Client-Secret', env.UPSTREAM_ACCESS_CLIENT_SECRET);
  }
  const method = request.method.toUpperCase();
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getTimeoutMs(env));
  try {
    return await fetch(upstreamUrl, {
      method,
      headers,
      body: hasBody ? request.body : null,
      redirect: 'manual',
      signal: controller.signal,
    });
  } catch {
    throw new UpstreamError(controller.signal.aborted ? 'timeout' : 'failed');
  } finally {
    clearTimeout(timer);
  }
}
