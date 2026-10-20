import { configOk } from './config';
import type { Env } from './config';
import { authenticate } from './auth';
import { resolve } from './router';
import { buildRequestHeaders, sanitizeResponse } from './headers';

const TIMEOUT_MS = 10_000;
const MSG: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  404: 'not_found',
  405: 'method_not_allowed',
  502: 'bad_gateway',
  503: 'service_unavailable',
  504: 'gateway_timeout',
};

function fail(status: number, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: MSG[status] }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (!configOk(env)) return fail(503);
    if (!(await authenticate(req, env))) return fail(401, { 'www-authenticate': 'Cf-Access-Jwt-Assertion' });
    const r = resolve(req, env);
    if ('status' in r) return fail(r.status);
    if (r.url.hostname !== r.origin.hostname) return fail(400);
    const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const up = await fetch(r.url, {
        method: req.method,
        headers: buildRequestHeaders(req),
        body,
        redirect: 'manual',
        signal: ctrl.signal,
      });
      return new Response(up.body, { status: up.status, headers: sanitizeResponse(up, r.key, r.origin) });
    } catch (e) {
      return (e as Error).name === 'AbortError' ? fail(504) : fail(502);
    } finally {
      clearTimeout(timer);
    }
  },
};
