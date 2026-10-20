import { vi } from 'vitest';
import worker from '../src/index';
import { clearJwksCache } from '../src/auth';
import type { Env } from '../src/config';

export const TEAM = 'team.cloudflareaccess.com';
export const AUD = 'test-aud';
export const ENV: Env = {
  ACCESS_TEAM_DOMAIN: TEAM,
  ACCESS_AUD: AUD,
  SERVICE_A_ORIGIN: 'https://service-a.internal.example',
  SERVICE_B_ORIGIN: 'https://service-b.internal.example',
  UPSTREAM_TIMEOUT_MS: '200',
};

const pair = (await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
)) as CryptoKeyPair;
const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);

const b64u = (b: string | ArrayBuffer): string =>
  (typeof b === 'string' ? Buffer.from(b) : Buffer.from(b)).toString('base64url');

export async function sign(claims: object = {}, header: object = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', ...header }));
  const p = b64u(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], exp: now + 300, nbf: now - 10, ...claims }));
  const s = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, Buffer.from(`${h}.${p}`));
  return `${h}.${p}.${b64u(s)}`;
}

type Upstream = (url: string, init: any) => Response | Promise<Response>;

/** Stubs global fetch: serves the local JWKS, delegates everything else to `upstream`. */
export function setup(upstream: Upstream = () => new Response('ok')) {
  clearJwksCache();
  const f = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    if (url === `https://${TEAM}/cdn-cgi/access/certs`) {
      return Response.json({ keys: [{ ...publicJwk, kid: 'k1', alg: 'RS256', use: 'sig' }] });
    }
    return upstream(url, init);
  });
  vi.stubGlobal('fetch', f);
  return f;
}

export const upstreamCalls = (f: ReturnType<typeof setup>) =>
  f.mock.calls.filter((c) => !String(c[0]).includes('/cdn-cgi/'));

export async function call(
  path: string,
  init: RequestInit & { token?: string | null } = {},
  env: Env = ENV,
): Promise<Response> {
  const { token = await sign(), headers, ...rest } = init;
  const h = new Headers(headers);
  if (token) h.set('cf-access-jwt-assertion', token);
  return worker.fetch(new Request('https://proxy.example.com' + path, { ...rest, headers: h }), env);
}
