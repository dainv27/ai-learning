# Test Design — Validate the stable demo approve path

- Workflow: `ai-dev-b8fcc0c447cb`
- Repository (logical): `phase0-demo`
- Module: `approve`

## Requirement under test

Validate the stable demo approve path

## Objective

Validate the stable demo approval path by verifying server-side approval logic, state transitions, error handling, idempotency controls, and frontend UI interactions against the delivered implementation.

## Approach

Design unit tests for domain state machine logic (ApprovalRequest state transitions), integration tests for service layer with repository interactions and idempotency handling, and component tests for frontend approval actions. Cover happy paths (approve/reject from PENDING), input validation (null/blank fields, missing idempotency keys), edge cases (terminal states, duplicate operations), error handling (not found, invalid transitions), and idempotency scenarios (same key reuse, cached results). Tests import the delivered Java classes and TypeScript modules to verify actual behavior matches requirements.

## Suite TS-DOMAIN: Domain State Machine Validation (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | New approval request starts in PENDING state | Approval requests must be created in PENDING state with valid requester and resource IDs | HIGH | PASSED |
| TC-002 | Approve transitions PENDING to APPROVED | Approving a PENDING request must transition to APPROVED and record reviewer | HIGH | PASSED |
| TC-003 | Reject transitions PENDING to REJECTED with required comment | Rejecting a PENDING request must transition to REJECTED and require a comment | HIGH | PASSED |
| TC-004 | Cancel transitions PENDING to CANCELLED by requester only | Only the original requester can cancel a PENDING request | HIGH | PASSED |
| TC-005 | Non-requester cannot cancel | Cancel operation must reject if initiator is not the original requester | HIGH | PASSED |
| TC-006 | APPROVED state is terminal - no further approve | State transitions from terminal states must be rejected | HIGH | PASSED |
| TC-007 | APPROVED state is terminal - no reject | Cannot transition from APPROVED to REJECTED | HIGH | PASSED |
| TC-008 | APPROVED state is terminal - no cancel | Cannot transition from APPROVED to CANCELLED | HIGH | PASSED |
| TC-009 | REJECTED state is terminal - no approve | Cannot transition from REJECTED to APPROVED | HIGH | PASSED |
| TC-010 | CANCELLED state is terminal - no approve | Cannot transition from CANCELLED to APPROVED | HIGH | PASSED |
| TC-011 | Approval requires non-blank reviewerId | Input validation: reviewerId is mandatory for approval | MEDIUM | PASSED |
| TC-012 | Rejection requires non-blank reviewerId | Input validation: reviewerId is mandatory for rejection | MEDIUM | PASSED |
| TC-013 | Rejection requires non-blank comment | Input validation: comment is mandatory for rejection | MEDIUM | PASSED |
| TC-014 | Approval allows null comment | Comment is optional for approval | LOW | PASSED |
| TC-015 | Constructor rejects null requesterId | Input validation: requesterId is mandatory at creation | MEDIUM | PASSED |
| TC-016 | Constructor rejects null resourceId | Input validation: resourceId is mandatory at creation | MEDIUM | PASSED |

### TC-001 — New approval request starts in PENDING state

1. Create ApprovalRequest with valid UUID, requesterId, and resourceId
2. Assert status is PENDING
3. Assert reviewerId and reviewComment are null

**Expected:** Request created with PENDING status, no reviewer assigned

### TC-002 — Approve transitions PENDING to APPROVED

1. Create PENDING request
2. Call approve with reviewerId and optional comment
3. Assert status is APPROVED
4. Assert reviewerId is set

**Expected:** Status APPROVED, reviewerId recorded

### TC-003 — Reject transitions PENDING to REJECTED with required comment

1. Create PENDING request
2. Call reject with reviewerId and comment
3. Assert status is REJECTED
4. Assert reviewComment is set

**Expected:** Status REJECTED, comment recorded

### TC-004 — Cancel transitions PENDING to CANCELLED by requester only

1. Create PENDING request with requesterId 'user-123'
2. Call cancel with 'user-123'
3. Assert status is CANCELLED

**Expected:** Status CANCELLED when cancelled by requester

### TC-005 — Non-requester cannot cancel

1. Create PENDING request with requesterId 'user-123'
2. Call cancel with 'other-user'
3. Assert IllegalStateException is thrown

**Expected:** IllegalStateException: only requester can cancel

### TC-006 — APPROVED state is terminal - no further approve

1. Create and approve a request
2. Attempt to approve again
3. Assert InvalidStateTransitionException is thrown

**Expected:** InvalidStateTransitionException for APPROVED->APPROVED

### TC-007 — APPROVED state is terminal - no reject

1. Create and approve a request
2. Attempt to reject
3. Assert InvalidStateTransitionException is thrown

**Expected:** InvalidStateTransitionException for APPROVED->REJECTED

### TC-008 — APPROVED state is terminal - no cancel

1. Create and approve a request
2. Attempt to cancel by requester
3. Assert InvalidStateTransitionException is thrown

**Expected:** InvalidStateTransitionException for APPROVED->CANCELLED

### TC-009 — REJECTED state is terminal - no approve

1. Create and reject a request
2. Attempt to approve
3. Assert InvalidStateTransitionException is thrown

**Expected:** InvalidStateTransitionException for REJECTED->APPROVED

### TC-010 — CANCELLED state is terminal - no approve

1. Create and cancel a request
2. Attempt to approve
3. Assert InvalidStateTransitionException is thrown

**Expected:** InvalidStateTransitionException for CANCELLED->APPROVED

### TC-011 — Approval requires non-blank reviewerId

1. Create PENDING request
2. Call approve with null reviewerId
3. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: reviewerId cannot be null or blank

### TC-012 — Rejection requires non-blank reviewerId

1. Create PENDING request
2. Call reject with null reviewerId
3. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: reviewerId cannot be null or blank

### TC-013 — Rejection requires non-blank comment

1. Create PENDING request
2. Call reject with valid reviewerId but null comment
3. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: comment is required

### TC-014 — Approval allows null comment

1. Create PENDING request
2. Call approve with null comment
3. Assert no exception and status is APPROVED

**Expected:** Approval succeeds with null comment

### TC-015 — Constructor rejects null requesterId

1. Attempt to create ApprovalRequest with null requesterId
2. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: requesterId cannot be null

### TC-016 — Constructor rejects null resourceId

1. Attempt to create ApprovalRequest with null resourceId
2. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: resourceId cannot be null

## Suite TS-SERVICE: Application Service with Idempotency (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-017 | Approve use case executes successfully | ApprovalService must process approve command, persist state, and record idempotency | HIGH | PASSED |
| TC-018 | Reject use case executes successfully | ApprovalService must process reject command, persist state, and record idempotency | HIGH | PASSED |
| TC-019 | Idempotent approve returns cached result | Reusing the same idempotency key must return cached result without re-executing | HIGH | PASSED |
| TC-020 | Idempotent reject returns cached result | Reusing the same idempotency key must return cached result for rejection | HIGH | PASSED |
| TC-021 | Approve throws ApprovalNotFoundException for missing request | Service must reject operations on non-existent approval requests | HIGH | PASSED |
| TC-022 | Reject throws ApprovalNotFoundException for missing request | Service must reject operations on non-existent approval requests | HIGH | PASSED |
| TC-023 | Invalid state transition propagates from domain | Service must propagate InvalidStateTransitionException from domain layer | HIGH | PASSED |
| TC-024 | Command validation rejects null approvalRequestId | ApprovalCommand must validate approvalRequestId is not null | MEDIUM | PASSED |
| TC-025 | Command validation rejects blank idempotencyKey | ApprovalCommand must validate idempotencyKey is not blank | HIGH | PASSED |
| TC-026 | RejectionCommand validation rejects blank comment | RejectionCommand must validate comment is not blank | MEDIUM | PASSED |

### TC-017 — Approve use case executes successfully

1. Create ApprovalRequest in repository as PENDING
2. Call ApprovalService.approve with valid command and idempotency key
3. Assert result status is APPROVED
4. Assert wasIdempotent is false

**Expected:** Approval succeeds, returns APPROVED status, wasIdempotent=false

### TC-018 — Reject use case executes successfully

1. Create ApprovalRequest in repository as PENDING
2. Call ApprovalService.reject with valid command and idempotency key
3. Assert result status is REJECTED
4. Assert wasIdempotent is false

**Expected:** Rejection succeeds, returns REJECTED status, wasIdempotent=false

### TC-019 — Idempotent approve returns cached result

1. Create ApprovalRequest in repository
2. Call approve with idempotency key 'key-001'
3. Call approve again with same key 'key-001'
4. Assert second call returns wasIdempotent=true
5. Assert status matches first call result

**Expected:** Second call returns cached result, wasIdempotent=true

### TC-020 — Idempotent reject returns cached result

1. Create ApprovalRequest in repository
2. Call reject with idempotency key 'key-002'
3. Call reject again with same key 'key-002'
4. Assert second call returns wasIdempotent=true

**Expected:** Second call returns cached result, wasIdempotent=true

### TC-021 — Approve throws ApprovalNotFoundException for missing request

1. Call approve with UUID that does not exist in repository
2. Assert ApprovalNotFoundException is thrown

**Expected:** ApprovalNotFoundException with descriptive message

### TC-022 — Reject throws ApprovalNotFoundException for missing request

1. Call reject with UUID that does not exist in repository
2. Assert ApprovalNotFoundException is thrown

**Expected:** ApprovalNotFoundException with descriptive message

### TC-023 — Invalid state transition propagates from domain

1. Create and approve a request in repository
2. Call approve again on already-approved request
3. Assert InvalidStateTransitionException is thrown

**Expected:** InvalidStateTransitionException with transition details

### TC-024 — Command validation rejects null approvalRequestId

1. Attempt to create ApprovalCommand with null approvalRequestId
2. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: approvalRequestId cannot be null

### TC-025 — Command validation rejects blank idempotencyKey

1. Attempt to create ApprovalCommand with blank idempotencyKey
2. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: idempotencyKey is required

### TC-026 — RejectionCommand validation rejects blank comment

1. Attempt to create RejectionCommand with blank comment
2. Assert IllegalArgumentException is thrown

**Expected:** IllegalArgumentException: comment is required

## Suite TS-CONTROLLER: REST Controller HTTP Layer (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-027 | POST /api/approvals/{id}/approve returns 200 on success | Approval endpoint must return 200 with response body on successful approval | HIGH | PASSED |
| TC-028 | POST /api/approvals/{id}/reject returns 200 on success | Rejection endpoint must return 200 with response body on successful rejection | HIGH | PASSED |
| TC-029 | Missing Idempotency-Key header returns 400 | Controller must enforce Idempotency-Key header presence | HIGH | PASSED |
| TC-030 | Non-existent approval ID returns 404 | Controller must return 404 for non-existent approval requests | HIGH | PASSED |
| TC-031 | Invalid state transition returns 409 | Controller must return 409 for invalid state transitions | HIGH | PASSED |
| TC-032 | Missing reviewerId in request body returns 400 | Controller must validate required fields in request body | MEDIUM | PASSED |
| TC-033 | Missing comment in reject request returns 400 | Controller must validate rejection comment is provided | MEDIUM | PASSED |
| TC-034 | Idempotent request returns same result with wasIdempotent=true | Controller must indicate idempotent operations in response | HIGH | PASSED |

### TC-027 — POST /api/approvals/{id}/approve returns 200 on success

1. Seed repository with PENDING request
2. POST to /api/approvals/{id}/approve with Idempotency-Key header
3. Assert response status 200
4. Assert response body contains approvalRequestId, status=APPROVED, wasIdempotent=false

**Expected:** HTTP 200 with JSON response containing approval result

### TC-028 — POST /api/approvals/{id}/reject returns 200 on success

1. Seed repository with PENDING request
2. POST to /api/approvals/{id}/reject with Idempotency-Key header and comment
3. Assert response status 200
4. Assert response body contains approvalRequestId, status=REJECTED, wasIdempotent=false

**Expected:** HTTP 200 with JSON response containing rejection result

### TC-029 — Missing Idempotency-Key header returns 400

1. POST to /api/approvals/{id}/approve without Idempotency-Key header
2. Assert response status 400
3. Assert error body contains code and message

**Expected:** HTTP 400 with error indicating missing idempotency key

### TC-030 — Non-existent approval ID returns 404

1. POST to /api/approvals/{random-uuid}/approve with valid headers
2. Assert response status 404
3. Assert error body code is APPROVAL_NOT_FOUND

**Expected:** HTTP 404 with APPROVAL_NOT_FOUND error

### TC-031 — Invalid state transition returns 409

1. Seed repository with APPROVED request
2. POST to /api/approvals/{id}/approve again
3. Assert response status 409
4. Assert error body code is INVALID_STATE_TRANSITION

**Expected:** HTTP 409 with INVALID_STATE_TRANSITION error

### TC-032 — Missing reviewerId in request body returns 400

1. POST to /api/approvals/{id}/approve with body missing reviewerId
2. Assert response status 400
3. Assert error body code is INVALID_INPUT

**Expected:** HTTP 400 with INVALID_INPUT error

### TC-033 — Missing comment in reject request returns 400

1. POST to /api/approvals/{id}/reject with body missing comment
2. Assert response status 400
3. Assert error body indicates comment is required

**Expected:** HTTP 400 with error about missing comment

### TC-034 — Idempotent request returns same result with wasIdempotent=true

1. POST to /api/approvals/{id}/approve with Idempotency-Key 'key-A'
2. POST again with same Idempotency-Key 'key-A'
3. Assert second response has wasIdempotent=true
4. Assert status matches first response

**Expected:** Second request returns cached result with wasIdempotent=true

## Suite TS-FRONTEND: Frontend Approval Actions (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-035 | approveRequest action calls correct endpoint | Frontend approve action must POST to /api/approval-requests/{id}/approve | HIGH | PASSED |
| TC-036 | approveRequest includes Idempotency-Key header | Frontend must include Idempotency-Key in all approval requests | HIGH | PASSED |
| TC-037 | approveRequest returns success=true on 200 | Frontend must parse successful approval response | HIGH | PASSED |
| TC-038 | approveRequest handles 404 with descriptive error | Frontend must handle 404 as approval not found | HIGH | PASSED |
| TC-039 | approveRequest handles 409 as state transition error | Frontend must handle 409 as invalid state transition | HIGH | PASSED |
| TC-040 | rejectRequest action calls correct endpoint | Frontend reject action must POST to /api/approval-requests/{id}/reject | HIGH | PASSED |
| TC-041 | rejectRequest validates comment is not blank | Frontend must validate rejection comment before sending request | HIGH | PASSED |
| TC-042 | rejectRequest includes Idempotency-Key header | Frontend must include Idempotency-Key in all rejection requests | HIGH | PASSED |
| TC-043 | rejectRequest handles 400 as validation error | Frontend must handle 400 as input validation failure | MEDIUM | PASSED |
| TC-044 | getApprovalRequests handles empty list | Frontend must handle empty approval request list | LOW | PASSED |
| TC-045 | getApprovalRequests handles fetch error gracefully | Frontend must not throw on network errors | MEDIUM | PASSED |

### TC-035 — approveRequest action calls correct endpoint

1. Import approveRequest from actions.ts
2. Mock fetch globally
3. Call approveRequest with requestId, reviewerId, comment
4. Assert fetch was called with correct URL and method POST

**Expected:** Fetch called with /api/approval-requests/{id}/approve, method POST

### TC-036 — approveRequest includes Idempotency-Key header

1. Mock fetch
2. Call approveRequest
3. Assert fetch headers include Idempotency-Key

**Expected:** Idempotency-Key header present in request

### TC-037 — approveRequest returns success=true on 200

1. Mock fetch to return 200 with {wasIdempotent: false}
2. Call approveRequest
3. Assert result.success is true
4. Assert result.wasIdempotent is false

**Expected:** ActionResult with success=true, wasIdempotent=false

### TC-038 — approveRequest handles 404 with descriptive error

1. Mock fetch to return 404
2. Call approveRequest
3. Assert result.success is false
4. Assert result.error is 'Approval request not found'

**Expected:** ActionResult with success=false, error about not found

### TC-039 — approveRequest handles 409 as state transition error

1. Mock fetch to return 409 with error body
2. Call approveRequest
3. Assert result.success is false
4. Assert result.error mentions state transition

**Expected:** ActionResult with success=false, error about invalid state

### TC-040 — rejectRequest action calls correct endpoint

1. Import rejectRequest from actions.ts
2. Mock fetch
3. Call rejectRequest with requestId, reviewerId, comment
4. Assert fetch called with correct URL and method POST

**Expected:** Fetch called with /api/approval-requests/{id}/reject, method POST

### TC-041 — rejectRequest validates comment is not blank

1. Call rejectRequest with blank comment
2. Assert result.success is false
3. Assert result.error mentions comment is required
4. Assert fetch was not called

**Expected:** Validation error, no network request made

### TC-042 — rejectRequest includes Idempotency-Key header

1. Mock fetch
2. Call rejectRequest
3. Assert fetch headers include Idempotency-Key

**Expected:** Idempotency-Key header present in request

### TC-043 — rejectRequest handles 400 as validation error

1. Mock fetch to return 400
2. Call rejectRequest
3. Assert result.success is false
4. Assert result.error mentions invalid request or required comment

**Expected:** ActionResult with success=false, validation error message

### TC-044 — getApprovalRequests handles empty list

1. Mock fetch to return 200 with []
2. Call getApprovalRequests
3. Assert result is empty array

**Expected:** Empty array returned

### TC-045 — getApprovalRequests handles fetch error gracefully

1. Mock fetch to reject with network error
2. Call getApprovalRequests
3. Assert result is empty array (not thrown error)

**Expected:** Returns empty array on error, no exception thrown

## Test suite files

- `qa/tests/approval-domain.test.mjs`
- `qa/tests/approval-service.test.mjs`
- `qa/tests/approval-controller.test.mjs`
- `qa/tests/frontend-actions.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).