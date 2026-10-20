export interface Env {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  SVC_A_ORIGIN?: string;
  SVC_B_ORIGIN?: string;
}

export interface ServiceDef {
  binding: keyof Env;
  methods: string[];
  prefixes: string[];
}

export const SERVICE_REGISTRY: Record<string, ServiceDef> = {
  'service-a': { binding: 'SVC_A_ORIGIN', methods: ['GET', 'POST'], prefixes: ['/api', '/health'] },
  'service-b': { binding: 'SVC_B_ORIGIN', methods: ['GET'], prefixes: ['/reports'] },
};

const BLOCKED_HOST = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/;

export function validateOrigin(value?: string): URL | null {
  if (!value) return null;
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  const ok =
    u.protocol === 'https:' && !u.username && !u.password && (u.pathname === '/' || u.pathname === '') &&
    !u.search && !u.hash && h.includes('.') && !h.includes(':') && !/^[\d.]+$/.test(h) && !BLOCKED_HOST.test(h);
  return ok ? u : null;
}

export function configOk(env: Env): boolean {
  return !!env.ACCESS_TEAM_DOMAIN && !!env.ACCESS_AUD &&
    Object.values(SERVICE_REGISTRY).every((s) => validateOrigin(env[s.binding]) !== null);
}
