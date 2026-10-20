import { SERVICE_REGISTRY, type Service } from './config';

export type RouteResult =
  | { ok: true; key: string; path: string }
  | { ok: false; status: 400 | 404 | 405; allow?: string };

const BAD_CHARS = /[\x00-\x1f\x7f\\]/;
const BAD_ENCODING = /%(?![0-9a-f]{2})|%(2e|2f|5c|00|25)/i;

const fail = (status: 400 | 404 | 405, allow?: string): RouteResult => ({ ok: false, status, allow });

/** rawPath is the path portion of the request URL, e.g. /service-a/api/users */
export function route(
  method: string,
  rawPath: string,
  registry: Record<string, Service> = SERVICE_REGISTRY,
): RouteResult {
  if (!rawPath.startsWith('/') || BAD_CHARS.test(rawPath) || BAD_ENCODING.test(rawPath)) return fail(400);
  if (rawPath === '/') return fail(404);

  const raw = rawPath.slice(1).split('/');
  const trailing = raw.length > 1 && raw[raw.length - 1] === '';
  if (trailing) raw.pop();

  let segs: string[];
  try {
    segs = raw.map(decodeURIComponent);
  } catch {
    return fail(400);
  }
  if (segs.some((s) => s === '' || s === '.' || s === '..' || BAD_CHARS.test(s) || s.includes('/'))) return fail(400);

  const key = segs[0];
  const svc = Object.hasOwn(registry, key) ? registry[key] : undefined;
  if (!svc) return fail(404);
  if (!svc.methods.includes(method.toUpperCase())) return fail(405, svc.methods.join(', '));

  const rest = '/' + segs.slice(1).join('/');
  if (!svc.prefixes.some((p) => rest === p || rest.startsWith(p + '/'))) return fail(404);

  const path = '/' + segs.slice(1).map(encodeURIComponent).join('/') + (trailing ? '/' : '');
  return { ok: true, key, path };
}

/** origin + normalized path; the final host is re-checked against the registry origin. */
export function upstreamUrl(origin: string, path: string, search: string): URL {
  const base = new URL(origin);
  const url = new URL(origin + path + search);
  if (url.protocol !== base.protocol || url.host !== base.host) throw new Error('origin mismatch');
  return url;
}
