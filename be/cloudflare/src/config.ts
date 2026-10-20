export interface Env {
  PROXY_API_KEYS?: string;
  UPSTREAM_ACCESS_CLIENT_ID?: string;
  UPSTREAM_ACCESS_CLIENT_SECRET?: string;
  UPSTREAM_TIMEOUT_MS?: string;
  ORDERS_ORIGIN?: string;
  USERS_ORIGIN?: string;
}

export type OriginBinding = 'ORDERS_ORIGIN' | 'USERS_ORIGIN';

export interface ServiceDef {
  originBinding: OriginBinding;
  methods: readonly string[];
}

// Only services listed here can ever be reached. Origins come from env bindings.
export const SERVICE_REGISTRY: Record<string, ServiceDef> = {
  orders: {
    originBinding: 'ORDERS_ORIGIN',
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  users: {
    originBinding: 'USERS_ORIGIN',
    methods: ['GET', 'HEAD'],
  },
};

export function lookupService(key: string): ServiceDef | null {
  return Object.prototype.hasOwnProperty.call(SERVICE_REGISTRY, key)
    ? SERVICE_REGISTRY[key]
    : null;
}

/** Returns the https origin for a service, or null if missing/invalid/not https. */
export function resolveOrigin(env: Env, def: ServiceDef): string | null {
  const raw = env[def.originBinding];
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function getTimeoutMs(env: Env): number {
  const n = parseInt(env.UPSTREAM_TIMEOUT_MS ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 25000;
}
