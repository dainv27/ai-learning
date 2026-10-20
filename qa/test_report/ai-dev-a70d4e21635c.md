# Test Report — Add a GET /health endpoint to the existing provinces Lambda handler that returns JSON {"status":"ok"} with HTTP 200. No UI.

- Workflow: `ai-dev-a70d4e21635c`
- Repository (logical): `vn-provinces-api`
- Module: `lambda`
- Quality gate: **FAILED**
- Command: `node --test --test-reporter=tap be/lambda/test/health.test.js be/lambda/test/handler.health.test.js qa/tests/health.test.mjs` (real execution, exit code 1, 69 ms)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 6 | 20 | 1 |
| Integration | 0 | - | - |

Executed tests: 21, passed 20, failed 1.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | GET /health returns 200 with exact body {"status":"ok"} | PASSED |
| TC-002 | Response is JSON typed and body is a string with only the status key | PASSED |
| TC-003 | Health works with a minimal event and a query string, independent of province data | PASSED |
| TC-004 | Non-GET methods on /health return 405 with Allow: GET | PASSED |
| TC-005 | Other paths return null so existing routes are unaffected | PASSED |
| TC-006 | Malformed events do not throw | PASSED |

## Issues for the engineers

- [BACKEND] [TC-001] GET /health is not reachable through the Lambda handler. lambda/src/handler.js was not delivered or modified, so `handleHealth` from lambda/src/health.js is never invoked. As a result, lambda/test/handler.health.test.js fails at import and the requirement (GET /health returns 200 {"status":"ok"} from the existing provinces handler) is not met. In lambda/src/handler.js, add `import { handleHealth } from './health.js';` and, at the top of the handler before the existing method/path rejection and 404 fallback, `const healthRes = handleHealth(event); if (healthRes) return healthRes;`. Make sure handler.js exports a named `handler`, or adjust the test import to the real export. Existing /provinces routes and their 404/405 behavior must stay unchanged.

## Raw output (tail)

```text
  duration_ms: 0.08775
  type: 'test'
  ...
# Subtest: [TC-003] health ignores query string and extra headers
ok 14 - [TC-003] health ignores query string and extra headers
  ---
  duration_ms: 0.068375
  type: 'test'
  ...
# Subtest: [TC-004] POST /health returns 405 with Allow: GET
ok 15 - [TC-004] POST /health returns 405 with Allow: GET
  ---
  duration_ms: 0.203625
  type: 'test'
  ...
# Subtest: [TC-004] PUT /health returns 405 with Allow: GET
ok 16 - [TC-004] PUT /health returns 405 with Allow: GET
  ---
  duration_ms: 0.055917
  type: 'test'
  ...
# Subtest: [TC-004] PATCH /health returns 405 with Allow: GET
ok 17 - [TC-004] PATCH /health returns 405 with Allow: GET
  ---
  duration_ms: 0.095
  type: 'test'
  ...
# Subtest: [TC-004] DELETE /health returns 405 with Allow: GET
ok 18 - [TC-004] DELETE /health returns 405 with Allow: GET
  ---
  duration_ms: 0.053958
  type: 'test'
  ...
# Subtest: [TC-004] HEAD /health returns 405 with Allow: GET
ok 19 - [TC-004] HEAD /health returns 405 with Allow: GET
  ---
  duration_ms: 0.296708
  type: 'test'
  ...
# Subtest: [TC-005] other paths return null so existing routes are unaffected
ok 20 - [TC-005] other paths return null so existing routes are unaffected
  ---
  duration_ms: 0.364125
  type: 'test'
  ...
# Subtest: [TC-006] malformed events do not throw and return null
ok 21 - [TC-006] malformed events do not throw and return null
  ---
  duration_ms: 0.160875
  type: 'test'
  ...
1..21
# tests 21
# suites 0
# pass 20
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 44.138625
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).