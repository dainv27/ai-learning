export type AuthResult = 'ok' | 'unauthorized' | 'unconfigured';

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  const len = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

export function extractBearer(request: Request): string | null {
  const h = request.headers.get('authorization');
  if (!h) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(h.trim());
  return m ? m[1] : null;
}

/** Fails closed: no configured keys -> 'unconfigured'. */
export function authenticate(request: Request, apiKeys: string | undefined): AuthResult {
  const keys = (apiKeys ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (keys.length === 0) return 'unconfigured';
  const token = extractBearer(request);
  if (token === null) return 'unauthorized';
  let match = false;
  for (const k of keys) {
    if (constantTimeEqual(token, k)) match = true; // no early exit
  }
  return match ? 'ok' : 'unauthorized';
}
