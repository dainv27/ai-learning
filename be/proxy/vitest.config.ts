import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    include: ['test/**/*.test.ts'],
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
        miniflare: {
          bindings: {
            PROXY_CLIENT_TOKEN: 'test-client-token',
            SERVICE_EXAMPLE_ORIGIN: 'https://example-internal.invalid',
            SERVICE_EXAMPLE_TOKEN: 'test-upstream-token',
          },
        },
      },
    },
  },
});
