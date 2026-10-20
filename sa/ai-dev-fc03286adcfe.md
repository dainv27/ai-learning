# Architecture Design — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-fc03286adcfe`
- Repository (logical): `proxy`
- Module: `cloudflare`

## Requirement

Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

## Decision

Build the proxy as a Cloudflare Worker in TypeScript (ES module `export default { fetch }`), deployed with Wrangler from the `cloudflare/` module. It is an allowlist-based reverse proxy, not a generic forwarder. Clients call `https://<worker>/<service-key>/<path...>?<query>`. The Worker looks up `<service-key>` in a static registry in code (`SERVICE_REGISTRY`). The registry maps each key to the name of an env binding that holds the internal origin, for example `ORDERS_ORIGIN=https://orders.internal.example.com`. The client never supplies the host or scheme, and an unknown key returns 404. The Worker reaches private services through Cloudflare Tunnel public hostnames (https only), so no private IPs are called directly. Optional secrets `UPSTREAM_ACCESS_CLIENT_ID` and `UPSTREAM_ACCESS_CLIENT_SECRET` are sent as `CF-Access-Client-Id` and `CF-Access-Client-Secret` when the tunnel hostname sits behind Cloudflare Access. Request flow, in this order: (1) health check on `/__health`, which is unauthenticated and returns a static body; (2) authenticate via `Authorization: Bearer <token>`, compared in constant time against the secret `PROXY_API_KEYS` (comma-separated), returning 401 on a bad or missing token and 503 if the secret is not configured, so it fails closed; (3) resolve the route and reject path traversal (`..`, encoded `%2e%2e`, `//`, backslashes); (4) check the method against a per-service allowed-methods list, returning 405 otherwise; (5) build the upstream URL as origin + normalized path + original query, forwarding with `redirect: 'manual'` and streaming the request and response bodies without buffering; (6) filter headers in both directions, drop the client `Authorization`, `Cookie`, `Host`, `CF-*`, `X-Forwarded-*` and hop-by-hop headers, add `X-Forwarded-For` and `X-Request-Id`, and strip `Server`, `X-Powered-By` and internal headers from responses. Upstream failures map to 502, timeouts to 504 (AbortController, configurable `UPSTREAM_TIMEOUT_MS`, default 25000), and errors return a generic JSON body with the request id and no internal URLs or stack traces. Keep the code compact: a handful of small modules, with no JWT or JWKS code and no second auth mode, so that BACKEND's output stays small and valid.

## Components

- cloudflare/src/index.ts (Worker entry, fetch handler, request flow orchestration, error mapping)
- cloudflare/src/config.ts (SERVICE_REGISTRY, Env interface, per-service allowed methods, origin resolution and validation that origins are https)
- cloudflare/src/auth.ts (Bearer token extraction, constant-time comparison against PROXY_API_KEYS, fail-closed behavior)
- cloudflare/src/router.ts (parse /<service-key>/<path>, path normalization and traversal rejection)
- cloudflare/src/headers.ts (request and response header allow/deny filtering, X-Request-Id, X-Forwarded-For)
- cloudflare/src/proxy.ts (upstream fetch with timeout, redirect manual, streaming body passthrough, optional Access service-token headers)
- cloudflare/test/*.test.ts (vitest unit and integration tests with mocked upstream fetch)
- cloudflare/wrangler.toml (name, main, compatibility_date, non-secret vars as placeholders only)
- cloudflare/package.json and tsconfig.json (wrangler, typescript, vitest, @cloudflare/workers-types)
- cloudflare/README.md (secrets setup via `wrangler secret put`, Tunnel prerequisite, route format, deploy steps)

## Constraints

- Never forward to a client-supplied host, scheme or port: the upstream origin must come only from SERVICE_REGISTRY plus env bindings, and any origin that is not https must be refused. Otherwise the Worker becomes an open proxy or SSRF vector and QA's security tests fail.
- Authentication runs before any routing detail is revealed or any upstream call is made. Missing, invalid or unconfigured credentials must never reach upstream (401, or 503 if PROXY_API_KEYS is unset), and an unknown service key must not be distinguishable before auth passes.
- No secrets, tokens or real internal hostnames in the repo, wrangler.toml, tests or logs. Use placeholder values such as *.internal.example.com in code and docs, and set real values only via `wrangler secret put` or vars.
- Do not forward the client Authorization or Cookie headers, or any CF-* or X-Forwarded-* headers from the client, to upstream. Do not leak upstream Set-Cookie for internal domains, internal Server or X-Powered-By headers, or upstream error details to the client.
- Redirects from upstream must not be followed automatically (`redirect: 'manual'`), and a Location header pointing at an internal host must be rewritten or dropped so internal URLs do not leak.
- Path normalization must reject `..`, encoded traversal, double slashes and backslashes with 400, and the query string must be passed through unchanged.
- Bodies must be streamed, not buffered with arrayBuffer() or text(), to respect Worker memory and CPU limits. Every upstream call needs a timeout and returns 504 when it fires.
- Every error response must be generic JSON containing a request id (no stack traces or upstream URLs), and the same X-Request-Id must be sent upstream.
- Tests must run offline with a mocked global fetch and no real network, production or Cloudflare account access. Cover at least: unauthenticated request, fail-closed when the secret is unset, unknown service key, disallowed method, path traversal, header stripping in both directions, redirect not followed, timeout mapping to 504, and streamed body passthrough.
- `wrangler.toml` must keep a valid compatibility_date and `main = src/index.ts`, and `npm test` and `tsc --noEmit` must pass cleanly. Do not touch files outside cloudflare/ to avoid merge conflicts, and keep the total output compact.

## Knowledge applied

- `ai-dev-a7ad2af1e762` Test 01
- `ai-dev-515e00e21f85` Test Task

> Written by Kiến (Architect) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).