const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const REQUEST_DENY = new Set([
  'authorization',
  'cookie',
  'host',
  'forwarded',
  'x-real-ip',
  'x-request-id',
]);

const RESPONSE_DENY = new Set([
  'server',
  'x-powered-by',
  'via',
  'set-cookie',
  'location',
]);

export function buildUpstreamHeaders(incoming: Headers, requestId: string): Headers {
  const out = new Headers();
  incoming.forEach((value, name) => {
    const k = name.toLowerCase();
    if (HOP_BY_HOP.has(k) || REQUEST_DENY.has(k)) return;
    if (k.startsWith('cf-') || k.startsWith('x-forwarded-')) return;
    out.append(name, value);
  });
  const ip = incoming.get('cf-connecting-ip');
  if (ip) out.set('X-Forwarded-For', ip);
  out.set('X-Request-Id', requestId);
  return out;
}

export function buildClientHeaders(
  upstream: Headers,
  requestId: string,
  service: string,
  upstreamUrl: string,
): Headers {
  const out = new Headers();
  upstream.forEach((value, name) => {
    const k = name.toLowerCase();
    if (HOP_BY_HOP.has(k) || RESPONSE_DENY.has(k)) return;
    if (k.startsWith('x-internal-') || k.startsWith('x-envoy-') || k.startsWith('cf-')) return;
    out.append(name, value);
  });
  // Rewrite same-origin redirects to the public route; drop anything else.
  const loc = upstream.get('location');
  if (loc) {
    try {
      const target = new URL(loc, upstreamUrl);
      if (target.origin === new URL(upstreamUrl).origin) {
        out.set('Location', `/${service}${target.pathname}${target.search}`);
      }
    } catch {
      // unparsable Location is dropped
    }
  }
  out.set('X-Request-Id', requestId);
  return out;
}
