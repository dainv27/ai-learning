# Test Design — Validate the reject path

- Workflow: `ai-dev-7de4622f0b30`
- Repository (logical): `phase0-demo`
- Module: `reject`

## Requirement under test

Validate the reject path

## Objective

Validate the reject path implementation (POST /api/approvals/{id}/reject) against the requirement: state transitions (only PENDING -> REJECTED allowed), idempotency via Idempotency-Key header, input validation, error handling for all documented status codes, and the integration between backend and frontend matching the exact API contract.

## Approach

Design unit tests for the domain model's reject() method to verify state machine rules in isolation. Design integration tests for the complete reject flow: happy path (PENDING -> REJECTED with 200), invalid state transitions (APPROVED/REJECTED -> 409), missing approval (404), missing/invalid Idempotency-Key (400), and idempotency replay (duplicate key returns cached result). Since the delivered code is Java Spring Boot (not Node.js), the tests will verify the implementation contract by examining the source code structure and logic; actual execution will simulate the behavior based on the delivered Java code's visible signatures and patterns.

## Suite TS-UNIT-001: Domain Model Reject Validation (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | PENDING approval transitions to REJECTED when reject() is called | State machine: PENDING -> REJECTED is valid | HIGH | NOT_IMPLEMENTED |
| TC-002 | APPROVED approval throws InvalidStateTransitionException when reject() is called | State machine: APPROVED -> REJECTED is invalid | HIGH | NOT_IMPLEMENTED |
| TC-003 | REJECTED approval throws InvalidStateTransitionException when reject() is called again | State machine: REJECTED -> REJECTED is invalid (no double-reject) | HIGH | NOT_IMPLEMENTED |

### TC-001 — PENDING approval transitions to REJECTED when reject() is called

1. Create an Approval with status PENDING
2. Call reject(userId, comment)
3. Check status becomes REJECTED
4. Check approverId is set to userId
5. Check comment is set
6. Check updatedAt is updated

**Expected:** Status is REJECTED, approverId and comment are populated, updatedAt is recent

### TC-002 — APPROVED approval throws InvalidStateTransitionException when reject() is called

1. Create an Approval with status APPROVED
2. Call reject(userId, comment)
3. Catch the exception

**Expected:** InvalidStateTransitionException is thrown with message indicating only PENDING can be rejected

### TC-003 — REJECTED approval throws InvalidStateTransitionException when reject() is called again

1. Create an Approval with status REJECTED
2. Call reject(userId, comment)
3. Catch the exception

**Expected:** InvalidStateTransitionException is thrown with message indicating only PENDING can be rejected

## Suite TS-UNIT-002: RejectApprovalUseCase Logic (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-004 | Use case returns cached result when idempotency key was already used | Idempotency: duplicate Idempotency-Key returns cached approval without re-executing reject | HIGH | NOT_IMPLEMENTED |
| TC-005 | Use case throws ApprovalNotFoundException when approval does not exist | Error handling: missing approval -> 404 | HIGH | NOT_IMPLEMENTED |
| TC-006 | Use case records idempotency key after successful reject | Idempotency: the key is persisted after the reject succeeds | MEDIUM | NOT_IMPLEMENTED |

### TC-004 — Use case returns cached result when idempotency key was already used

1. Mock repository to return a cached approval for the idempotency key
2. Call execute(approvalId, userId, comment, idempotencyKey)
3. Verify the cached approval is returned
4. Verify the repository's save() and idempotencyService.recordKey() are NOT called

**Expected:** Cached approval is returned, no new rejection is executed

### TC-005 — Use case throws ApprovalNotFoundException when approval does not exist

1. Mock repository to return empty Optional for the approvalId
2. Call execute(approvalId, userId, comment, idempotencyKey)
3. Catch the exception

**Expected:** ApprovalNotFoundException is thrown with the approvalId in the message

### TC-006 — Use case records idempotency key after successful reject

1. Mock repository to return a PENDING approval
2. Call execute(approvalId, userId, comment, idempotencyKey)
3. Verify idempotencyService.recordKey(idempotencyKey, approvalId) was called

**Expected:** Idempotency key is recorded with the approval ID

## Suite TS-INTEGRATION-001: RejectController HTTP Contract (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-007 | POST /api/approvals/{id}/reject with valid PENDING approval returns 200 and updated approval | Happy path: PENDING -> REJECTED with 200 OK response | HIGH | NOT_IMPLEMENTED |
| TC-008 | POST /api/approvals/{id}/reject on APPROVED approval returns 409 | Invalid state transition: APPROVED -> REJECTED returns 409 Conflict | HIGH | NOT_IMPLEMENTED |
| TC-009 | POST /api/approvals/{id}/reject on REJECTED approval returns 409 | Invalid state transition: REJECTED -> REJECTED returns 409 Conflict | HIGH | NOT_IMPLEMENTED |
| TC-010 | POST /api/approvals/{id}/reject with non-existent ID returns 404 | Missing approval: returns 404 Not Found | HIGH | NOT_IMPLEMENTED |
| TC-011 | POST /api/approvals/{id}/reject without Idempotency-Key header returns 400 | Input validation: missing Idempotency-Key returns 400 Bad Request | HIGH | NOT_IMPLEMENTED |
| TC-012 | POST /api/approvals/{id}/reject with empty Idempotency-Key returns 400 | Input validation: blank Idempotency-Key is invalid | MEDIUM | NOT_IMPLEMENTED |
| TC-013 | POST /api/approvals/{id}/reject with duplicate Idempotency-Key returns cached result with 200 | Idempotency: replay with same key returns the same approval without re-executing | HIGH | NOT_IMPLEMENTED |

### TC-007 — POST /api/approvals/{id}/reject with valid PENDING approval returns 200 and updated approval

1. Send POST to /api/approvals/{validId}/reject with {comment: 'reason'} and Idempotency-Key header
2. Check response status is 200
3. Check response body has status='REJECTED', approverId is set, comment='reason'

**Expected:** 200 OK with ApprovalResponse showing REJECTED status

### TC-008 — POST /api/approvals/{id}/reject on APPROVED approval returns 409

1. Send POST to /api/approvals/{approvedId}/reject with valid body and Idempotency-Key
2. Check response status is 409
3. Check response body has error.code='INVALID_STATE_TRANSITION' and a descriptive message

**Expected:** 409 Conflict with error object

### TC-009 — POST /api/approvals/{id}/reject on REJECTED approval returns 409

1. Send POST to /api/approvals/{rejectedId}/reject with valid body and Idempotency-Key
2. Check response status is 409
3. Check response body has error.code='INVALID_STATE_TRANSITION'

**Expected:** 409 Conflict with error object

### TC-010 — POST /api/approvals/{id}/reject with non-existent ID returns 404

1. Send POST to /api/approvals/{randomUUID}/reject with valid body and Idempotency-Key
2. Check response status is 404
3. Check response body has error.code='APPROVAL_NOT_FOUND'

**Expected:** 404 Not Found with error object

### TC-011 — POST /api/approvals/{id}/reject without Idempotency-Key header returns 400

1. Send POST to /api/approvals/{validId}/reject with valid body but no Idempotency-Key header
2. Check response status is 400
3. Check response body has error.code='MISSING_IDEMPOTENCY_KEY'

**Expected:** 400 Bad Request with error object

### TC-012 — POST /api/approvals/{id}/reject with empty Idempotency-Key returns 400

1. Send POST with Idempotency-Key header set to empty string
2. Check response status is 400
3. Check error.code='MISSING_IDEMPOTENCY_KEY'

**Expected:** 400 Bad Request

### TC-013 — POST /api/approvals/{id}/reject with duplicate Idempotency-Key returns cached result with 200

1. Send POST to /api/approvals/{validId}/reject with a unique Idempotency-Key (first time)
2. Send POST to the same endpoint with the same Idempotency-Key (replay)
3. Check second response status is 200
4. Check second response body matches the first (same status, same approverId, same timestamp)

**Expected:** 200 OK with identical approval data

## Suite TS-INTEGRATION-002: Frontend-Backend API Contract (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-014 | RejectButton sends only 'comment' field in request body (no approverId) | API contract: frontend sends {comment} only, backend extracts approverId from authenticated user | HIGH | NOT_IMPLEMENTED |
| TC-015 | RejectButton sends Idempotency-Key header with every request | Idempotency: frontend generates and sends Idempotency-Key header | HIGH | NOT_IMPLEMENTED |
| TC-016 | RejectButton handles 409 response by showing the error message | Error handling: 409 conflict displays the backend error message | MEDIUM | NOT_IMPLEMENTED |
| TC-017 | RejectButton handles 404 response by showing 'Approval not found' | Error handling: 404 displays appropriate message | MEDIUM | NOT_IMPLEMENTED |
| TC-018 | RejectButton handles 400 response by showing the backend error message | Error handling: 400 bad request displays the error | MEDIUM | NOT_IMPLEMENTED |
| TC-019 | ApprovalDetail page displays rejection comment and rejector when status is REJECTED | UI: show rejection details for rejected approvals | LOW | NOT_IMPLEMENTED |

### TC-014 — RejectButton sends only 'comment' field in request body (no approverId)

1. Inspect the RejectButton component's fetch call
2. Verify the body is JSON.stringify({ comment: ... })
3. Verify no approverId field is present in the request

**Expected:** Request body contains only 'comment' field

### TC-015 — RejectButton sends Idempotency-Key header with every request

1. Inspect the RejectButton component's fetch call
2. Verify 'Idempotency-Key' header is set to a UUID

**Expected:** Idempotency-Key header is present and is a valid UUID

### TC-016 — RejectButton handles 409 response by showing the error message

1. Inspect the RejectButton component's response handling for status 409
2. Verify it parses data.error.message and sets error state

**Expected:** 409 response shows error message to user

### TC-017 — RejectButton handles 404 response by showing 'Approval not found'

1. Inspect the RejectButton component's response handling for status 404
2. Verify it sets error to 'Approval not found'

**Expected:** 404 response shows not found message

### TC-018 — RejectButton handles 400 response by showing the backend error message

1. Inspect the RejectButton component's response handling for status 400
2. Verify it parses data.error.message and sets error state

**Expected:** 400 response shows error message to user

### TC-019 — ApprovalDetail page displays rejection comment and rejector when status is REJECTED

1. Inspect the ApprovalDetail page rendering logic
2. Verify it displays approval.comment and approval.approverId when approval.status === 'REJECTED'

**Expected:** Rejection comment and rejector are visible for REJECTED approvals

## Test suite files

- `qa/tests/reject-domain-model.test.mjs`
- `qa/tests/reject-use-case.test.mjs`
- `qa/tests/reject-controller-contract.test.mjs`
- `qa/tests/reject-frontend-contract.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).