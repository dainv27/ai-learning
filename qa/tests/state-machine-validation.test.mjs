import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read backend state machine test file content
const stateMachineTestPath = join(__dirname, '../../be/src/test/java/com/phase0demo/approve/application/ApprovalServiceStateMachineTest.java');
const stateMachineTestContent = readFileSync(stateMachineTestPath, 'utf-8');

test('[TC-005] Backend test coverage for PENDING to APPROVED transition', () => {
  assert.match(stateMachineTestContent, /testValidTransition_PendingToApproved/, 
    'Test must exist for PENDING to APPROVED transition');
  assert.match(stateMachineTestContent, /createRequest\(ApprovalStatus\.PENDING\)/, 
    'Test must create PENDING request');
  assert.match(stateMachineTestContent, /assertEquals\(ApprovalStatus\.APPROVED,\s*result\.getStatus\(\)\)/, 
    'Test must assert status is APPROVED');
  assert.match(stateMachineTestContent, /assertEquals\("approver-001",\s*result\.getApproverId\(\)\)/, 
    'Test must assert approverId is set');
});

test('[TC-006] Backend test coverage for PENDING to REJECTED transition', () => {
  assert.match(stateMachineTestContent, /testValidTransition_PendingToRejected/, 
    'Test must exist for PENDING to REJECTED transition');
  assert.match(stateMachineTestContent, /createRequest\(ApprovalStatus\.PENDING\)/, 
    'Test must create PENDING request');
  assert.match(stateMachineTestContent, /assertEquals\(ApprovalStatus\.REJECTED,\s*result\.getStatus\(\)\)/, 
    'Test must assert status is REJECTED');
  assert.match(stateMachineTestContent, /assertEquals\("approver-002",\s*result\.getApproverId\(\)\)/, 
    'Test must assert approverId is set');
});

test('[TC-007] Backend test coverage for invalid APPROVED to APPROVED', () => {
  assert.match(stateMachineTestContent, /testInvalidTransition_ApprovedToApproved/, 
    'Test must exist for invalid APPROVED to APPROVED transition');
  assert.match(stateMachineTestContent, /createRequest\(ApprovalStatus\.APPROVED\)/, 
    'Test must create APPROVED request');
  assert.match(stateMachineTestContent, /assertThrows[\s\S]*?InvalidStateTransitionException/, 
    'Test must expect InvalidStateTransitionException');
  assert.match(stateMachineTestContent, /already approved/, 
    'Test must verify error message contains "already approved"');
});

test('[TC-008] Backend test coverage for invalid REJECTED to REJECTED', () => {
  assert.match(stateMachineTestContent, /testInvalidTransition_RejectedToRejected/, 
    'Test must exist for invalid REJECTED to REJECTED transition');
  assert.match(stateMachineTestContent, /createRequest\(ApprovalStatus\.REJECTED\)/, 
    'Test must create REJECTED request');
  assert.match(stateMachineTestContent, /assertThrows[\s\S]*?InvalidStateTransitionException/, 
    'Test must expect InvalidStateTransitionException');
  assert.match(stateMachineTestContent, /already rejected/, 
    'Test must verify error message contains "already rejected"');
});

test('[TC-009] Backend test coverage for invalid APPROVED to REJECTED', () => {
  assert.match(stateMachineTestContent, /testInvalidTransition_ApprovedToRejected/, 
    'Test must exist for invalid APPROVED to REJECTED transition');
  assert.match(stateMachineTestContent, /createRequest\(ApprovalStatus\.APPROVED\)/, 
    'Test must create APPROVED request');
  assert.match(stateMachineTestContent, /assertThrows[\s\S]*?InvalidStateTransitionException/, 
    'Test must expect InvalidStateTransitionException');
  assert.match(stateMachineTestContent, /approved/, 
    'Test must verify error message references approved state');
});

test('[TC-010] Backend test coverage for invalid REJECTED to APPROVED', () => {
  assert.match(stateMachineTestContent, /testInvalidTransition_RejectedToApproved/, 
    'Test must exist for invalid REJECTED to APPROVED transition');
  assert.match(stateMachineTestContent, /createRequest\(ApprovalStatus\.REJECTED\)/, 
    'Test must create REJECTED request');
  assert.match(stateMachineTestContent, /assertThrows[\s\S]*?InvalidStateTransitionException/, 
    'Test must expect InvalidStateTransitionException');
  assert.match(stateMachineTestContent, /rejected/, 
    'Test must verify error message references rejected state');
});
