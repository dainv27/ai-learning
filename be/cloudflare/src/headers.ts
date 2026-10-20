const REQ_ALLOW = ['content-type', 'accept', 'accept-encoding', 'content-length', 'user-agent', 'if-none-match', 'if-modified-since', 'range'];
const HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'set-cookie', 'set-cookie2'];

export function buildRequestHeaders(req: Request): Headers {
  const h = new Headers();
  for (const k of REQ_ALLOW) {
    const v = req.headers.get(k);
    if (v !== null) h.set(k, v);
  }
  h.set('x-request-id', crypto.randomUUID());
  h.set('x-forwarded-host', new URL(req.url).host);
  return h;
}

export function sanitizeResponse(up: Response, key: string, origin: URL): Headers {
  const h = new Headers(up.headers);
  for (const k of HOP) h.delete(k);
  const loc = h.get('location');
  if (loc !== null) {
    let u: URL | null = null;
    try {
      u = new URL(loc, origin.origin);
    } catch {
      u = null;
    }
    if (u && u.origin === origin.origin) h.set('location', `/${key}${u.pathname}${u.search}`);
    else h.delete('location');
  }
  return h;
}
