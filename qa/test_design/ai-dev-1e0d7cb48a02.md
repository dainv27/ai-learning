# Test Design — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-1e0d7cb48a02`
- Repository (logical): `proxy`
- Module: `cloudflare`

## Requirement under test

Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

## Objective

Verify that the Cloudflare Worker proxy only forwards authenticated, allowlisted requests to the internal services, and that it fails closed. Every architect constraint is covered: JWT verification, 503 on bad config, SSRF and path normalization, header stripping, no redirect following, timeout and error handling.

## Approach

The delivered TypeScript sources are transpiled at test time with node:module stripTypeScriptTypes into a temp directory (relative imports rewritten to .mjs) and then imported. Global fetch is stubbed to serve a local RSA-2048 JWKS and to record or mock upstream calls, so there is no network access. The tests call the exported worker.fetch end to end, and call route(), upstreamUrl(), verifyAccess() and responseHeaders() directly where the WHATWG URL parser would hide the case.

## Suite S1: Authentication (Cloudflare Access JWT) (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | Valid token is proxied to the origin from the binding | Valid authenticated requests are forwarded to the internal service | HIGH | NOT_IMPLEMENTED |
| TC-002 | Missing or malformed token gives 401 without calling upstream | JWT missing or malformed returns 401 | HIGH | NOT_IMPLEMENTED |
| TC-003 | Expired, wrong aud, wrong iss and future nbf return 401 | Reject wrong iss/aud and expired or not-yet-valid tokens | HIGH | NOT_IMPLEMENTED |
| TC-004 | Bad alg, unknown kid and tampered tokens return 401 | Only RS256 is accepted; unknown kid and bad signature are rejected | HIGH | NOT_IMPLEMENTED |
| TC-005 | JWKS fetch failure fails closed | Fail closed when the keys cannot be fetched | HIGH | NOT_IMPLEMENTED |
| TC-006 | aud as string or array is accepted and the JWKS is cached | aud may be a string or an array; the JWKS is cached in memory | MEDIUM | NOT_IMPLEMENTED |
| TC-014 | Authentication runs before routing | Authentication runs before any routing or upstream fetch | HIGH | NOT_IMPLEMENTED |

### TC-001 — Valid token is proxied to the origin from the binding

1. Sign a valid JWT
2. GET /service-a/api/users?x=1
3. GET /service-b/health

**Expected:** 200, upstream body returned, upstream URL is origin + path + query

### TC-002 — Missing or malformed token gives 401 without calling upstream

1. Send no token, '', 'abc', 'a.b', 'a.b.c'

**Expected:** 401 JSON error, no upstream call

### TC-003 — Expired, wrong aud, wrong iss and future nbf return 401

1. Sign tokens with bad claims
2. Call the proxy

**Expected:** 401, no upstream call

### TC-004 — Bad alg, unknown kid and tampered tokens return 401

1. alg none, alg HS256, unknown kid, empty signature
2. Modified signature, forged payload

**Expected:** 401, no upstream call

### TC-005 — JWKS fetch failure fails closed

1. Make every fetch throw
2. Send a valid token

**Expected:** 401, nothing forwarded

### TC-006 — aud as string or array is accepted and the JWKS is cached

1. Token with aud string
2. Token with aud array
3. Count JWKS fetches

**Expected:** Both 200; JWKS fetched once

### TC-014 — Authentication runs before routing

1. Send requests without a token to an unknown service, a bad path and a bad method

**Expected:** All return 401, not 404/400/405

## Suite S2: Configuration fail-closed (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-007 | Missing or invalid Access config returns 503 | Missing ACCESS_TEAM_DOMAIN, ACCESS_AUD or origin returns 503 and never forwards | HIGH | NOT_IMPLEMENTED |
| TC-008 | Unsafe origin bindings return 503 | Origins must be https and not an IP, localhost or credentialed URL | HIGH | NOT_IMPLEMENTED |
| TC-024 | wrangler.toml contains placeholders only | No secrets or real internal hostnames are committed | MEDIUM | NOT_IMPLEMENTED |

### TC-007 — Missing or invalid Access config returns 503

1. Remove or corrupt each setting
2. Call with a valid token and with no token

**Expected:** 503, no upstream call, even without a token

### TC-008 — Unsafe origin bindings return 503

1. Set http, IP, private IP, localhost, credentials, garbage or empty origins

**Expected:** 503, no upstream call

### TC-024 — wrangler.toml contains placeholders only

1. Read wrangler.toml
2. Check origin values and the absence of secret-like keys

**Expected:** Origins end in .internal.example and no secret keys are present

## Suite S3: Routing and path normalization (SSRF) (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-009 | Unknown service, root or non-allowed prefix returns 404 | An unknown service key returns 404 | HIGH | NOT_IMPLEMENTED |
| TC-010 | Disallowed method returns 405 with Allow | A disallowed method returns 405 | HIGH | NOT_IMPLEMENTED |
| TC-011 | route() rejects traversal, encoded and control characters with 400 | Reject .., ., %2e, %2f, %5c, %00, backslash, control characters, double-encoding and // with 400 | HIGH | NOT_IMPLEMENTED |
| TC-012 | End-to-end encoded-slash and empty-segment paths return 400 | Same rejection through the worker | HIGH | NOT_IMPLEMENTED |
| TC-013 | Prefix matching respects segment boundaries | /api must not match /apix | HIGH | NOT_IMPLEMENTED |
| TC-025 | Literal dot segments never reach an upstream outside the allowlist | Traversal must not escape the allowlisted prefix | HIGH | NOT_IMPLEMENTED |
| TC-020 | upstreamUrl re-checks the final host | The final hostname is re-checked against the registry origin | HIGH | NOT_IMPLEMENTED |
| TC-021 | Origin never comes from client input | No Host, URL or query parameter can choose the target | HIGH | NOT_IMPLEMENTED |

### TC-009 — Unknown service, root or non-allowed prefix returns 404

1. Call /unknown, /, /constructor, /__proto__, /service-a/other

**Expected:** 404, no upstream call

### TC-010 — Disallowed method returns 405 with Allow

1. DELETE service-a
2. POST service-b

**Expected:** 405 with an Allow header, no upstream call

### TC-011 — route() rejects traversal, encoded and control characters with 400

1. Call route() with each dangerous path

**Expected:** {ok:false,status:400}

### TC-012 — End-to-end encoded-slash and empty-segment paths return 400

1. Request %2f, %5c, %00, %252e and // paths

**Expected:** 400, no upstream call

### TC-013 — Prefix matching respects segment boundaries

1. route() on /api, /api/users/42, /apix, /api2/x

**Expected:** Exact and nested match; the others return 404

### TC-025 — Literal dot segments never reach an upstream outside the allowlist

1. Request /service-a/api/../x and /service-a/api/%2E%2e/x

**Expected:** 400 or 404, no upstream call

### TC-020 — upstreamUrl re-checks the final host

1. Build a URL normally
2. Build one with a path that changes the host

**Expected:** The normal URL is built; the host change throws

### TC-021 — Origin never comes from client input

1. Send a Host header, an X-Forwarded-Host header, a url= query and an @ in the path

**Expected:** The upstream host is always the registry origin

## Suite S4: Forwarding, headers, redirects and errors (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-015 | Sensitive request headers are stripped by allowlist | Do not forward Cookie, Authorization, Cf-Access-*, X-Forwarded-* or X-Real-IP | HIGH | NOT_IMPLEMENTED |
| TC-016 | Set-Cookie and hop-by-hop response headers are dropped | Do not return upstream Set-Cookie | HIGH | NOT_IMPLEMENTED |
| TC-017 | Redirects are not followed and Location is rewritten or blocked | redirect: manual; block a Location that points outside the proxy | HIGH | NOT_IMPLEMENTED |
| TC-018 | Upstream timeout returns 504 | Every upstream call has a timeout; timeout returns 504 | HIGH | NOT_IMPLEMENTED |
| TC-019 | Upstream connect failure returns 502 without leaking | 502 on connect failure with no origin or stack in the body | HIGH | NOT_IMPLEMENTED |
| TC-022 | Request body is streamed to upstream | Do not buffer entire bodies; stream request bodies | MEDIUM | NOT_IMPLEMENTED |
| TC-023 | Error responses are generic JSON | Error responses are generic JSON with no origin or stack | MEDIUM | NOT_IMPLEMENTED |

### TC-015 — Sensitive request headers are stripped by allowlist

1. Send those headers plus allowed ones
2. Inspect the upstream init

**Expected:** Sensitive headers are absent; content-type and accept are kept; x-request-id and x-forwarded-host are added; redirect is manual

### TC-016 — Set-Cookie and hop-by-hop response headers are dropped

1. Upstream returns set-cookie and an x-keep header
2. Call responseHeaders() with hop-by-hop headers

**Expected:** No set-cookie or hop-by-hop headers; safe headers are kept

### TC-017 — Redirects are not followed and Location is rewritten or blocked

1. Upstream 302 with an internal Location
2. Upstream 302 with an external Location

**Expected:** 302 is returned as is; internal Location rewritten under /service-a; external Location removed; one upstream call each

### TC-018 — Upstream timeout returns 504

1. Upstream waits for the abort signal

**Expected:** 504 generic JSON, and the call carries an abort signal

### TC-019 — Upstream connect failure returns 502 without leaking

1. Upstream throws an error that mentions the internal host

**Expected:** 502 JSON that does not contain the host or the error text

### TC-022 — Request body is streamed to upstream

1. POST a JSON body
2. Inspect init.body

**Expected:** init.body is a ReadableStream with the same content, method POST

### TC-023 — Error responses are generic JSON

1. Trigger 401, 503, 404, 405 and 400

**Expected:** JSON content-type, an error string, no internal host or stack

## Test suite files

- `qa/tests/proxy.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).