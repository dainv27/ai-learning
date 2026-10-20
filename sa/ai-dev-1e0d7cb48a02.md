# Architecture Design — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-1e0d7cb48a02`
- Repository (logical): `proxy`
- Module: `cloudflare`

## Requirement

Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

## Decision

Build the proxy in module cloudflare/ as a Cloudflare Worker in TypeScript (ES module `export default { fetch }`), deployed with Wrangler. It is an allowlist reverse proxy, not a generic forwarder. Route format: `/<service-key>/<path...>`. Request pipeline, in fixed order: (1) load and validate config, returning 503 if anything is missing; (2) authenticate; (3) normalize the path and match it against the allowlist; (4) build the upstream request; (5) forward with a timeout and return the response. Authentication uses a single mechanism: Cloudflare Access. The Worker verifies the `Cf-Access-Jwt-Assertion` JWT itself (RS256 via WebCrypto, JWKS fetched from `https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs` and cached in memory with a short TTL). It checks signature, `iss`, `aud` (ACCESS_AUD), `exp` and `nbf`. Access service tokens also yield this JWT, so machine clients are covered without a second mechanism. Routing uses a static, code-defined SERVICE_REGISTRY. Each service key maps to the NAME of an env binding that holds the internal origin URL (a Wrangler var, not hard-coded), plus the allowed HTTP methods and allowed path prefixes. The upstream origin is always taken from the binding, never from client input (no Host, URL or query parameter can choose the target). Upstream requests use `redirect: 'manual'`, an AbortSignal timeout (504 on timeout, 502 on connect failure), and generic error bodies that do not reveal origins. Headers use a forward allowlist. Pass only Content-Type, Accept, Accept-Encoding, Content-Length and a small set of custom headers. Drop Cookie, Authorization, Cf-Access-* and client-supplied X-Forwarded-*/X-Real-IP. Add X-Request-Id and X-Forwarded-Host. Strip Set-Cookie and any hop-by-hop headers from responses. Testing: vitest calling the exported handler directly, with a mocked global fetch and a locally generated RSA key pair standing in for the JWKS. Keep the code compact and avoid duplicated logic.

## Components

- cloudflare/src/index.ts (fetch handler, pipeline orchestration, error mapping)
- cloudflare/src/config.ts (Env type, SERVICE_REGISTRY, startup validation of bindings: https-only origins, no IP literals/localhost/private hosts)
- cloudflare/src/auth.ts (Cloudflare Access JWT verification, JWKS cache, fail-closed)
- cloudflare/src/router.ts (path decode/normalize, service-key lookup, method and prefix allowlist, upstream URL builder)
- cloudflare/src/headers.ts (request header allowlist, response header sanitizing)
- cloudflare/wrangler.toml (name, main, compatibility_date, [vars] for non-secret origins/ACCESS_TEAM_DOMAIN/ACCESS_AUD, no secrets committed)
- cloudflare/package.json, cloudflare/tsconfig.json, cloudflare/vitest.config.ts
- cloudflare/test/auth.test.ts, cloudflare/test/router.test.ts, cloudflare/test/proxy.test.ts
- cloudflare/README.md (deploy steps, binding list, Access setup)

## Constraints

- Authentication must run before any routing or upstream fetch, and the Worker must fail closed. If ACCESS_TEAM_DOMAIN, ACCESS_AUD or a required origin binding is missing or invalid, return 503 and never forward; there is no unauthenticated fallback.
- Reject with 401 any JWT that is missing, malformed, has a wrong alg (only RS256 accepted, never `none`/HS*), an unknown kid, a bad signature, wrong iss or aud, or is expired. Do this without calling upstream.
- SSRF/open-proxy protection: the upstream origin comes only from the registry/env binding. An unknown service key returns 404, and a disallowed method returns 405. The target URL must be built as origin + normalized path and its final hostname re-checked against the registry origin before fetch.
- Normalize the path before allowlist matching, and reject with 400 anything containing: `..` or `.` segments (including after percent-decoding), `%2e`, `%2f`, `%5c`, `%00`, backslash, control characters, double-encoding, or empty segments (`//`). Match against the allowed prefix on segment boundaries (`/api` must not match `/apix`).
- Do not forward Cookie, Authorization, Cf-Access-Jwt-Assertion, Cf-Access-* or client X-Forwarded-*/X-Real-IP headers to internal services. Do not return upstream Set-Cookie to the client. Use a header allowlist, not a denylist.
- Use `redirect: 'manual'`. Do not follow upstream redirects, and rewrite or block a Location header that points outside the proxy.
- Every upstream call has a timeout, and the Worker must not buffer entire bodies unnecessarily (stream request and response bodies). Error responses are generic JSON with no origin URL, stack trace or internal hostname.
- No secrets or real internal hostnames committed in wrangler.toml, tests or README; use placeholders such as `https://service-a.internal.example`. Secrets go through `wrangler secret`.
- Tests must cover: no/invalid/expired/wrong-aud JWT → 401; missing config → 503; unknown service → 404; bad method → 405; traversal and encoded-slash path cases → 400; header stripping; no redirect following; timeout → 504. Run them with no network and no production access: mock fetch and the JWKS, and do not call real Cloudflare or internal hosts.
- Keep source files compact and do not duplicate logic across files. Keep the deliverable output small enough to serialize as valid JSON (a prior BACKEND reply failed due to an oversized, truncated JSON response).

## Knowledge applied

- `ai-dev-a7ad2af1e762` Test 01
- `ai-dev-515e00e21f85` Test Task

> Written by Kiến (Architect) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).