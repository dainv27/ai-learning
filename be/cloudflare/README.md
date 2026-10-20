# Internal proxy (Cloudflare Worker)

Allowlist-based reverse proxy placed in front of internal services. It is not a generic forwarder: the upstream origin comes only from `SERVICE_REGISTRY` (`src/config.ts`) plus env bindings, and must be `https`.

## Route format

```
https://<worker>/<service-key>/<path...>?<query>
Authorization: Bearer <token>
```

- `/__health` is unauthenticated and returns `{"status":"ok"}`.
- Registered keys: `orders` (`ORDERS_ORIGIN`), `users` (`USERS_ORIGIN`, GET/HEAD only). Add a service by adding an entry to `SERVICE_REGISTRY`, an origin binding to `Env`, and a var in `wrangler.toml`.
- Errors: 400 bad path, 401 auth, 404 unknown service, 405 method, 502 upstream failure or bad origin config, 503 `PROXY_API_KEYS` not configured, 504 upstream timeout. Bodies are generic JSON with `requestId`.

## Prerequisite: Cloudflare Tunnel

Workers cannot reach private IPs. Expose each internal service through a Cloudflare Tunnel public hostname (https), and put that hostname in the matching `*_ORIGIN` var. If the hostname is behind Cloudflare Access, create a service token and set the two Access secrets below.

## Secrets and vars

```
wrangler secret put PROXY_API_KEYS                  # comma-separated bearer tokens
wrangler secret put UPSTREAM_ACCESS_CLIENT_ID       # optional
wrangler secret put UPSTREAM_ACCESS_CLIENT_SECRET   # optional
```

Non-secret vars (`ORDERS_ORIGIN`, `USERS_ORIGIN`, `UPSTREAM_TIMEOUT_MS`, default 25000) live in `wrangler.toml` as placeholders; override them per environment. Never commit real hostnames or tokens.

## Develop, test, deploy

```
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest, mocked fetch, offline
npm run dev         # wrangler dev
npm run deploy      # wrangler deploy
```

## Behaviour notes

- Client `Authorization`, `Cookie`, `Host`, `CF-*`, `X-Forwarded-*` and hop-by-hop headers are not forwarded; `X-Forwarded-For` and `X-Request-Id` are added.
- Responses drop `Server`, `X-Powered-By`, `Via`, `Set-Cookie`, `X-Internal-*`, `X-Envoy-*` and `CF-*`.
- Redirects are not followed. A same-origin `Location` is rewritten to `/<service-key>/...`; any other `Location` is dropped.
- Bodies are streamed. The timeout applies until upstream response headers arrive.
