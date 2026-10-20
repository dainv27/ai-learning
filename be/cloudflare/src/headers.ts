const REQUEST_ALLOW = [
  'content-type',
  'accept',
  'accept-encoding',
  'content-length',
  'accept-language',
  'if-none-match',
  'if-modified-since',
  'range',
];

const RESPONSE_DROP = new Set([
  'set-cookie',
  'set-cookie2',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/** Allowlist: only listed client headers reach the internal service. */
export function requestHeaders(req: Request, requestId: string): Headers {
  const h = new Headers();
  for (const name of REQUEST_ALLOW) {
    const v = req.headers.get(name);
    if (v !== null) h.set(name, v);
  }
  h.set('x-request-id', requestId);
  h.set('x-forwarded-host', new URL(req.url).host);
  return h;
}

/** Drops Set-Cookie/hop-by-hop headers; Location is kept only if it stays inside the same upstream origin. */
export function responseHeaders(upstream: Headers, upstreamOrigin: string, key: string, requestId: string): Headers {
  const h = new Headers();
  upstream.forEach((value, name) => {
    if (!RESPONSE_DROP.has(name.toLowerCase())) h.set(name, value);
  });
  const loc = h.get('location');
  h.delete('location');
  if (loc) {
    try {
      const u = new URL(loc, upstreamOrigin);
      if (u.origin === upstreamOrigin) h.set('location', `/${key}${u.pathname}${u.search}`);
    } catch {
      // unparsable Location is dropped
    }
  }
  h.set('x-request-id', requestId);
  return h;
}
