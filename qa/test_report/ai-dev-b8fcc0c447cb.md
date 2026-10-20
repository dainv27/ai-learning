# Test Report — Validate the stable demo approve path

- Workflow: `ai-dev-b8fcc0c447cb`
- Repository (logical): `phase0-demo`
- Module: `approve`
- Quality gate: **PASSED**
- Command: `node --test --test-reporter=tap qa/tests/approval-domain.test.mjs qa/tests/approval-service.test.mjs qa/tests/approval-controller.test.mjs qa/tests/frontend-actions.test.mjs` (real execution, exit code 0, 131 ms)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 27 | 45 | 0 |
| Integration | 18 | - | - |

Executed tests: 45, passed 45, failed 0.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | New approval request starts in PENDING state | PASSED |
| TC-002 | Approve transitions PENDING to APPROVED | PASSED |
| TC-003 | Reject transitions PENDING to REJECTED with required comment | PASSED |
| TC-004 | Cancel transitions PENDING to CANCELLED by requester only | PASSED |
| TC-005 | Non-requester cannot cancel | PASSED |
| TC-006 | APPROVED state is terminal - no further approve | PASSED |
| TC-007 | APPROVED state is terminal - no reject | PASSED |
| TC-008 | APPROVED state is terminal - no cancel | PASSED |
| TC-009 | REJECTED state is terminal - no approve | PASSED |
| TC-010 | CANCELLED state is terminal - no approve | PASSED |
| TC-011 | Approval requires non-blank reviewerId | PASSED |
| TC-012 | Rejection requires non-blank reviewerId | PASSED |
| TC-013 | Rejection requires non-blank comment | PASSED |
| TC-014 | Approval allows null comment | PASSED |
| TC-015 | Constructor rejects null requesterId | PASSED |
| TC-016 | Constructor rejects null resourceId | PASSED |
| TC-017 | Approve use case executes successfully | PASSED |
| TC-018 | Reject use case executes successfully | PASSED |
| TC-019 | Idempotent approve returns cached result | PASSED |
| TC-020 | Idempotent reject returns cached result | PASSED |
| TC-021 | Approve throws ApprovalNotFoundException for missing request | PASSED |
| TC-022 | Reject throws ApprovalNotFoundException for missing request | PASSED |
| TC-023 | Invalid state transition propagates from domain | PASSED |
| TC-024 | Command validation rejects null approvalRequestId | PASSED |
| TC-025 | Command validation rejects blank idempotencyKey | PASSED |
| TC-026 | RejectionCommand validation rejects blank comment | PASSED |
| TC-027 | POST /api/approvals/{id}/approve returns 200 on success | PASSED |
| TC-028 | POST /api/approvals/{id}/reject returns 200 on success | PASSED |
| TC-029 | Missing Idempotency-Key header returns 400 | PASSED |
| TC-030 | Non-existent approval ID returns 404 | PASSED |
| TC-031 | Invalid state transition returns 409 | PASSED |
| TC-032 | Missing reviewerId in request body returns 400 | PASSED |
| TC-033 | Missing comment in reject request returns 400 | PASSED |
| TC-034 | Idempotent request returns same result with wasIdempotent=true | PASSED |
| TC-035 | approveRequest action calls correct endpoint | PASSED |
| TC-036 | approveRequest includes Idempotency-Key header | PASSED |
| TC-037 | approveRequest returns success=true on 200 | PASSED |
| TC-038 | approveRequest handles 404 with descriptive error | PASSED |
| TC-039 | approveRequest handles 409 as state transition error | PASSED |
| TC-040 | rejectRequest action calls correct endpoint | PASSED |
| TC-041 | rejectRequest validates comment is not blank | PASSED |
| TC-042 | rejectRequest includes Idempotency-Key header | PASSED |
| TC-043 | rejectRequest handles 400 as validation error | PASSED |
| TC-044 | getApprovalRequests handles empty list | PASSED |
| TC-045 | getApprovalRequests handles fetch error gracefully | PASSED |

## Raw output (tail)

```text
  duration_ms: 0.183105
  type: 'test'
  ...
# Subtest: [TC-038] approveRequest handles 404 with descriptive error
ok 38 - [TC-038] approveRequest handles 404 with descriptive error
  ---
  duration_ms: 0.191433
  type: 'test'
  ...
# Subtest: [TC-039] approveRequest handles 409 as state transition error
ok 39 - [TC-039] approveRequest handles 409 as state transition error
  ---
  duration_ms: 0.191979
  type: 'test'
  ...
# Subtest: [TC-040] rejectRequest action calls correct endpoint
ok 40 - [TC-040] rejectRequest action calls correct endpoint
  ---
  duration_ms: 0.233679
  type: 'test'
  ...
# Subtest: [TC-041] rejectRequest validates comment is not blank
ok 41 - [TC-041] rejectRequest validates comment is not blank
  ---
  duration_ms: 0.199877
  type: 'test'
  ...
# Subtest: [TC-042] rejectRequest includes Idempotency-Key header
ok 42 - [TC-042] rejectRequest includes Idempotency-Key header
  ---
  duration_ms: 0.193407
  type: 'test'
  ...
# Subtest: [TC-043] rejectRequest handles 400 as validation error
ok 43 - [TC-043] rejectRequest handles 400 as validation error
  ---
  duration_ms: 0.361232
  type: 'test'
  ...
# Subtest: [TC-044] getApprovalRequests handles empty list
ok 44 - [TC-044] getApprovalRequests handles empty list
  ---
  duration_ms: 1.29237
  type: 'test'
  ...
# Subtest: [TC-045] getApprovalRequests handles fetch error gracefully
ok 45 - [TC-045] getApprovalRequests handles fetch error gracefully
  ---
  duration_ms: 1.045514
  type: 'test'
  ...
1..45
# tests 45
# suites 0
# pass 45
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 93.437092
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).