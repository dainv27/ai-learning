# Internal proxy (Cloudflare Worker)

Allowlist reverse proxy in front of internal services. Route format: `/<service-key>/<path...>`.

Pipeline: validate config (503) -> verify Cloudflare Access JWT (401) -> normalize path and match allowlist (400/404/405) -> forward with timeout (502/504).

## Bindings

| Name | Kind | Description |
| --- | --- | --- |
| `ACCESS_TEAM_DOMAIN` | var | `<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | var | AUD tag of the Access application |
| `SERVICE_A_ORIGIN`, `SERVICE_B_ORIGIN` | var | https origin of each internal service (no IPs, localhost or paths) |
| `UPSTREAM_TIMEOUT_MS` | var, optional | default 10000, max 60000 |

Services, methods and path prefixes are defined in `src/config.ts` (`SERVICE_REGISTRY`). To add a service, add a registry entry and a matching binding in `wrangler.toml`. If a binding is missing or invalid the Worker answers 503 for every request.

## Cloudflare Access setup

1. In Zero Trust, create a self-hosted Access application for the Worker route/domain.
2. Add policies for users, and Service Auth policies for machine clients (service tokens also produce the JWT).
3. Copy the application AUD tag to `ACCESS_AUD`, and set `ACCESS_TEAM_DOMAIN`.
4. Do not expose the Worker on a route that bypasses Access. The Worker also verifies the JWT itself.

## Deploy

```
npm install
npm run typecheck && npm test
npx wrangler deploy
```

Put any future secrets in `wrangler secret put <NAME>`; never commit them. `wrangler.toml` only has placeholders such as `https://service-a.internal.example`.

## Security notes

- The upstream origin comes only from the env binding; the client cannot choose it.
- Paths containing `..`, `.`, `//`, `%2e`, `%2f`, `%5c`, `%00`, `%25`, backslashes or control characters are rejected with 400.
- Only an allowlist of request headers is forwarded (no Cookie, Authorization, Cf-Access-*, X-Forwarded-*). `Set-Cookie` is removed from responses.
- Redirects are never followed; `Location` is rewritten to the proxy path or removed if it points elsewhere.
- Tests (`npm test`) use a mocked fetch and a local RSA key pair; no network access is needed.
