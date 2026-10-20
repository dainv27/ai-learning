import { validateConfig, SERVICE_REGISTRY, type Env } from './config';
import { verifyAccess } from './auth';
import { route, upstreamUrl } from './router';
import { requestHeaders, responseHeaders } from './headers';

const err = (status: number, error: string, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });

/** Path portion of the URL string, without query or fragment. */
function rawPath(url: string): string {
  const start = url.indexOf('/', url.indexOf('//') + 2);
  return start < 0 ? '/' : url.slice(start).split('?')[0].split('#')[0];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 1. config (fail closed)
    const cfg = validateConfig(env);
    if (!cfg) return err(503, 'service_unavailable');

    // 2. authenticate before any routing or upstream call
    const token = request.headers.get('cf-access-jwt-assertion');
    if (!(await verifyAccess(token, cfg.teamDomain, cfg.aud))) return err(401, 'unauthorized');

    // 3. normalize + allowlist
    const r = route(request.method, rawPath(request.url));
    if (!r.ok) {
      if (r.status === 405) return err(405, 'method_not_allowed', { Allow: r.allow ?? '' });
      return err(r.status, r.status === 400 ? 'bad_request' : 'not_found');
    }

    // 4. upstream request (origin from binding only)
    const id = crypto.randomUUID();
    const origin = cfg.origins[r.key];
    let target: URL;
    try {
      target = upstreamUrl(origin, r.path, new URL(request.url).search);
    } catch {
      return err(502, 'bad_gateway');
    }
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const init = {
      method: request.method,
      headers: requestHeaders(request, id),
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
      duplex: 'half',
      signal: AbortSignal.timeout(cfg.timeoutMs),
    } as RequestInit;

    // 5. forward with timeout, stream the response
    let res: Response;
    try {
      res = await fetch(target.toString(), init);
    } catch (e) {
      const name = (e as { name?: string } | null)?.name;
      return name === 'TimeoutError' || name === 'AbortError' ? err(504, 'gateway_timeout') : err(502, 'bad_gateway');
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders(res.headers, origin, r.key, id),
    });
  },
};

export { SERVICE_REGISTRY };
