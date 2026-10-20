export interface Env {
  // Caller authentication secret. Set with: wrangler secret put PROXY_CLIENT_TOKEN
  PROXY_CLIENT_TOKEN: string;
  // Upstream origin for the example service. PLACEHOLDER ONLY, set per environment in wrangler.toml [vars] or dashboard.
  SERVICE_EXAMPLE_ORIGIN: string;
  // Optional upstream credential for the example service. Set with: wrangler secret put SERVICE_EXAMPLE_TOKEN
  SERVICE_EXAMPLE_TOKEN?: string;
}

export type EnvKey = keyof Env;

export function readBinding(env: Env, key: EnvKey): string | undefined {
  const value = env[key];
  return typeof value === 'string' ? value : undefined;
}
