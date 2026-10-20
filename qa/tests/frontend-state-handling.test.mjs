import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read frontend ApprovalDetail component file content
const approvalDetailPath = join(__dirname, '../../fe/fe/app/approvals/[id]/ApprovalDetail.tsx');
const approvalDetailContent = readFileSync(approvalDetailPath, 'utf-8');

test('[TC-016] Frontend ApprovalDetail handles loading state', () => {
  // Verify actionState includes loading states
  assert.match(approvalDetailContent, /type ActionState = .*'approving'.*'rejecting'/, 
    'ActionState type must include approving and rejecting states');
  
  // Verify loading state is set during operations
  assert.match(approvalDetailContent, /setActionState\('approving'\)/, 
    'Component must set approving state');
  assert.match(approvalDetailContent, /setActionState\('rejecting'\)/, 
    'Component must set rejecting state');
  
  // Verify buttons are disabled during loading
  assert.match(approvalDetailContent, /const isLoading = actionState === 'approving' \|\| actionState === 'rejecting'/, 
    'Component must compute isLoading based on actionState');
  assert.match(approvalDetailContent, /disabled=\{(?:isLoading|!canTakeAction)/, 
    'Buttons must be disabled during loading');
});

test('[TC-017] Frontend ApprovalDetail handles success state', () => {
  // Verify success state is set after API call
  assert.match(approvalDetailContent, /setActionState\('success'\)/, 
    'Component must set success state after successful operation');
  
  // Verify approval state is updated with response
  assert.match(approvalDetailContent, /setApproval\(result\)/, 
    'Component must update approval state with API response');
  
  // Verify comment field is cleared after success
  assert.match(approvalDetailContent, /setComment\(''\)/, 
    'Component must clear comment field after success');
});

test('[TC-018] Frontend ApprovalDetail handles error state', () => {
  // Verify error state is set on catch
  assert.match(approvalDetailContent, /setActionState\('error'\)/, 
    'Component must set error state on API failure');
  
  // Verify error message is stored
  assert.match(approvalDetailContent, /setError\(err\.message\)/, 
    'Component must store error message');
  
  // Verify error state is checked and error content is displayed
  assert.match(approvalDetailContent, /actionState === 'error'/, 
    'Component must check for error state');
  assert.match(approvalDetailContent, /\{error\}/, 
    'Component must display error message content');
});

test('[TC-019] Frontend disables actions for non-pending approvals', () => {
  // Verify isPending check exists
  assert.match(approvalDetailContent, /const isPending = approval\.status === ApprovalStatus\.PENDING/, 
    'Component must compute isPending based on approval status');
  
  // Verify approve button exists with onClick handler
  assert.match(approvalDetailContent, /onClick=\{handleApprove\}/, 
    'Approve button must exist with handleApprove handler');
  
  // Verify reject button exists with onClick handler
  assert.match(approvalDetailContent, /onClick=\{handleReject\}/, 
    'Reject button must exist with handleReject handler');
  
  // Verify disabled condition - accept both explicit pattern and equivalent logic through canTakeAction
  const hasExplicitPattern = /disabled=\{!isPending\s*\|\|\s*isLoading\}/.test(approvalDetailContent);
  const hasEquivalentLogic = /const canTakeAction = isPending && !isLoading/.test(approvalDetailContent) && 
                             /disabled=\{!canTakeAction\}/.test(approvalDetailContent);
  
  assert.ok(hasExplicitPattern || hasEquivalentLogic, 
    'Buttons must be disabled when status is not PENDING or when loading (either explicit pattern or equivalent logic through canTakeAction)');
});
