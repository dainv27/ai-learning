interface KeySet {
  keys: Map<string, CryptoKey>;
  exp: number;
}

const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, KeySet>();

export const clearJwksCache = (): void => cache.clear();

const b64 = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const parts = (s: string): any => JSON.parse(new TextDecoder().decode(b64(s)));

async function getKey(team: string, kid: string, now: number): Promise<CryptoKey | undefined> {
  let set = cache.get(team);
  if (!set || set.exp <= now) {
    const res = await fetch(`https://${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('jwks');
    const body = (await res.json()) as { keys: Array<JsonWebKey & { kid?: string }> };
    const keys = new Map<string, CryptoKey>();
    for (const k of body.keys) {
      if (k.kty === 'RSA' && k.kid) {
        keys.set(k.kid, await crypto.subtle.importKey('jwk', k, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
      }
    }
    set = { keys, exp: now + TTL_MS };
    cache.set(team, set);
  }
  return set.keys.get(kid);
}

/** Verifies a Cloudflare Access JWT. Any failure or exception means false (fail closed). */
export async function verifyAccess(
  token: string | null | undefined,
  team: string,
  aud: string,
  now: number = Date.now(),
): Promise<boolean> {
  try {
    const p = token?.split('.');
    if (!p || p.length !== 3) return false;
    const header = parts(p[0]);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false;
    const key = await getKey(team, header.kid, now);
    if (!key) return false;
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(p[2]), new TextEncoder().encode(`${p[0]}.${p[1]}`));
    if (!valid) return false;
    const c = parts(p[1]);
    const sec = Math.floor(now / 1000);
    const auds = ([] as unknown[]).concat(c.aud);
    return (
      c.iss === `https://${team}` &&
      auds.includes(aud) &&
      typeof c.exp === 'number' && c.exp > sec &&
      (c.nbf === undefined || (typeof c.nbf === 'number' && c.nbf <= sec))
    );
  } catch {
    return false;
  }
}
