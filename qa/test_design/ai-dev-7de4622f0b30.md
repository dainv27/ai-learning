# Test Design — Validate the reject path

- Workflow: `ai-dev-7de4622f0b30`
- Repository (logical): `phase0-demo`
- Module: `reject`

## Requirement under test

Validate the reject path

## Objective

Verify the reject path implementation meets all requirements: state machine validation (only PENDING→REJECTED transitions allowed), idempotency (duplicate keys return cached results), input validation (Idempotency-Key header required, comment field validated), error handling (404 for missing approvals, 409 for invalid state transitions, 400 for bad requests), and API contract alignment between backend and frontend (request body contains only 'comment', no approverId).

## Approach

Design unit tests for isolated functions (state transition logic, idempotency checks, input validation) and integration tests for the complete reject flow through the handler. Test the happy path (PENDING→REJECTED with valid inputs), boundary cases (empty/missing comment, missing headers), error paths (non-existent approval, already-approved/rejected approvals), and idempotency (duplicate keys). Import the delivered Node.js Lambda handler (be/be/reject-handler.mjs) and test against the actual exports. Every designed case receives at least one executable test with its case id in the title.

## Suite TS-001: Reject endpoint input validation (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | Missing Idempotency-Key header returns 400 | Reject endpoint must require Idempotency-Key header for idempotent mutations | HIGH | PASSED |
| TC-002 | Empty Idempotency-Key header returns 400 | Reject endpoint must validate that Idempotency-Key is not blank | HIGH | PASSED |
| TC-003 | Request body with only comment field is accepted | API contract: request body contains only 'comment' field, no approverId | HIGH | PASSED |
| TC-004 | Malformed JSON body returns 400 | Reject endpoint must validate JSON syntax | MEDIUM | PASSED |

### TC-001 — Missing Idempotency-Key header returns 400

1. Call reject handler with valid approval id and body but no Idempotency-Key header
2. Check response status code
3. Verify error body contains MISSING_IDEMPOTENCY_KEY code

**Expected:** Returns 400 with error object {code: 'MISSING_IDEMPOTENCY_KEY', message: descriptive text}

### TC-002 — Empty Idempotency-Key header returns 400

1. Call reject handler with Idempotency-Key set to empty string
2. Check response status code
3. Verify error response

**Expected:** Returns 400 with MISSING_IDEMPOTENCY_KEY error

### TC-003 — Request body with only comment field is accepted

1. Call reject handler with body containing only {comment: 'reason'}
2. Verify successful processing (state permitting)
3. Confirm no error about missing fields

**Expected:** Request is processed without validation errors about missing approverId

### TC-004 — Malformed JSON body returns 400

1. Call reject handler with invalid JSON in body
2. Check response status code
3. Verify error indicates JSON parsing failure

**Expected:** Returns 400 with appropriate error message

## Suite TS-002: State machine validation for reject transitions (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-005 | PENDING approval can be rejected successfully | Only PENDING approvals can transition to REJECTED state | HIGH | PASSED |
| TC-006 | APPROVED approval cannot be rejected (returns 409) | State machine prevents APPROVED→REJECTED transition | HIGH | PASSED |
| TC-007 | REJECTED approval cannot be rejected again (returns 409) | State machine prevents REJECTED→REJECTED transition (not idempotent retries, but new attempts) | HIGH | PASSED |

### TC-005 — PENDING approval can be rejected successfully

1. Set up mock approval with status PENDING
2. Call reject handler with valid inputs
3. Check response status is 200
4. Verify response body shows status REJECTED
5. Verify approverId and comment are populated

**Expected:** Returns 200 with approval object having status='REJECTED', approverId set, and comment set

### TC-006 — APPROVED approval cannot be rejected (returns 409)

1. Set up mock approval with status APPROVED
2. Attempt to reject it
3. Check response status code
4. Verify error body contains INVALID_STATE_TRANSITION code

**Expected:** Returns 409 with error explaining that only PENDING approvals can be rejected

### TC-007 — REJECTED approval cannot be rejected again (returns 409)

1. Set up mock approval with status REJECTED
2. Attempt to reject it with a different idempotency key
3. Check response status code
4. Verify error indicates invalid state transition

**Expected:** Returns 409 with INVALID_STATE_TRANSITION error

## Suite TS-003: Idempotency behavior (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-008 | Duplicate idempotency key returns cached result | Reject endpoint is idempotent: same key returns the same result without re-executing | HIGH | FAILED |
| TC-009 | Different idempotency keys are treated as separate requests | Each unique idempotency key represents a distinct operation | MEDIUM | FAILED |

### TC-008 — Duplicate idempotency key returns cached result

1. Reject a PENDING approval with idempotency key K1
2. Record the response
3. Call reject again with same key K1 but different comment
4. Compare responses

**Expected:** Second call returns the same approval object as the first (original comment, not new comment), status 200

### TC-009 — Different idempotency keys are treated as separate requests

1. Reject an approval with key K1
2. Attempt to reject the same approval with key K2
3. Verify second request is evaluated independently

**Expected:** Second request with different key returns 409 (approval already rejected) rather than cached result

## Suite TS-004: Error handling for missing resources (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-010 | Non-existent approval id returns 404 | Reject endpoint must return 404 when approval is not found | HIGH | PASSED |
| TC-011 | Invalid UUID format in path is handled gracefully | Reject endpoint validates path parameters | LOW | PASSED |

### TC-010 — Non-existent approval id returns 404

1. Call reject handler with a non-existent UUID
2. Check response status code
3. Verify error body contains APPROVAL_NOT_FOUND code

**Expected:** Returns 404 with error {code: 'APPROVAL_NOT_FOUND', message: includes the id}

### TC-011 — Invalid UUID format in path is handled gracefully

1. Call reject handler with malformed id (not a UUID)
2. Check response status code
3. Verify error response is appropriate

**Expected:** Returns 400 or 404 with error indicating invalid id format

## Suite TS-005: Response contract validation (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-012 | Success response contains all required approval fields | Reject endpoint returns complete approval object on success | HIGH | PASSED |
| TC-013 | Error responses have consistent shape | All error responses follow {error: {code, message}} shape per API design standard | MEDIUM | PASSED |
| TC-014 | Response Content-Type is application/json | Reject endpoint returns JSON with proper content-type header | LOW | PASSED |

### TC-012 — Success response contains all required approval fields

1. Successfully reject a PENDING approval
2. Parse response body
3. Check for presence of id, requesterId, description, status, approverId, comment, createdAt, updatedAt

**Expected:** Response body is valid JSON with all 8 fields present and correctly typed

### TC-013 — Error responses have consistent shape

1. Trigger each error condition (400, 404, 409)
2. Parse response bodies
3. Verify each has top-level 'error' object with 'code' and 'message' strings

**Expected:** Every error response has {error: {code: string, message: string}} structure

### TC-014 — Response Content-Type is application/json

1. Call reject handler (any scenario)
2. Check response headers
3. Verify Content-Type is application/json

**Expected:** Response headers include 'content-type': 'application/json' or 'application/json; charset=utf-8'

## Test suite files

- `qa/tests/reject-handler.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).