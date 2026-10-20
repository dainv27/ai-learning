import { MAX_URL_LENGTH, SERVICE_KEY_PATTERN, SERVICE_REGISTRY, type ServiceDefinition } from '../config/serviceRegistry';
import { ProxyError } from '../http/errors';
import { readBinding, type Env } from '../types/env';

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
// Encoded dot, slash, backslash, and control characters (%00-%1F, %7F).
const UNSAFE_ENCODINGS = /%(2e|2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i;

export interface ResolvedRoute {
  serviceKey: string;
  service: ServiceDefinition;
  upstreamUrl: URL;
}

// Step 1, runs before authentication. Rejects malformed or unsafe paths.
// Note: the WHATWG URL parser normalizes literal dot-segments and backslashes before the Worker sees request.url.
// Those are therefore rejected only when encoded or when they survive normalization; the allowlist still bounds the target.
export function validateRequestUrl(request: Request): URL {
  const raw = request.url;
  if (raw.length > MAX_URL_LENGTH) {
    throw new ProxyError('bad_request', 'URL too long');
  }
  if (CONTROL_CHARS.test(raw)) {
    throw new ProxyError('bad_request', 'Invalid characters in URL');
  }
  const url = new URL(raw);
  const path = url.pathname;
  if (UNSAFE_ENCODINGS.test(path)) {
    throw new ProxyError('bad_request', 'Encoded separators, dot-segments or control characters are not allowed');
  }
  if (path.includes('\\') || path.includes('//')) {
    throw new ProxyError('bad_request', 'Invalid path');
  }
  if (path.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new ProxyError('bad_request', 'Path traversal is not allowed');
  }
  return url;
}

// Step 3, runs after authentication. Resolves the service and builds the upstream URL from env only.
export function resolveRoute(url: URL, method: string, env: Env): ResolvedRoute {
  const segments = url.pathname.split('/').filter((segment) => segment.length > 0);
  const [serviceKey, ...rest] = segments;
  if (
    serviceKey === undefined ||
    !SERVICE_KEY_PATTERN.test(serviceKey) ||
    !Object.hasOwn(SERVICE_REGISTRY, serviceKey)
  ) {
    throw new ProxyError('not_found', 'Not found');
  }
  const service = SERVICE_REGISTRY[serviceKey];
  if (!service.methods.includes(method)) {
    throw new ProxyError('method_not_allowed', 'Method not allowed', { Allow: service.methods.join(', ') });
  }
  const upstreamPath = rest.join('/');
  if (!isAllowedPath(upstreamPath, service)) {
    throw new ProxyError('not_found', 'Not found');
  }
  const origin = resolveOrigin(env, service);
  const upstreamUrl = new URL(origin.origin);
  const basePath = origin.pathname.replace(/\/+$/, '');
  upstreamUrl.pathname = `${basePath}/${upstreamPath}`;
  upstreamUrl.search = url.search;
  return { serviceKey, service, upstreamUrl };
}

function isAllowedPath(path: string, service: ServiceDefinition): boolean {
  if (path.length === 0) {
    return false;
  }
  return service.pathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function resolveOrigin(env: Env, service: ServiceDefinition): URL {
  const raw = readBinding(env, service.originBinding);
  if (raw === undefined || raw.length === 0) {
    throw new Error('Origin binding is not configured');
  }
  let origin: URL;
  try {
    origin = new URL(raw);
  } catch {
    throw new Error('Origin binding is not a valid URL');
  }
  if (
    origin.protocol !== 'https:' ||
    origin.username !== '' ||
    origin.password !== '' ||
    origin.search !== '' ||
    origin.hash !== ''
  ) {
    throw new Error('Origin binding must be a bare https origin');
  }
  return origin;
}
