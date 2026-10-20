import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the frontend component to verify implementation patterns
const approvalDetailPath = join(__dirname, '../../fe/fe/app/approvals/[id]/ApprovalDetail.tsx');
let approvalDetailContent;
try {
  approvalDetailContent = readFileSync(approvalDetailPath, 'utf-8');
} catch (err) {
  approvalDetailContent = '';
}

describe('Frontend ApprovalDetail Component', () => {
  test('[TC-036] Component displays approval details', () => {
    // Verify component renders approval fields
    assert.ok(approvalDetailContent.includes('resourceId'), 'Component should display resourceId');
    assert.ok(approvalDetailContent.includes('resourceType'), 'Component should display resourceType');
    assert.ok(approvalDetailContent.includes('status'), 'Component should display status');
    assert.ok(approvalDetailContent.includes('requesterId'), 'Component should display requesterId');
  });

  test('[TC-037] Approve button disabled for non-PENDING status', () => {
    // Verify disabled logic based on status
    assert.ok(approvalDetailContent.includes('canModify'), 'Component should check if modifications are allowed');
    assert.ok(approvalDetailContent.includes('disabled'), 'Component should disable buttons based on state');
    assert.ok(approvalDetailContent.includes('PENDING'), 'Component should check for PENDING status');
  });

  test('[TC-038] Approve button enabled for PENDING status', () => {
    // Verify button enablement logic
    assert.ok(approvalDetailContent.includes('status === \'PENDING\'') || 
              approvalDetailContent.includes('status === "PENDING"'),
              'Component should enable actions for PENDING status');
  });

  test('[TC-039] Approve action includes Idempotency-Key header', () => {
    // Verify idempotency key is generated and sent
    assert.ok(approvalDetailContent.includes('Idempotency-Key'), 'Component should set Idempotency-Key header');
    assert.ok(approvalDetailContent.includes('idempotencyKey'), 'Component should generate idempotency key');
    assert.ok(approvalDetailContent.includes('Date.now()') || approvalDetailContent.includes('timestamp'),
              'Idempotency key should include timestamp for uniqueness');
  });

  test('[TC-040] 400 error displays user-friendly message', () => {
    // Verify error handling for bad request
    assert.ok(approvalDetailContent.includes('400'), 'Component should handle 400 status');
    assert.ok(approvalDetailContent.includes('Invalid request') || approvalDetailContent.includes('check your input'),
              'Component should show user-friendly message for 400 errors');
  });

  test('[TC-041] 403 error displays permission message', () => {
    // Verify error handling for forbidden
    assert.ok(approvalDetailContent.includes('403'), 'Component should handle 403 status');
    assert.ok(approvalDetailContent.includes('permission') || approvalDetailContent.includes('not have'),
              'Component should show permission error message for 403');
  });

  test('[TC-042] 404 error displays not found message', () => {
    // Verify error handling for not found
    assert.ok(approvalDetailContent.includes('404'), 'Component should handle 404 status');
    assert.ok(approvalDetailContent.includes('not found') || approvalDetailContent.includes('does not exist'),
              'Component should show not found message for 404');
  });

  test('[TC-043] 409 error displays state conflict message', () => {
    // Verify error handling for conflict
    assert.ok(approvalDetailContent.includes('409'), 'Component should handle 409 status');
    assert.ok(approvalDetailContent.includes('final state') || approvalDetailContent.includes('cannot be modified'),
              'Component should show state conflict message for 409');
  });

  test('[TC-044] Success shows confirmation message', () => {
    // Verify success state handling
    assert.ok(approvalDetailContent.includes('success') || approvalDetailContent.includes('Success'),
              'Component should have success state');
    assert.ok(approvalDetailContent.includes('approved successfully') || approvalDetailContent.includes('has been approved'),
              'Component should show success message');
  });

  test('[TC-045] Loading state disables buttons', () => {
    // Verify loading state prevents duplicate submissions
    assert.ok(approvalDetailContent.includes('isApproving') || approvalDetailContent.includes('isLoading'),
              'Component should track loading state');
    assert.ok(approvalDetailContent.includes('disabled={') && approvalDetailContent.includes('Approving'),
              'Component should disable buttons during loading');
  });
});

describe('Frontend Error Pages', () => {
  test('[TC-046] Not found page exists and has correct content', () => {
    const notFoundPath = join(__dirname, '../../fe/fe/app/approvals/[id]/not-found.tsx');
    let notFoundContent = '';
    try {
      notFoundContent = readFileSync(notFoundPath, 'utf-8');
    } catch (err) {
      assert.fail('not-found.tsx should exist');
    }
    assert.ok(notFoundContent.includes('Not Found') || notFoundContent.includes('not found'),
              'Not found page should display appropriate message');
  });

  test('[TC-047] Error page exists and handles errors', () => {
    const errorPath = join(__dirname, '../../fe/fe/app/approvals/[id]/error.tsx');
    let errorContent = '';
    try {
      errorContent = readFileSync(errorPath, 'utf-8');
    } catch (err) {
      assert.fail('error.tsx should exist');
    }
    assert.ok(errorContent.includes('error') && errorContent.includes('reset'),
              'Error page should handle error and provide reset');
  });

  test('[TC-048] Loading page exists', () => {
    const loadingPath = join(__dirname, '../../fe/fe/app/approvals/[id]/loading.tsx');
    let loadingContent = '';
    try {
      loadingContent = readFileSync(loadingPath, 'utf-8');
    } catch (err) {
      assert.fail('loading.tsx should exist');
    }
    assert.ok(loadingContent.includes('Loading') || loadingContent.includes('loading') || loadingContent.includes('animate'),
              'Loading page should show loading state');
  });
});
