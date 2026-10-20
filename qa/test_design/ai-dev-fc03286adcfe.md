# Test Design — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-fc03286adcfe`
- Repository (logical): `proxy`
- Module: `cloudflare`

## Requirement under test

Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

## Objective

Check that the Cloudflare Worker proxy meets the requirement and the architect's constraints. It must be a safe allowlist reverse proxy: no open proxy or SSRF, authentication that fails closed and runs before routing, no header leakage in either direction, redirects not followed, a 504 on timeout, generic errors with a request id, and streamed bodies.

## Approach

The delivered code is TypeScript, so the test file registers a small in-process ESM loader. It resolves extensionless relative imports to .ts and strips types with node:module stripTypeScriptTypes, which needs Node 22.13 or later. The modules are then tested directly (unit) and the Worker's default export is driven end to end (integration). The global fetch is replaced by an offline mock, so no network is used. Tests use only node:test and node:assert/strict. Assertions follow the requirement and the architect constraints, not incidental implementation details.

## Suite S-UNIT: Unit tests for router, auth, config and headers (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | Route parsing accepts safe paths and rejects unsafe ones | Path normalization must reject .., encoded traversal, double slashes and backslashes | HIGH | NOT_IMPLEMENTED |
| TC-002 | authenticate checks Bearer tokens and fails closed | Bearer auth against PROXY_API_KEYS, fail closed when the secret is not configured | HIGH | NOT_IMPLEMENTED |
| TC-003 | Registry lookup and https-only origin resolution | Upstream origin only from SERVICE_REGISTRY plus env; any non-https origin is refused | HIGH | NOT_IMPLEMENTED |
| TC-004 | Header filter functions remove client and internal headers | Filter headers in both directions | HIGH | NOT_IMPLEMENTED |

### TC-001 — Route parsing accepts safe paths and rejects unsafe ones

1. parseRoute('/orders/v1/items')
2. parseRoute with //, backslash, %2e%2e%2f, %5C, double-encoded and malformed percent paths

**Expected:** The safe path gives service 'orders' and path '/v1/items'; every unsafe path gives ok=false.

### TC-002 — authenticate checks Bearer tokens and fails closed

1. Call authenticate with a valid key, a wrong key, a prefix of a key, a longer key, a Basic scheme and no header
2. Call it with undefined, empty and blank key lists

**Expected:** Valid key gives 'ok'. Wrong, prefix, longer, Basic and missing give 'unauthorized'. An unset or empty key list gives 'unconfigured'.

### TC-003 — Registry lookup and https-only origin resolution

1. lookupService with orders, constructor, __proto__, toString
2. resolveOrigin with https, http, credentials, missing and garbage values

**Expected:** Only registered keys resolve. Only a clean https origin is returned; everything else gives null.

### TC-004 — Header filter functions remove client and internal headers

1. buildUpstreamHeaders with authorization, cookie, cf-*, x-forwarded-*, host and connection
2. buildClientHeaders with server, x-powered-by, set-cookie, x-internal-*, x-envoy-* and cf-*

**Expected:** Denied headers are removed, allowed headers are kept, and X-Request-Id is set in both directions.

## Suite S-INT: Worker end-to-end behaviour with a mocked upstream fetch (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-010 | Health check is unauthenticated and static | /__health returns a static body without auth | MEDIUM | NOT_IMPLEMENTED |
| TC-011 | Missing or invalid credentials give 401 and never reach upstream | Authentication is enforced before any upstream call | HIGH | NOT_IMPLEMENTED |
| TC-012 | Unconfigured PROXY_API_KEYS fails closed with 503 | 503 if PROXY_API_KEYS is unset | HIGH | NOT_IMPLEMENTED |
| TC-013 | Unknown service key is indistinguishable before auth | Authentication runs before routing details are revealed | HIGH | NOT_IMPLEMENTED |
| TC-014 | Authenticated unknown key returns 404 | Unknown key returns 404; the registry cannot be bypassed via prototype names | HIGH | NOT_IMPLEMENTED |
| TC-015 | Disallowed method gives 405 with Allow | Per-service allowed-methods list | HIGH | NOT_IMPLEMENTED |
| TC-016 | Path traversal variants are rejected | Reject .., encoded traversal, double slashes and backslashes with 400 | HIGH | NOT_IMPLEMENTED |
| TC-017 | Upstream host is never client-controlled (SSRF) | Never forward to a client-supplied host, scheme or port | HIGH | NOT_IMPLEMENTED |
| TC-018 | Non-https or missing origin is refused | Any origin that is not https must be refused | HIGH | NOT_IMPLEMENTED |
| TC-019 | Query string and encoded path are passed through unchanged | Query string is passed through unchanged | HIGH | NOT_IMPLEMENTED |
| TC-020 | Client request headers are stripped before upstream | Do not forward Authorization, Cookie, CF-*, X-Forwarded-* to upstream | HIGH | NOT_IMPLEMENTED |
| TC-021 | Internal response headers are stripped | Do not leak Set-Cookie, Server, X-Powered-By or internal headers to the client | HIGH | NOT_IMPLEMENTED |
| TC-022 | Redirects are not followed and Location does not leak internal hosts | redirect: manual; Location to an internal host must be rewritten or dropped | HIGH | NOT_IMPLEMENTED |
| TC-023 | Upstream timeout maps to 504 | Every upstream call has a timeout and returns 504 when it fires | HIGH | NOT_IMPLEMENTED |
| TC-024 | Upstream failure maps to generic 502 | Upstream failures map to 502 without internal details | HIGH | NOT_IMPLEMENTED |
| TC-025 | All error responses are generic JSON with a request id | Every error response is generic JSON containing a request id | HIGH | NOT_IMPLEMENTED |
| TC-026 | Same X-Request-Id goes upstream and back to the client | The same X-Request-Id must be sent upstream | MEDIUM | NOT_IMPLEMENTED |
| TC-027 | Request body is streamed to upstream | Bodies must be streamed, not buffered | HIGH | NOT_IMPLEMENTED |
| TC-028 | Response body is streamed to client | Bodies must be streamed, not buffered | HIGH | NOT_IMPLEMENTED |
| TC-029 | Cloudflare Access service-token headers are optional | Optional secrets sent as CF-Access-Client-Id and CF-Access-Client-Secret | MEDIUM | NOT_IMPLEMENTED |
| TC-030 | Allowed methods and bodies are forwarded; every configured key works | Reverse proxy for allowed methods, with comma-separated keys | MEDIUM | NOT_IMPLEMENTED |

### TC-010 — Health check is unauthenticated and static

1. GET /__health with no token

**Expected:** 200 with {status:'ok'} and no upstream call.

### TC-011 — Missing or invalid credentials give 401 and never reach upstream

1. Request with no token, a wrong token, a Basic scheme and an empty bearer

**Expected:** 401 for all, and fetch is never called.

### TC-012 — Unconfigured PROXY_API_KEYS fails closed with 503

1. Call with PROXY_API_KEYS undefined, empty and blank, with and without a token

**Expected:** 503 and no upstream call.

### TC-013 — Unknown service key is indistinguishable before auth

1. Unauthenticated request to an unknown key and to a known key
2. Unauthenticated request with a traversal path

**Expected:** Same 401 status and error code in every case, and no upstream call.

### TC-014 — Authenticated unknown key returns 404

1. Authenticated GET /nope/x, /constructor/x, /__proto__/x, /toString/x

**Expected:** 404 for each and no upstream call.

### TC-015 — Disallowed method gives 405 with Allow

1. POST /users/1
2. DELETE /users/1

**Expected:** 405 with an Allow header that contains GET and no upstream call.

### TC-016 — Path traversal variants are rejected

1. Request paths with %2e%2e%2f, //, %5C, double-encoded traversal, %2f%2f and malformed percent-encoding
2. Request /orders/%2e%2e/admin

**Expected:** 400 and no upstream call for the encoded variants; the collapsed form never reaches upstream.

### TC-017 — Upstream host is never client-controlled (SSRF)

1. Send paths that look like hosts, such as @evil.example.com, an absolute URL fragment and a port
2. Send a spoofed Host header

**Expected:** Any upstream call has origin https://orders.internal.example.com exactly.

### TC-018 — Non-https or missing origin is refused

1. ORDERS_ORIGIN set to http, to an https URL with credentials, to garbage, and unset

**Expected:** 502 and no upstream call.

### TC-019 — Query string and encoded path are passed through unchanged

1. GET /orders/a%20b/c?a=1&b=%20x&c=a+b&d=%2e%2e

**Expected:** Upstream URL is https://orders.internal.example.com/a%20b/c?a=1&b=%20x&c=a+b&d=%2e%2e.

### TC-020 — Client request headers are stripped before upstream

1. Send authorization, cookie, cf-ray, cf-connecting-ip, spoofed x-forwarded-for/host, x-real-ip, forwarded and connection headers
2. Send a spoofed X-Forwarded-For without cf-connecting-ip

**Expected:** None of the sensitive headers reach upstream. A spoofed X-Forwarded-For is never forwarded. Benign headers such as accept are kept.

### TC-021 — Internal response headers are stripped

1. Upstream returns server, x-powered-by, set-cookie, x-internal-*, x-envoy-*, cf-* and content-type

**Expected:** Only content-type and safe headers remain, and the body is passed through.

### TC-022 — Redirects are not followed and Location does not leak internal hosts

1. Upstream returns 302 with an internal same-origin Location
2. Upstream returns 302 with a different internal host
3. Inspect the fetch init

**Expected:** The 302 is returned to the client, fetch is called once with redirect 'manual', and no Location contains the internal host.

### TC-023 — Upstream timeout maps to 504

1. Upstream fetch never resolves until the abort signal fires, with UPSTREAM_TIMEOUT_MS=50

**Expected:** 504 with a generic JSON error and a request id.

### TC-024 — Upstream failure maps to generic 502

1. Upstream fetch throws an error that mentions an internal host, an IP and ECONNREFUSED

**Expected:** 502 whose body contains none of those details.

### TC-025 — All error responses are generic JSON with a request id

1. Trigger 400, 401, 404, 405, 502 and 503
2. Parse each body

**Expected:** Each is JSON with an error string and a requestId that equals the X-Request-Id header, and the body has no stack trace or upstream URL.

### TC-026 — Same X-Request-Id goes upstream and back to the client

1. Send a request with a spoofed x-request-id
2. Compare the upstream header with the response header

**Expected:** The spoofed value is not used, and the upstream and response ids are equal.

### TC-027 — Request body is streamed to upstream

1. POST a ReadableStream body to /orders/upload
2. Inspect the init.body given to fetch

**Expected:** init.body is a ReadableStream (not a string or buffer) and yields the full payload.

### TC-028 — Response body is streamed to client

1. Upstream returns a stream that stays open after the first chunk
2. Read the first chunk before the stream is closed
3. Then finish the stream

**Expected:** The Worker responds before the upstream finishes, and the first chunk arrives early. The full body is delivered intact.

### TC-029 — Cloudflare Access service-token headers are optional

1. Configure both secrets
2. Configure none
3. Configure only one

**Expected:** Both are sent when both are configured; none are sent otherwise.

### TC-030 — Allowed methods and bodies are forwarded; every configured key works

1. POST with a body to /orders
2. DELETE to /orders
3. Authenticate with the second configured key

**Expected:** Method and body reach upstream and the status is passed back. The second key is accepted.

## Suite S-REPO: Repository configuration hygiene (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-031 | wrangler.toml and package files are valid and contain no secrets | Valid compatibility_date, main = src/index.ts, no secrets or real hostnames in the repo, npm test script | MEDIUM | NOT_IMPLEMENTED |

### TC-031 — wrangler.toml and package files are valid and contain no secrets

1. Read wrangler.toml and package.json

**Expected:** compatibility_date is a valid date, main is src/index.ts, no secret values are assigned, and package.json has test and typecheck scripts.

## Test suite files

- `qa/tests/proxy.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).