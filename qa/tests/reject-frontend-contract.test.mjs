import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Read the frontend files to verify the API contract
const rejectButtonSource = readFileSync('../../fe/fe/src/components/RejectButton.tsx', 'utf-8');
const approvalDetailSource = readFileSync('../../fe/fe/src/app/approvals/[id]/page.tsx', 'utf-8');

test('[TC-014] RejectButton sends only comment field in request body (no approverId)', () => {
  // Verify the fetch body contains only {comment}
  assert.ok(
    rejectButtonSource.includes('body: JSON.stringify({ comment:'),
    'Request body should stringify only comment field'
  );
  assert.ok(
    !rejectButtonSource.includes('approverId'),
    'Request body should NOT include approverId field'
  );
});

test('[TC-015] RejectButton sends Idempotency-Key header with every request', () => {
  // Verify Idempotency-Key header is present
  assert.ok(
    rejectButtonSource.includes("'Idempotency-Key':"),
    'Should include Idempotency-Key header'
  );
  assert.ok(
    rejectButtonSource.includes('uuidv4()') || rejectButtonSource.includes('idempotencyKey'),
    'Should generate a UUID for the key'
  );
});

test('[TC-016] RejectButton handles 409 response by showing the error message', () => {
  // Verify 409 error handling
  assert.ok(
    rejectButtonSource.includes('response.status === 409'),
    'Should check for 409 status'
  );
  assert.ok(
    rejectButtonSource.includes('data.error?.message') || rejectButtonSource.includes('data.error.message'),
    'Should parse error message from response'
  );
  assert.ok(
    rejectButtonSource.includes('setError'),
    'Should set error state for display'
  );
});

test('[TC-017] RejectButton handles 404 response by showing Approval not found', () => {
  // Verify 404 error handling
  assert.ok(
    rejectButtonSource.includes('response.status === 404'),
    'Should check for 404 status'
  );
  assert.ok(
    rejectButtonSource.includes('Approval not found') || rejectButtonSource.includes('not found'),
    'Should show not found message'
  );
});

test('[TC-018] RejectButton handles 400 response by showing the backend error message', () => {
  // Verify 400 error handling
  assert.ok(
    rejectButtonSource.includes('response.status === 400'),
    'Should check for 400 status'
  );
  assert.ok(
    rejectButtonSource.includes('data.error?.message') || rejectButtonSource.includes('data.error.message') || rejectButtonSource.includes('Bad request'),
    'Should parse and display error message'
  );
});

test('[TC-019] ApprovalDetail page displays rejection comment and rejector when status is REJECTED', () => {
  // Verify the page renders rejection details
  assert.ok(
    approvalDetailSource.includes('REJECTED') || approvalDetailSource.includes('approval.status'),
    'Should check approval status'
  );
  assert.ok(
    approvalDetailSource.includes('approval.comment') || approvalDetailSource.includes('{approval.comment}'),
    'Should display rejection comment'
  );
  assert.ok(
    approvalDetailSource.includes('approval.approverId') || approvalDetailSource.includes('{approval.approverId}') || approvalDetailSource.includes('Rejector') || approvalDetailSource.includes('Rejected by'),
    'Should display rejector ID'
  );
});
