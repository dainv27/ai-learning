import { authenticate } from './auth/authenticate';
import { errorResponse, ProxyError, toProxyError } from './http/errors';
import { forward } from './http/forward';
import { readBinding, type Env } from './types/env';
import { resolveRoute, validateRequestUrl } from './routing/resolveTarget';

const HEALTH_PATH = '/healthz';

async function handle(
  request: Request,
  env: Env,
  requestId: string,
  onService: (key: string) => void,
): Promise<Response> {
  const url = validateRequestUrl(request);

  if (url.pathname === HEALTH_PATH) {
    if (request.method !== 'GET') {
      throw new ProxyError('method_not_allowed', 'Method not allowed', { Allow: 'GET' });
    }
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Request-Id': requestId,
      },
    });
  }

  authenticate(request, env);

  const route = resolveRoute(url, request.method, env);
  onService(route.serviceKey);

  const credentialBinding = route.service.credentialBinding;
  const credential = credentialBinding !== undefined ? readBinding(env, credentialBinding) : undefined;
  if (credentialBinding !== undefined && (credential === undefined || credential.length === 0)) {
    throw new Error('Service credential is not configured');
  }

  return forward(request, {
    service: route.service,
    upstreamUrl: route.upstreamUrl,
    credential,
    requestId,
  });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const started = Date.now();
    const requestId = crypto.randomUUID();
    let serviceKey = 'none';
    let status = 500;
    try {
      const response = await handle(request, env, requestId, (key) => {
        serviceKey = key;
      });
      status = response.status;
      return response;
    } catch (err) {
      if (!(err instanceof ProxyError)) {
        console.error(JSON.stringify({ requestId, level: 'error', errorName: err instanceof Error ? err.name : 'unknown' }));
      }
      const proxyError = toProxyError(err);
      status = proxyError.status;
      return errorResponse(proxyError, requestId);
    } finally {
      console.log(
        JSON.stringify({
          requestId,
          service: serviceKey,
          method: request.method,
          status,
          latencyMs: Date.now() - started,
        }),
      );
    }
  },
} satisfies ExportedHandler<Env>;
