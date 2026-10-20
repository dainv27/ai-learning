import { describe, it, expect } from 'vitest';
import { route, upstreamUrl } from '../src/router';

describe('route', () => {
  it.each([
    '/service-a/api/../x',
    '/service-a/api/./x',
    '/service-a/api/%2e%2e/x',
    '/service-a/api/%2E/x',
    '/service-a/api%2Fx',
    '/service-a/api/%2fx',
    '/service-a/api/a%5Cb',
    '/service-a/api/a%00b',
    '/service-a/api/%252e%252e/x',
    '/service-a/api//x',
    '/service-a//api',
    '/service-a/api/a\\b',
    '/service-a/api/a%0ab',
    '/service-a/api/%zz',
    '/service-a/api/a\u0001b',
  ])('rejects %s with 400', (p) => {
    expect(route('GET', p)).toEqual({ ok: false, status: 400, allow: undefined });
  });

  it('returns 404 for unknown service, root and non-allowed prefix', () => {
    for (const p of ['/nope/api/x', '/', '/constructor/api', '/__proto__/api', '/service-a', '/service-a/other', '/service-a/apix', '/service-a/api2/x']) {
      expect(route('GET', p)).toMatchObject({ ok: false, status: 404 });
    }
  });

  it('returns 405 with allowed methods', () => {
    expect(route('DELETE', '/service-a/api/x')).toMatchObject({ ok: false, status: 405, allow: 'GET, HEAD, POST' });
    expect(route('POST', '/service-b/public/x')).toMatchObject({ ok: false, status: 405 });
  });

  it('matches on segment boundaries and normalizes the path', () => {
    expect(route('GET', '/service-a/api')).toEqual({ ok: true, key: 'service-a', path: '/api' });
    expect(route('GET', '/service-a/api/users/42')).toMatchObject({ ok: true, path: '/api/users/42' });
    expect(route('GET', '/service-a/%61pi/x%20y')).toMatchObject({ ok: true, path: '/api/x%20y' });
    expect(route('GET', '/service-a/api/x/')).toMatchObject({ ok: true, path: '/api/x/' });
    expect(route('GET', '/service-b/health')).toMatchObject({ ok: true, key: 'service-b' });
  });
});

describe('upstreamUrl', () => {
  const origin = 'https://service-a.internal.example';
  it('builds origin + path + query', () => {
    expect(upstreamUrl(origin, '/api/x', '?a=1').toString()).toBe(origin + '/api/x?a=1');
  });
  it('throws when the final host differs from the registry origin', () => {
    expect(() => upstreamUrl(origin, '@evil.example.com/x', '')).toThrow();
  });
});
