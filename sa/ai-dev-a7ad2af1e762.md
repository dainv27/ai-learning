# Architecture Design — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-a7ad2af1e762`
- Repository (logical): `proxy`
- Module: `cloudflare`

## Requirement

Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

## Decision

Build a Cloudflare Worker in TypeScript using ES modules (export default { fetch }), deployed with Wrangler (wrangler.toml), as an allowlist-based reverse proxy. It is not a generic forwarder. Route format: /<service-key>/<path...>. The Worker resolves <service-key> in a static, code-defined SERVICE_REGISTRY. Each entry holds the origin URL read from env bindings (vars or secrets, never hardcoded), the allowed HTTP methods, an allowed path-prefix list, and a timeout. An unknown key, a disallowed method or a disallowed path returns 404/405/403 with a generic body, and no request is made. The upstream URL is built only from the registry origin plus a normalized path and query. The client never supplies host, scheme or port. Access control runs before any routing or upstream call and fails closed. Two supported checks: (1) Cloudflare Access service-token or JWT validation, by verifying the Cf-Access-Jwt-Assertion header against the team JWKS, with iss and aud taken from env; (2) a fallback shared-secret/API key header compared in constant time against a Worker secret. If neither is configured, the Worker returns 503 and does not proxy. Connectivity to private origins goes through Cloudflare Tunnel (cloudflared), with each internal service exposed on a private hostname (for example svc.internal.example.com), protected by Cloudflare Access. The Worker reaches it by fetch() to that hostname, and optionally adds a service-auth header (CF-Access-Client-Id/Secret) from secrets. The Worker never connects to raw private IPs. Header handling is allowlist-based in both directions. Inbound, the Worker strips Cookie, Authorization (the client's proxy credential), Cf-Access-*, X-Forwarded-* spoofing and hop-by-hop headers, then adds its own X-Request-Id and X-Forwarded-For from CF-Connecting-IP. Outbound, it strips Set-Cookie for other domains, Server, X-Powered-By and internal-only headers. The Worker follows redirects manually (redirect: 'manual') and rewrites or blocks Location headers pointing to internal hosts. Request body size is capped, upstream failures return 502/504 with no internal detail, and logs are structured and never contain secrets or tokens. Tests use Vitest with @cloudflare/vitest-pool-workers or a mocked fetch. They must cover routing, the allowlist, auth rejection, header stripping, SSRF attempts (encoded paths, '..', '//', '@', absolute URLs) and redirect handling. This module lives in the cloudflare/ directory of the proxy repo, so changes must stay isolated there to avoid merge conflicts.

## Components

- cloudflare/wrangler.toml (name, main, compatibility_date, vars for origins/Access config, secrets documented, no real values; separate [env.staging] and [env.production])
- cloudflare/src/index.ts (ES module entry: fetch handler, error boundary, orchestration)
- cloudflare/src/registry.ts (SERVICE_REGISTRY: key → {originEnvKey, allowedMethods, allowedPathPrefixes, timeoutMs})
- cloudflare/src/router.ts (parse /<service-key>/<path>, normalize and validate path, build upstream URL from the registry origin only)
- cloudflare/src/auth.ts (Cloudflare Access JWT verification via JWKS plus a constant-time shared-secret fallback, fail closed)
- cloudflare/src/headers.ts (inbound/outbound header allowlists, hop-by-hop removal, X-Request-Id and X-Forwarded-For injection, Location rewriting)
- cloudflare/src/proxy.ts (upstream fetch with AbortController timeout, redirect: 'manual', body size limit, error mapping to 502/504)
- cloudflare/src/types.ts (Env interface for bindings and secrets)
- cloudflare/test/*.test.ts (Vitest tests for router, auth, headers, proxy and SSRF cases)
- cloudflare/package.json, tsconfig.json, vitest.config.ts
- cloudflare/README.md (Tunnel and Access setup, secrets via wrangler secret put, deployment steps)

## Constraints

- Routing must be strictly allowlisted: only SERVICE_REGISTRY keys are reachable, and the upstream host, scheme and port always come from env-bound origins, never from request input (Host header, URL, query param or header). The tests must prove that absolute URLs, '@', '//', '..', encoded traversal (%2e%2e, %2f) and backslashes cannot change the target or escape the allowed prefixes.
- Auth is mandatory and fails closed: unauthenticated or invalid requests get 401/403 before any upstream fetch, and a missing auth config returns 503 and never proxies. Secrets must be compared in constant time.
- No secrets, tokens, real internal hostnames or IPs may be committed to wrangler.toml, source or tests. Use wrangler secrets and placeholder values, and add .dev.vars to .gitignore.
- The Worker cannot reach private IPs. Origins must be Cloudflare Tunnel or other publicly resolvable hostnames protected by Access. The design and README must not assume direct RFC1918 access.
- Client Cookie, Authorization and Cf-Access-* headers must not be forwarded upstream. Upstream Set-Cookie, Server and internal headers must not leak back. Redirects to non-registry hosts must not be followed or exposed.
- Error responses must be generic (no stack traces, origin URLs or internal hosts), and logs must not contain credentials.
- Scope all changes to the cloudflare/ module and do not modify other modules of the proxy repo (merge-conflict risk). Existing tests must still pass, and the new tests must run deterministically offline with no network calls and no production access, so QA can run them without regression.
- The previous attempt for this kind of task failed the QA gate with 1 failing integration test out of 14: every test listed in the test suite must pass locally with the configured test runner before delivery, and package.json must expose a working `test` script.

## Knowledge applied

- `ai-dev-515e00e21f85` Test Task

> Written by Kiến (Architect) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).