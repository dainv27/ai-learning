import type { Env } from './config';

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { keys: Map<string, CryptoKey>; exp: number }>();
const dec = new TextDecoder();

function b64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function getKey(team: string, kid: string): Promise<CryptoKey | undefined> {
  let entry = cache.get(team);
  if (!entry || entry.exp < Date.now()) {
    const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
    if (!res.ok) return undefined;
    const body = (await res.json()) as { keys?: (JsonWebKey & { kid?: string })[] };
    const keys = new Map<string, CryptoKey>();
    for (const k of body.keys ?? []) {
      if (k.kty === 'RSA' && k.kid && k.n && k.e) {
        keys.set(
          k.kid,
          await crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']),
        );
      }
    }
    entry = { keys, exp: Date.now() + TTL_MS };
    cache.set(team, entry);
  }
  return entry.keys.get(kid);
}

export async function authenticate(req: Request, env: Env): Promise<boolean> {
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  const parts = token?.split('.') ?? [];
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(dec.decode(b64url(parts[0])));
    const claims = JSON.parse(dec.decode(b64url(parts[1])));
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return false;
    const key = await getKey(env.ACCESS_TEAM_DOMAIN as string, header.kid);
    if (!key) return false;
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(parts[2]), signed))) return false;
    const now = Math.floor(Date.now() / 1000);
    const aud: unknown[] = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    return (
      claims.iss === `https://${env.ACCESS_TEAM_DOMAIN}` &&
      aud.includes(env.ACCESS_AUD) &&
      typeof claims.exp === 'number' && claims.exp > now &&
      (claims.nbf === undefined || (typeof claims.nbf === 'number' && claims.nbf <= now))
    );
  } catch {
    return false;
  }
}
