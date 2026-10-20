# Test Report — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-1e0d7cb48a02`
- Repository (logical): `proxy`
- Module: `cloudflare`
- Quality gate: **FAILED**
- Command: `node --test` (real execution, exit code n/a, 0 ms)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 0 | 0 | 0 |
| Integration | 25 | - | - |

Executed tests: 0, passed 0, failed 0.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | Valid token is proxied to the origin from the binding | NOT_IMPLEMENTED |
| TC-002 | Missing or malformed token gives 401 without calling upstream | NOT_IMPLEMENTED |
| TC-003 | Expired, wrong aud, wrong iss and future nbf return 401 | NOT_IMPLEMENTED |
| TC-004 | Bad alg, unknown kid and tampered tokens return 401 | NOT_IMPLEMENTED |
| TC-005 | JWKS fetch failure fails closed | NOT_IMPLEMENTED |
| TC-006 | aud as string or array is accepted and the JWKS is cached | NOT_IMPLEMENTED |
| TC-014 | Authentication runs before routing | NOT_IMPLEMENTED |
| TC-007 | Missing or invalid Access config returns 503 | NOT_IMPLEMENTED |
| TC-008 | Unsafe origin bindings return 503 | NOT_IMPLEMENTED |
| TC-024 | wrangler.toml contains placeholders only | NOT_IMPLEMENTED |
| TC-009 | Unknown service, root or non-allowed prefix returns 404 | NOT_IMPLEMENTED |
| TC-010 | Disallowed method returns 405 with Allow | NOT_IMPLEMENTED |
| TC-011 | route() rejects traversal, encoded and control characters with 400 | NOT_IMPLEMENTED |
| TC-012 | End-to-end encoded-slash and empty-segment paths return 400 | NOT_IMPLEMENTED |
| TC-013 | Prefix matching respects segment boundaries | NOT_IMPLEMENTED |
| TC-025 | Literal dot segments never reach an upstream outside the allowlist | NOT_IMPLEMENTED |
| TC-020 | upstreamUrl re-checks the final host | NOT_IMPLEMENTED |
| TC-021 | Origin never comes from client input | NOT_IMPLEMENTED |
| TC-015 | Sensitive request headers are stripped by allowlist | NOT_IMPLEMENTED |
| TC-016 | Set-Cookie and hop-by-hop response headers are dropped | NOT_IMPLEMENTED |
| TC-017 | Redirects are not followed and Location is rewritten or blocked | NOT_IMPLEMENTED |
| TC-018 | Upstream timeout returns 504 | NOT_IMPLEMENTED |
| TC-019 | Upstream connect failure returns 502 without leaking | NOT_IMPLEMENTED |
| TC-022 | Request body is streamed to upstream | NOT_IMPLEMENTED |
| TC-023 | Error responses are generic JSON | NOT_IMPLEMENTED |

## Issues for the engineers

- [BOTH] No Node.js source files (.js/.mjs/.cjs) were delivered; the QA runner can only execute Node.js tests, so this stack cannot be verified automatically.

## Raw output (tail)

```text
No Node.js source files (.js/.mjs/.cjs) were delivered; the QA runner can only execute Node.js tests, so this stack cannot be verified automatically.
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).