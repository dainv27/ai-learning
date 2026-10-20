export interface Env {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  UPSTREAM_TIMEOUT_MS?: string;
  [binding: string]: string | undefined;
}

export interface Service {
  /** Name of the env binding holding the internal origin URL. */
  originVar: string;
  methods: string[];
  prefixes: string[];
}

export const SERVICE_REGISTRY: Record<string, Service> = {
  'service-a': { originVar: 'SERVICE_A_ORIGIN', methods: ['GET', 'HEAD', 'POST'], prefixes: ['/api'] },
  'service-b': { originVar: 'SERVICE_B_ORIGIN', methods: ['GET', 'HEAD'], prefixes: ['/public', '/health'] },
};

export interface Config {
  teamDomain: string;
  aud: string;
  timeoutMs: number;
  origins: Record<string, string>;
}

const TEAM_RE = /^[a-z0-9-]+\.cloudflareaccess\.com$/;
const IP_LIKE = /^[\d.]+$/;

/** Returns the normalized origin, or null if it is not an acceptable internal https origin. */
export function parseOrigin(value?: string): string | null {
  if (!value) return null;
  let u: URL;
  try {
    u = new URL(value.trim());
  } catch {
    return null;
  }
  const h = u.hostname.toLowerCase();
  const bad =
    u.protocol !== 'https:' ||
    !!u.username || !!u.password || u.search || u.hash || u.pathname !== '/' ||
    !h.includes('.') || h.includes(':') || h.startsWith('[') || IP_LIKE.test(h) ||
    h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local');
  return bad ? null : u.origin;
}

/** Fail closed: any missing or invalid value yields null (caller answers 503). */
export function validateConfig(env: Env, registry: Record<string, Service> = SERVICE_REGISTRY): Config | null {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const aud = env.ACCESS_AUD?.trim();
  if (!teamDomain || !TEAM_RE.test(teamDomain) || !aud) return null;
  const origins: Record<string, string> = {};
  for (const [key, svc] of Object.entries(registry)) {
    const o = parseOrigin(env[svc.originVar]);
    if (!o) return null;
    origins[key] = o;
  }
  const t = Number(env.UPSTREAM_TIMEOUT_MS);
  return { teamDomain, aud, origins, timeoutMs: t > 0 && t <= 60000 ? t : 10000 };
}
