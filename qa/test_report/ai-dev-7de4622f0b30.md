# Test Report — Validate the reject path

- Workflow: `ai-dev-7de4622f0b30`
- Repository (logical): `phase0-demo`
- Module: `reject`
- Quality gate: **FAILED**
- Command: `node --test` (real execution, exit code n/a, 0 ms)

## Results

| Suite | Designed cases | Passed | Failed |
|---|---|---|---|
| Unit | 6 | 0 | 0 |
| Integration | 13 | - | - |

Executed tests: 0, passed 0, failed 0.

## Case results

| Case | Title | Result |
|---|---|---|
| TC-001 | PENDING approval transitions to REJECTED when reject() is called | NOT_IMPLEMENTED |
| TC-002 | APPROVED approval throws InvalidStateTransitionException when reject() is called | NOT_IMPLEMENTED |
| TC-003 | REJECTED approval throws InvalidStateTransitionException when reject() is called again | NOT_IMPLEMENTED |
| TC-004 | Use case returns cached result when idempotency key was already used | NOT_IMPLEMENTED |
| TC-005 | Use case throws ApprovalNotFoundException when approval does not exist | NOT_IMPLEMENTED |
| TC-006 | Use case records idempotency key after successful reject | NOT_IMPLEMENTED |
| TC-007 | POST /api/approvals/{id}/reject with valid PENDING approval returns 200 and updated approval | NOT_IMPLEMENTED |
| TC-008 | POST /api/approvals/{id}/reject on APPROVED approval returns 409 | NOT_IMPLEMENTED |
| TC-009 | POST /api/approvals/{id}/reject on REJECTED approval returns 409 | NOT_IMPLEMENTED |
| TC-010 | POST /api/approvals/{id}/reject with non-existent ID returns 404 | NOT_IMPLEMENTED |
| TC-011 | POST /api/approvals/{id}/reject without Idempotency-Key header returns 400 | NOT_IMPLEMENTED |
| TC-012 | POST /api/approvals/{id}/reject with empty Idempotency-Key returns 400 | NOT_IMPLEMENTED |
| TC-013 | POST /api/approvals/{id}/reject with duplicate Idempotency-Key returns cached result with 200 | NOT_IMPLEMENTED |
| TC-014 | RejectButton sends only 'comment' field in request body (no approverId) | NOT_IMPLEMENTED |
| TC-015 | RejectButton sends Idempotency-Key header with every request | NOT_IMPLEMENTED |
| TC-016 | RejectButton handles 409 response by showing the error message | NOT_IMPLEMENTED |
| TC-017 | RejectButton handles 404 response by showing 'Approval not found' | NOT_IMPLEMENTED |
| TC-018 | RejectButton handles 400 response by showing the backend error message | NOT_IMPLEMENTED |
| TC-019 | ApprovalDetail page displays rejection comment and rejector when status is REJECTED | NOT_IMPLEMENTED |

## Issues for the engineers

- [BOTH] No Node.js source files (.js/.mjs/.cjs) were delivered; the QA runner can only execute Node.js tests, so this stack cannot be verified automatically.

## Raw output (tail)

```text
No Node.js source files (.js/.mjs/.cjs) were delivered; the QA runner can only execute Node.js tests, so this stack cannot be verified automatically.
```

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-4.5** (openrouter).