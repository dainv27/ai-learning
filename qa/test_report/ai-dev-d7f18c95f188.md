# Test Report — Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

- Workflow: `ai-dev-d7f18c95f188`
- Repository (logical): `vn-provinces-api`
- Module: `lambda`
- Quality gate: **PASSED**
- Command: `node --test --test-reporter=tap be/lambda/test/normalize.test.js be/lambda/test/provinces.test.js be/lambda/test/handler.test.js qa/tests/provinces-data.test.mjs qa/tests/provinces-handler.test.mjs qa/tests/provinces-config.test.mjs` (real execution, exit code 0, 85 ms)
- Runs: 2 (QA corrected its own tests between runs)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 11 | 53 | 0 |
| Integration | 17 | - | - |

Executed tests: 53, passed 53, failed 0.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | Dataset has exactly 63 entries | PASSED |
| TC-002 | Codes and names are unique and non-empty | PASSED |
| TC-003 | Dataset matches the official pre-2025 list of 63 | PASSED |
| TC-004 | Dataset is sorted by code and frozen | PASSED |
| TC-005 | normalize strips diacritics including stacked marks | PASSED |
| TC-006 | normalize maps đ and Đ to d | PASSED |
| TC-007 | normalize is case-insensitive | PASSED |
| TC-008 | normalize trims and collapses whitespace | PASSED |
| TC-009 | Precomposed and decomposed forms normalize identically | PASSED |
| TC-010 | searchProvinces is a pure substring filter that does not mutate shared data | PASSED |
| TC-011 | GET without q returns all 63 | PASSED |
| TC-012 | Empty q or unrelated parameters return all 63 | PASSED |
| TC-013 | q='da nang' matches Đà Nẵng | PASSED |
| TC-014 | q='dong nai' matches Đồng Nai | PASSED |
| TC-015 | Search ignores case and accents in the query itself | PASSED |
| TC-016 | Partial match returns several results ordered by code | PASSED |
| TC-017 | No match returns 200 with an empty list | PASSED |
| TC-018 | q of exactly 100 characters is accepted | PASSED |
| TC-019 | q longer than 100 characters is rejected | PASSED |
| TC-020 | Repeated or non-string q is rejected | PASSED |
| TC-021 | Regex metacharacters in q are treated literally | PASSED |
| TC-022 | Unknown path returns 404 | PASSED |
| TC-023 | Non-GET method returns 405 with Allow: GET | PASSED |
| TC-024 | Unexpected failure returns a generic 500 and leaks nothing | PASSED |
| TC-025 | Every response has Content-Type and Cache-Control set deliberately | PASSED |
| TC-026 | Repeated invocations are stable and do not mutate shared state | PASSED |
| TC-027 | Error responses use the standard shape | PASSED |
| TC-028 | SAM template and package.json follow the architect constraints | PASSED |

## Raw output (tail)

```text
  duration_ms: 0.57825
  type: 'test'
  ...
# Subtest: [TC-020] repeated or non-string q returns 400
ok 46 - [TC-020] repeated or non-string q returns 400
  ---
  duration_ms: 0.393042
  type: 'test'
  ...
# Subtest: [TC-021] regex metacharacters in q are matched literally and never crash
ok 47 - [TC-021] regex metacharacters in q are matched literally and never crash
  ---
  duration_ms: 0.251209
  type: 'test'
  ...
# Subtest: [TC-022] unknown path returns 404
ok 48 - [TC-022] unknown path returns 404
  ---
  duration_ms: 0.077209
  type: 'test'
  ...
# Subtest: [TC-023] non-GET method returns 405 with Allow: GET
ok 49 - [TC-023] non-GET method returns 405 with Allow: GET
  ---
  duration_ms: 0.110625
  type: 'test'
  ...
# Subtest: [TC-024] unexpected failure returns a generic 500 and leaks nothing
ok 50 - [TC-024] unexpected failure returns a generic 500 and leaks nothing
  ---
  duration_ms: 0.340875
  type: 'test'
  ...
# Subtest: [TC-025] headers: JSON UTF-8 content type, cache policy per status
ok 51 - [TC-025] headers: JSON UTF-8 content type, cache policy per status
  ---
  duration_ms: 0.208708
  type: 'test'
  ...
# Subtest: [TC-026] repeated invocations are stable and do not mutate shared state
ok 52 - [TC-026] repeated invocations are stable and do not mutate shared state
  ---
  duration_ms: 0.173208
  type: 'test'
  ...
# Subtest: [TC-027] 400, 404 and 405 use the standard error shape
ok 53 - [TC-027] 400, 404 and 405 use the standard error shape
  ---
  duration_ms: 0.0805
  type: 'test'
  ...
1..53
# tests 53
# suites 0
# pass 53
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 54.429125
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).