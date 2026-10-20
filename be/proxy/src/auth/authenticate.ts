import { ProxyError } from '../http/errors';
import type { Env } from '../types/env';

// Compares two strings without early exit on the first mismatching character.
export function constantTimeEquals(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

// Runs before any upstream call. Caller credential is never logged or forwarded.
export function authenticate(request: Request, env: Env): void {
  const expected = env.PROXY_CLIENT_TOKEN;
  if (typeof expected !== 'string' || expected.length === 0) {
    // Fail closed. The boundary maps this to a generic 500 without detail.
    throw new Error('PROXY_CLIENT_TOKEN is not configured');
  }
  const header = request.headers.get('Authorization');
  if (header === null) {
    throw new ProxyError('unauthorized', 'Missing credentials', { 'WWW-Authenticate': 'Bearer' });
  }
  const match = /^Bearer (.+)$/.exec(header);
  if (match === null) {
    throw new ProxyError('unauthorized', 'Malformed credentials', { 'WWW-Authenticate': 'Bearer' });
  }
  if (!constantTimeEquals(match[1], expected)) {
    throw new ProxyError('forbidden', 'Invalid credentials');
  }
}
