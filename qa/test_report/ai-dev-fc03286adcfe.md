# Test Report — Làm cho tôi proxy triển khải trên cloudflare worker, làm proxy trước khi vào các dịch vụ nội bộ

- Workflow: `ai-dev-fc03286adcfe`
- Repository (logical): `proxy`
- Module: `cloudflare`
- Quality gate: **FAILED**
- Command: `node --test` (real execution, exit code n/a, 0 ms)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 5 | 0 | 0 |
| Integration | 21 | - | - |

Executed tests: 0, passed 0, failed 0.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | Route parsing accepts safe paths and rejects unsafe ones | NOT_IMPLEMENTED |
| TC-002 | authenticate checks Bearer tokens and fails closed | NOT_IMPLEMENTED |
| TC-003 | Registry lookup and https-only origin resolution | NOT_IMPLEMENTED |
| TC-004 | Header filter functions remove client and internal headers | NOT_IMPLEMENTED |
| TC-010 | Health check is unauthenticated and static | NOT_IMPLEMENTED |
| TC-011 | Missing or invalid credentials give 401 and never reach upstream | NOT_IMPLEMENTED |
| TC-012 | Unconfigured PROXY_API_KEYS fails closed with 503 | NOT_IMPLEMENTED |
| TC-013 | Unknown service key is indistinguishable before auth | NOT_IMPLEMENTED |
| TC-014 | Authenticated unknown key returns 404 | NOT_IMPLEMENTED |
| TC-015 | Disallowed method gives 405 with Allow | NOT_IMPLEMENTED |
| TC-016 | Path traversal variants are rejected | NOT_IMPLEMENTED |
| TC-017 | Upstream host is never client-controlled (SSRF) | NOT_IMPLEMENTED |
| TC-018 | Non-https or missing origin is refused | NOT_IMPLEMENTED |
| TC-019 | Query string and encoded path are passed through unchanged | NOT_IMPLEMENTED |
| TC-020 | Client request headers are stripped before upstream | NOT_IMPLEMENTED |
| TC-021 | Internal response headers are stripped | NOT_IMPLEMENTED |
| TC-022 | Redirects are not followed and Location does not leak internal hosts | NOT_IMPLEMENTED |
| TC-023 | Upstream timeout maps to 504 | NOT_IMPLEMENTED |
| TC-024 | Upstream failure maps to generic 502 | NOT_IMPLEMENTED |
| TC-025 | All error responses are generic JSON with a request id | NOT_IMPLEMENTED |
| TC-026 | Same X-Request-Id goes upstream and back to the client | NOT_IMPLEMENTED |
| TC-027 | Request body is streamed to upstream | NOT_IMPLEMENTED |
| TC-028 | Response body is streamed to client | NOT_IMPLEMENTED |
| TC-029 | Cloudflare Access service-token headers are optional | NOT_IMPLEMENTED |
| TC-030 | Allowed methods and bodies are forwarded; every configured key works | NOT_IMPLEMENTED |
| TC-031 | wrangler.toml and package files are valid and contain no secrets | NOT_IMPLEMENTED |

## Issues for the engineers

- [BOTH] No Node.js source files (.js/.mjs/.cjs) were delivered; the QA runner can only execute Node.js tests, so this stack cannot be verified automatically.

## Raw output (tail)

```text
No Node.js source files (.js/.mjs/.cjs) were delivered; the QA runner can only execute Node.js tests, so this stack cannot be verified automatically.
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).