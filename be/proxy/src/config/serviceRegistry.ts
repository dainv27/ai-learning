import type { EnvKey } from '../types/env';

export interface ServiceDefinition {
  // Env binding that holds the https origin of the internal service. Never read from request data.
  originBinding: EnvKey;
  // Optional env secret injected as Authorization: Bearer <value> on upstream requests.
  credentialBinding?: EnvKey;
  // Allowed HTTP methods for this service. Anything else returns 405 with Allow.
  methods: readonly string[];
  // Allowed upstream path prefixes, without leading or trailing slash, matched on whole segments.
  pathPrefixes: readonly string[];
  // Upstream timeout to response headers, in milliseconds.
  timeoutMs: number;
  // Maximum request body size in bytes.
  maxBodyBytes: number;
}

// EXAMPLE ENTRIES ONLY. Replace with real services. Never commit real internal hostnames, IPs or secrets.
// Route format: /<service-key>/<path...>
export const SERVICE_REGISTRY: Readonly<Record<string, ServiceDefinition>> = {
  example: {
    originBinding: 'SERVICE_EXAMPLE_ORIGIN',
    credentialBinding: 'SERVICE_EXAMPLE_TOKEN',
    methods: ['GET', 'HEAD', 'POST'],
    pathPrefixes: ['v1/items', 'status'],
    timeoutMs: 10_000,
    maxBodyBytes: 1_048_576,
  },
};

export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_URL_LENGTH = 2048;
export const SERVICE_KEY_PATTERN = /^[a-z0-9-]{1,64}$/;
