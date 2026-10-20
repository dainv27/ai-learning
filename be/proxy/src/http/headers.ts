// Request headers copied to the upstream. Everything else is dropped, including Cookie, Authorization,
// Host, X-Forwarded-*, Proxy-* and hop-by-hop headers.
const REQUEST_HEADER_ALLOWLIST = [
  'accept',
  'accept-encoding',
  'accept-language',
  'content-type',
  'content-length',
  'if-match',
  'if-none-match',
  'if-modified-since',
  'if-unmodified-since',
  'range',
  'user-agent',
];

// Response headers returned to the caller. Set-Cookie, Server, X-Powered-By and Location are never included.
const RESPONSE_HEADER_ALLOWLIST = [
  'content-type',
  'content-length',
  'content-encoding',
  'content-language',
  'content-disposition',
  'content-range',
  'accept-ranges',
  'etag',
  'last-modified',
  'vary',
];

const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
];

export function isHopByHopOrProxyHeader(name: string): boolean {
  const lower = name.toLowerCase();
  return HOP_BY_HOP.includes(lower) || lower.startsWith('proxy-') || lower.startsWith('x-forwarded-');
}

export function buildUpstreamHeaders(incoming: Headers, requestId: string, credential?: string): Headers {
  const out = new Headers();
  for (const name of REQUEST_HEADER_ALLOWLIST) {
    if (isHopByHopOrProxyHeader(name)) {
      continue;
    }
    const value = incoming.get(name);
    if (value !== null) {
      out.set(name, value);
    }
  }
  out.set('X-Request-Id', requestId);
  if (credential !== undefined && credential.length > 0) {
    out.set('Authorization', `Bearer ${credential}`);
  }
  return out;
}

export function filterResponseHeaders(upstream: Headers, requestId: string): Headers {
  const out = new Headers();
  for (const name of RESPONSE_HEADER_ALLOWLIST) {
    const value = upstream.get(name);
    if (value !== null) {
      out.set(name, value);
    }
  }
  out.set('Cache-Control', 'no-store');
  out.set('X-Request-Id', requestId);
  return out;
}
