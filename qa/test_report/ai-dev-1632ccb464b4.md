# Test Report — Validate the approve path

- Workflow: `ai-dev-1632ccb464b4`
- Repository (logical): `phase0-demo`
- Module: `approve`
- Quality gate: **FAILED**
- Command: `node --test --test-reporter=tap qa/tests/backend-domain-tests.test.mjs qa/tests/backend-service-tests.test.mjs qa/tests/backend-api-tests.test.mjs qa/tests/frontend-api-client.test.mjs qa/tests/frontend-components.test.mjs` (real execution, exit code 1, 99 ms)
- Runs: 3 (QA corrected its own tests between runs)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 22 | 31 | 1 |
| Integration | 10 | - | - |

Executed tests: 32, passed 31, failed 1.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | Approval.approve transitions PENDING to APPROVED | PASSED |
| TC-002 | Approval.approve from APPROVED state throws IllegalStateException | PASSED |
| TC-003 | Approval.approve from REJECTED state throws IllegalStateException | PASSED |
| TC-004 | Approval.reject transitions PENDING to REJECTED | PASSED |
| TC-005 | Approval.reject from APPROVED state throws IllegalStateException | PASSED |
| TC-006 | Approval.reject from REJECTED state throws IllegalStateException | PASSED |
| TC-007 | ApprovalService.approve with Idempotency-Key first call saves result | PASSED |
| TC-008 | ApprovalService.approve with duplicate Idempotency-Key returns cached result | PASSED |
| TC-009 | ApprovalService.approve on already-approved throws IllegalStateException | PASSED |
| TC-010 | ApprovalService.reject with Idempotency-Key first call saves result | PASSED |
| TC-011 | ApprovalService.reject on already-rejected throws IllegalStateException | PASSED |
| TC-012 | ApprovalService.getApproval returns approval when found | PASSED |
| TC-013 | ApprovalService.getApproval throws when not found | PASSED |
| TC-014 | POST /api/approvals/{id}/approve with authentication returns 200 | PASSED |
| TC-015 | POST /api/approvals/{id}/approve without authentication returns 401 | PASSED |
| TC-016 | POST /api/approvals/{id}/approve on already-approved returns 409 | PASSED |
| TC-017 | POST /api/approvals/{id}/approve on non-existent approval returns 404 | PASSED |
| TC-018 | POST /api/approvals/{id}/approve with duplicate Idempotency-Key returns cached result | PASSED |
| TC-019 | POST /api/approvals/{id}/reject with authentication returns 200 | PASSED |
| TC-020 | POST /api/approvals/{id}/reject without authentication returns 401 | PASSED |
| TC-021 | POST /api/approvals/{id}/reject on already-rejected returns 409 | PASSED |
| TC-022 | GET /api/approvals/{id} returns approval when found | PASSED |
| TC-023 | GET /api/approvals/{id} returns 404 for non-existent approval | PASSED |
| TC-024 | approveRequest sends POST with only comment in body | PASSED |
| TC-025 | rejectRequest sends POST with only comment in body | PASSED |
| TC-026 | approveRequest sends Idempotency-Key as header | PASSED |
| TC-027 | generateIdempotencyKey produces unique keys | FAILED |
| TC-028 | generateIdempotencyKey includes action and id for determinism | PASSED |
| TC-029 | ApprovalActions component exists and exports correctly | PASSED |
| TC-030 | Approval detail page exists and exports correctly | PASSED |
| TC-031 | Approval list page exists and exports correctly | PASSED |
| TC-032 | Not-found page exists for missing approvals | PASSED |

## Issues for the engineers

- [BOTH] Test "[TC-027] generateIdempotencyKey produces unique keys" failed: (no message)

## Raw output (tail)

```text
        TestContext.<anonymous> (file:///tmp/qa-run-X9EO55/qa/tests/frontend-api-client.test.mjs:32:12)
        async Test.run (node:internal/test_runner/test:1054:7)
        async Suite.processPendingSubtests (node:internal/test_runner/test:744:7)
      ...
    # Subtest: [TC-028] generateIdempotencyKey includes action and id for determinism
    ok 5 - [TC-028] generateIdempotencyKey includes action and id for determinism
      ---
      duration_ms: 0.138704
      type: 'test'
      ...
    1..5
not ok 4 - Frontend API Client Tests
  ---
  duration_ms: 27.330287
  type: 'suite'
  location: '/tmp/qa-run-X9EO55/qa/tests/frontend-api-client.test.mjs:8:1'
  failureType: 'subtestsFailed'
  error: '1 subtest failed'
  code: 'ERR_TEST_FAILURE'
  ...
# Subtest: Frontend Components Tests
    # Subtest: [TC-029] ApprovalActions component exists and exports correctly
    ok 1 - [TC-029] ApprovalActions component exists and exports correctly
      ---
      duration_ms: 0.496764
      type: 'test'
      ...
    # Subtest: [TC-030] Approval detail page exists and exports correctly
    ok 2 - [TC-030] Approval detail page exists and exports correctly
      ---
      duration_ms: 0.204981
      type: 'test'
      ...
    # Subtest: [TC-031] Approval list page exists and exports correctly
    ok 3 - [TC-031] Approval list page exists and exports correctly
      ---
      duration_ms: 1.051548
      type: 'test'
      ...
    # Subtest: [TC-032] Not-found page exists for missing approvals
    ok 4 - [TC-032] Not-found page exists for missing approvals
      ---
      duration_ms: 0.220384
      type: 'test'
      ...
    1..4
ok 5 - Frontend Components Tests
  ---
  duration_ms: 2.631987
  type: 'suite'
  ...
1..5
# tests 32
# suites 5
# pass 31
# fail 1
# cancelled 0
# skipped 0
# todo 0
# duration_ms 72.24099
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).