# Test Report — Validate the reject path

- Workflow: `ai-dev-7de4622f0b30`
- Repository (logical): `phase0-demo`
- Module: `reject`
- Quality gate: **PASSED**
- Command: `node --test --test-reporter=tap fe/fe/test/reject-path.test.mjs qa/tests/reject-handler.test.mjs` (real execution, exit code 0, 75 ms)
- Runs: 2 (QA corrected its own tests between runs)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 4 | 19 | 0 |
| Integration | 10 | - | - |

Executed tests: 19, passed 19, failed 0.

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
| TC-008 | Duplicate idempotency key returns cached result | PASSED |
| TC-009 | Different idempotency keys are treated as separate requests | PASSED |
| TC-010 | Non-existent approval id returns 404 | PASSED |
| TC-011 | Invalid UUID format in path is handled gracefully | PASSED |
| TC-012 | Success response contains all required approval fields | PASSED |
| TC-013 | Error responses have consistent shape | PASSED |
| TC-014 | Response Content-Type is application/json | PASSED |

## Raw output (tail)

```text
      ...
    1..2
ok 8 - TS-003: Idempotency behavior
  ---
  duration_ms: 1.465332
  type: 'suite'
  ...
# Subtest: TS-004: Error handling
    # Subtest: [TC-010] Non-existent approval id returns 404
    ok 1 - [TC-010] Non-existent approval id returns 404
      ---
      duration_ms: 0.160844
      type: 'test'
      ...
    # Subtest: [TC-011] Invalid UUID format in path is handled gracefully
    ok 2 - [TC-011] Invalid UUID format in path is handled gracefully
      ---
      duration_ms: 0.133866
      type: 'test'
      ...
    1..2
ok 9 - TS-004: Error handling
  ---
  duration_ms: 0.351813
  type: 'suite'
  ...
# Subtest: TS-005: Response contract validation
    # Subtest: [TC-012] Success response contains all required approval fields
    ok 1 - [TC-012] Success response contains all required approval fields
      ---
      duration_ms: 0.117403
      type: 'test'
      ...
    # Subtest: [TC-013] Error responses have consistent shape
    ok 2 - [TC-013] Error responses have consistent shape
      ---
      duration_ms: 0.06075
      type: 'test'
      ...
    # Subtest: [TC-014] Response Content-Type is application/json
    ok 3 - [TC-014] Response Content-Type is application/json
      ---
      duration_ms: 0.061527
      type: 'test'
      ...
    1..3
ok 10 - TS-005: Response contract validation
  ---
  duration_ms: 0.292216
  type: 'suite'
  ...
1..10
# tests 19
# suites 5
# pass 19
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 50.319204
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).