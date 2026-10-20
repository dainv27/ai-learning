export type RouteResult =
  | { ok: true; service: string; path: string }
  | { ok: false };

function decodeFully(s: string): string | null {
  let cur = s;
  for (let i = 0; i < 3; i++) {
    let next: string;
    try {
      next = decodeURIComponent(cur);
    } catch {
      return null;
    }
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

function isUnsafePath(pathname: string): boolean {
  if (pathname.includes('//') || pathname.includes('\\')) return true;
  const decoded = decodeFully(pathname);
  if (decoded === null) return true;
  if (decoded.includes('\\') || decoded.includes('//')) return true;
  return decoded.split('/').some((seg) => seg === '..' || seg === '.');
}

/** Parses /<service-key>/<path...>. `path` keeps the original encoding. */
export function parseRoute(pathname: string): RouteResult {
  if (isUnsafePath(pathname)) return { ok: false };
  const segments = pathname.replace(/^\//, '').split('/');
  const service = segments[0] ?? '';
  const path = '/' + segments.slice(1).join('/');
  return { ok: true, service, path };
}
