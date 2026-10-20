# Test Report — Validate the reject path

- Workflow: `ai-dev-7de4622f0b30`
- Repository (logical): `phase0-demo`
- Module: `reject`
- Quality gate: **FAILED**
- Command: `node --test --test-reporter=tap fe/fe/test/reject-path.test.mjs qa/tests/reject-handler.test.mjs` (real execution, exit code 1, 78 ms)
- Runs: 3 (QA corrected its own tests between runs)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 4 | 17 | 2 |
| Integration | 10 | - | - |

Executed tests: 19, passed 17, failed 2.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | Missing Idempotency-Key header returns 400 | PASSED |
| TC-002 | Empty Idempotency-Key header returns 400 | PASSED |
| TC-003 | Request body with only comment field is accepted | PASSED |
| TC-004 | Malformed JSON body returns 400 | PASSED |
| TC-005 | PENDING approval can be rejected successfully | PASSED |
| TC-006 | APPROVED approval cannot be rejected (returns 409) | PASSED |
| TC-007 | REJECTED approval cannot be rejected again (returns 409) | PASSED |
| TC-008 | Duplicate idempotency key returns cached result | FAILED |
| TC-009 | Different idempotency keys are treated as separate requests | FAILED |
| TC-010 | Non-existent approval id returns 404 | PASSED |
| TC-011 | Invalid UUID format in path is handled gracefully | PASSED |
| TC-012 | Success response contains all required approval fields | PASSED |
| TC-013 | Error responses have consistent shape | PASSED |
| TC-014 | Response Content-Type is application/json | PASSED |

## Issues for the engineers

- [BOTH] Test "[TC-008] Duplicate idempotency key returns cached result" failed: Cached result should use original comment, not new one + actual - expected  + 'Different comment' - 'First rejection'
- [BOTH] Test "[TC-009] Different idempotency keys are treated as separate requests" failed: Different idempotency key should process request, not return cache  200 !== 409

## Raw output (tail)

```text
  duration_ms: 1.972061
  type: 'suite'
  location: '/tmp/qa-run-otj177/qa/tests/reject-handler.test.mjs:292:1'
  failureType: 'subtestsFailed'
  error: '2 subtests failed'
  code: 'ERR_TEST_FAILURE'
  ...
# Subtest: TS-004: Error handling
    # Subtest: [TC-010] Non-existent approval id returns 404
    ok 1 - [TC-010] Non-existent approval id returns 404
      ---
      duration_ms: 0.157963
      type: 'test'
      ...
    # Subtest: [TC-011] Invalid UUID format in path is handled gracefully
    ok 2 - [TC-011] Invalid UUID format in path is handled gracefully
      ---
      duration_ms: 0.083173
      type: 'test'
      ...
    1..2
ok 9 - TS-004: Error handling
  ---
  duration_ms: 0.304466
  type: 'suite'
  ...
# Subtest: TS-005: Response contract validation
    # Subtest: [TC-012] Success response contains all required approval fields
    ok 1 - [TC-012] Success response contains all required approval fields
      ---
      duration_ms: 0.114518
      type: 'test'
      ...
    # Subtest: [TC-013] Error responses have consistent shape
    ok 2 - [TC-013] Error responses have consistent shape
      ---
      duration_ms: 0.063656
      type: 'test'
      ...
    # Subtest: [TC-014] Response Content-Type is application/json
    ok 3 - [TC-014] Response Content-Type is application/json
      ---
      duration_ms: 0.055765
      type: 'test'
      ...
    1..3
ok 10 - TS-005: Response contract validation
  ---
  duration_ms: 0.332697
  type: 'suite'
  ...
1..10
# tests 19
# suites 5
# pass 17
# fail 2
# cancelled 0
# skipped 0
# todo 0
# duration_ms 52.125231
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).