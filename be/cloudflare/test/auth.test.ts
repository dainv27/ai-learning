import { describe, it, expect } from 'vitest';
import { verifyAccess } from '../src/auth';
import { setup, sign, TEAM, AUD } from './helpers';

const check = (t: string | null) => verifyAccess(t, TEAM, AUD);

describe('verifyAccess', () => {
  it('accepts a valid token and caches the JWKS', async () => {
    const f = setup();
    expect(await check(await sign())).toBe(true);
    expect(await check(await sign({ aud: AUD }))).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it.each([null, '', 'abc', 'a.b', 'a.b.c'])('rejects missing/malformed token %s', async (t) => {
    setup();
    expect(await check(t)).toBe(false);
  });

  it.each([
    ['alg none', { alg: 'none' }],
    ['alg HS256', { alg: 'HS256' }],
    ['unknown kid', { kid: 'other' }],
  ])('rejects header: %s', async (_n, header) => {
    setup();
    expect(await check(await sign({}, header))).toBe(false);
  });

  it.each([
    ['wrong iss', { iss: 'https://evil.example.com' }],
    ['wrong aud', { aud: ['other'] }],
    ['expired', { exp: 1 }],
    ['nbf in future', { nbf: Math.floor(Date.now() / 1000) + 3600 }],
    ['no exp', { exp: undefined }],
  ])('rejects claims: %s', async (_n, claims) => {
    setup();
    expect(await check(await sign(claims))).toBe(false);
  });

  it('rejects a bad signature and a tampered payload', async () => {
    setup();
    const t = await sign();
    expect(await check(t.slice(0, -6) + 'AAAAAA')).toBe(false);
    const [h, , s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ iss: `https://${TEAM}`, aud: [AUD], exp: 9999999999 })).toString('base64url');
    expect(await check(`${h}.${forged}.${s}`)).toBe(false);
  });

  it('fails closed when the JWKS cannot be fetched', async () => {
    setup();
    const { vi } = await import('vitest');
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network'); }));
    expect(await check(await sign())).toBe(false);
  });
});
