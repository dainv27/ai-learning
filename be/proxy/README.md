# Internal service proxy (Cloudflare Worker)

An allowlist-only reverse proxy. It is not a generic forwarder. Clients never choose the upstream host or URL.

## Route format

`/<service-key>/<path...>`

- `<service-key>` must be a key in `SERVICE_REGISTRY` (src/config/serviceRegistry.ts). Otherwise the response is 404.
- `<path...>` must start with one of the service's `pathPrefixes`, matched on whole segments. Otherwise the response is 404.
- Disallowed methods return 405 with an `Allow` header.
- `GET /healthz` is served locally and does not call any upstream.

All callers send `Authorization: Bearer <PROXY_CLIENT_TOKEN>`. A missing header returns 401 and a wrong token returns 403. Neither reaches an upstream.

## Register a service

1. Add an env binding for the origin in `src/types/env.ts` and in `wrangler.toml` `[vars]`, for example `SERVICE_<NAME>_ORIGIN`. Use an `https://` origin only, with no path, query or credentials.
2. If the service needs an upstream credential, add an optional secret binding `SERVICE_<NAME>_TOKEN` in `src/types/env.ts`.
3. Add an entry to `SERVICE_REGISTRY` with `originBinding`, optional `credentialBinding`, `methods`, `pathPrefixes`, `timeoutMs` (default 10000) and `maxBodyBytes`.
4. Add tests under `test/` for the new prefixes and methods.

The example entry uses placeholder values only (`example-internal.invalid`). Do not commit real internal hostnames, IPs or secrets.

## Secrets

Secrets are never stored in `wrangler.toml`. Set them per environment:

```
wrangler secret put PROXY_CLIENT_TOKEN
wrangler secret put SERVICE_EXAMPLE_TOKEN
```

## Develop and test

```
npm install
npm run typecheck
npm test
npm run dev
npm run deploy
```

Tests run offline. The upstream `fetch` is mocked.

## Known limits

- The WHATWG URL parser normalizes literal `..` and backslashes before the Worker sees the request. Those are rejected only when encoded or when they survive normalization. The allowlist still bounds the target.
- The timeout covers the time to upstream response headers. Body streaming is not capped by it. A body that stops mid-stream is truncated to the client.
- A request body that the upstream does not read to the end can still exceed the cap after the response has started. The client then sees a truncated body.
- Cloudflare Access JWT validation is not implemented. Only the shared client token is supported.
