import { authenticate } from './auth';
import { Env, lookupService, resolveOrigin } from './config';
import { buildClientHeaders, buildUpstreamHeaders } from './headers';
import { forward, UpstreamError } from './proxy';
import { parseRoute } from './router';

function errorResponse(
  status: number,
  code: string,
  message: string,
  requestId: string,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify({ error: code, message, requestId }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-request-id': requestId,
      ...extra,
    },
  });
}

async function handle(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url);

  // 1. health (unauthenticated, static body)
  if (url.pathname === '/__health') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-request-id': requestId },
    });
  }

  // 2. authenticate before revealing anything about routing
  const auth = authenticate(request, env.PROXY_API_KEYS);
  if (auth === 'unconfigured') {
    return errorResponse(503, 'proxy_unconfigured', 'Service unavailable', requestId);
  }
  if (auth !== 'ok') {
    return errorResponse(401, 'unauthorized', 'Authentication required', requestId, {
      'www-authenticate': 'Bearer',
    });
  }

  // 3. route + path safety
  const route = parseRoute(url.pathname);
  if (!route.ok) return errorResponse(400, 'bad_path', 'Invalid path', requestId);
  const def = lookupService(route.service);
  if (!def) return errorResponse(404, 'not_found', 'Not found', requestId);

  // 4. method allowlist
  const method = request.method.toUpperCase();
  if (!def.methods.includes(method)) {
    return errorResponse(405, 'method_not_allowed', 'Method not allowed', requestId, {
      allow: def.methods.join(', '),
    });
  }

  // 5. origin only from registry + env, https only
  const origin = resolveOrigin(env, def);
  if (!origin) return errorResponse(502, 'bad_gateway', 'Bad gateway', requestId);
  const upstreamUrl = origin + route.path + url.search;

  // 6. forward with filtered headers, stream response back
  const upstream = await forward(
    request,
    upstreamUrl,
    buildUpstreamHeaders(request.headers, requestId),
    env,
  );
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: buildClientHeaders(upstream.headers, requestId, route.service, upstreamUrl),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    try {
      return await handle(request, env, requestId);
    } catch (err) {
      if (err instanceof UpstreamError) {
        return err.kind === 'timeout'
          ? errorResponse(504, 'upstream_timeout', 'Upstream timed out', requestId)
          : errorResponse(502, 'bad_gateway', 'Bad gateway', requestId);
      }
      return errorResponse(500, 'internal_error', 'Internal error', requestId);
    }
  },
};
