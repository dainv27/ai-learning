# Test Design — Add a GET /health endpoint to the existing provinces Lambda handler that returns JSON {"status":"ok"} with HTTP 200. No UI.

- Workflow: `ai-dev-a70d4e21635c`
- Repository (logical): `vn-provinces-api`
- Module: `lambda`

## Requirement under test

Add a GET /health endpoint to the existing provinces Lambda handler that returns JSON {"status":"ok"} with HTTP 200. No UI.

## Objective

Verify that GET /health returns HTTP 200 with the JSON body {"status":"ok"}, that other methods on /health get 405 with an Allow header, that other paths are left to the existing routes, and that the module works without province data.

## Approach

The delivered module be/lambda/src/health.js is pure and AWS-free, so the tests call handleHealth(event) directly with realistic API Gateway HTTP API v2 events. They check status codes, exact body, headers, the 405 error shape, the null fall-through for other paths, and robustness against malformed events. The existing handler was not delivered, so the dispatch wiring cannot be tested here and is flagged to the reviewer.

## Suite TS-01: GET /health behavior (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | GET /health returns 200 with exact body {"status":"ok"} | GET /health returns JSON {"status":"ok"} with HTTP 200 | HIGH | PASSED |
| TC-002 | Response is JSON typed and body is a string with only the status key | Returns JSON {"status":"ok"} | HIGH | PASSED |
| TC-003 | Health works with a minimal event and a query string, independent of province data | The health response must not depend on province data and must always be {"status":"ok"} with 200 | MEDIUM | PASSED |

### TC-001 — GET /health returns 200 with exact body {"status":"ok"}

1. Build a v2 event with method GET and rawPath /health
2. Call handleHealth

**Expected:** statusCode is 200 and body is the string '{"status":"ok"}'

### TC-002 — Response is JSON typed and body is a string with only the status key

1. Call handleHealth for GET /health
2. Inspect the headers and parse the body

**Expected:** content-type is application/json; charset=utf-8, body is a string, and the parsed body deep-equals {status:'ok'} with no extra keys

### TC-003 — Health works with a minimal event and a query string, independent of province data

1. Call handleHealth with only rawPath and requestContext.http.method
2. Call it again with a rawQueryString and extra headers

**Expected:** Both calls return 200 with body {"status":"ok"}

## Suite TS-02: Method handling and route isolation (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-004 | Non-GET methods on /health return 405 with Allow: GET | Wrong method returns 405 with an Allow header | HIGH | PASSED |
| TC-005 | Other paths return null so existing routes are unaffected | Adding /health must not change the existing routes; the caller falls through to them | HIGH | PASSED |
| TC-006 | Malformed events do not throw | Error handling must not leak stack traces or crash the handler | MEDIUM | PASSED |

### TC-004 — Non-GET methods on /health return 405 with Allow: GET

1. Call handleHealth for POST, PUT, PATCH, DELETE and HEAD on /health

**Expected:** statusCode is 405, the allow header is GET, and the body is a JSON error object with a code and a message

### TC-005 — Other paths return null so existing routes are unaffected

1. Call handleHealth for /provinces, /healthz, / and /provinces/01 with GET and POST

**Expected:** Every call returns null

### TC-006 — Malformed events do not throw

1. Call handleHealth with undefined, null, {} and an event without requestContext

**Expected:** No exception is thrown and each call returns null

## Test suite files

- `qa/tests/health.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).