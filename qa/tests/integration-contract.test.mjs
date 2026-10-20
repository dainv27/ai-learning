import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read backend integration test file content
const integrationTestPath = join(__dirname, '../../be/src/test/java/com/phase0demo/approve/integration/ApprovalPathValidationTest.java');
const integrationTestContent = readFileSync(integrationTestPath, 'utf-8');

// Read backend controller contract test file content
const controllerTestPath = join(__dirname, '../../be/src/test/java/com/phase0demo/approve/api/ApprovalControllerContractTest.java');
const controllerTestContent = readFileSync(controllerTestPath, 'utf-8');

test('[TC-011] Backend integration test extracts approverId from authentication', () => {
  // Verify test uses @WithMockUser annotation
  assert.match(integrationTestContent, /@WithMockUser\(username\s*=\s*"approver-100"\)/, 
    'Test must use @WithMockUser annotation to set authenticated user');
  
  // Verify test asserts approverId matches authenticated username
  assert.match(integrationTestContent, /\.andExpect\(jsonPath\("\$\.approverId"\)\.value\("approver-100"\)\)/, 
    'Test must assert approverId matches authenticated username');
  
  // Verify test constructs request body without approverId
  const approveTestMatch = integrationTestContent.match(/testApproveEndpoint_ApproverIdFromAuth[\s\S]*?mockMvc\.perform/m);
  assert.ok(approveTestMatch, 'testApproveEndpoint_ApproverIdFromAuth must exist');
  assert.match(approveTestMatch[0], /new ApprovalRequestBody\([^)]*\)/, 
    'Request body must use ApprovalRequestBody with only comment');
});

test('[TC-012] Backend integration test ignores approverId in request body', () => {
  // Verify test sends approverId in request body
  assert.match(controllerTestContent, /"approverId":"hacker-id"/, 
    'Test must send approverId in request body');
  
  // Verify test asserts response approverId matches authenticated user, not body value
  assert.match(controllerTestContent, /\.andExpect\(jsonPath\("\$\.approverId"\)\.value\("test-approver"\)\)/, 
    'Test must assert approverId matches authenticated user');
  
  // Verify test has assertion that approverId does not equal the body value
  // The test may use separate andExpect calls or Hamcrest matchers
  assert.match(controllerTestContent, /not\("hacker-id"\)/, 
    'Test must assert approverId does not match body value using Hamcrest not() matcher');
});

test('[TC-013] Backend integration test validates idempotency', () => {
  // Verify test exists for duplicate approve with same key
  assert.match(integrationTestContent, /testIdempotency_DuplicateApprove/, 
    'Test must exist for idempotency validation');
  
  // Verify test sends same request twice with identical Idempotency-Key
  const idempotencyTestMatch = integrationTestContent.match(/testIdempotency_DuplicateApprove[\s\S]*?String idempotencyKey = UUID/m);
  assert.ok(idempotencyTestMatch, 'Test must generate single idempotency key');
  
  // Verify test makes two requests with same key
  const firstRequestMatch = integrationTestContent.match(/testIdempotency_DuplicateApprove[\s\S]*?\/\/ First request/m);
  assert.ok(firstRequestMatch, 'Test must make first request');
  
  const secondRequestMatch = integrationTestContent.match(/testIdempotency_DuplicateApprove[\s\S]*?\/\/ Second request/m);
  assert.ok(secondRequestMatch, 'Test must make second request with same key');
});

test('[TC-014] Backend integration test validates input', () => {
  // Verify test exists for missing Idempotency-Key
  assert.match(integrationTestContent, /testInputValidation_MissingIdempotencyKey/, 
    'Test must exist for missing Idempotency-Key validation');
  
  // Verify test expects 400 status
  const missingKeyMatch = integrationTestContent.match(/testInputValidation_MissingIdempotencyKey[\s\S]{0,2000}\.andExpect\(status\(\)\.isBadRequest\(\)\)/m);
  assert.ok(missingKeyMatch, 'Test must assert 400 Bad Request for missing key');
  
  // Verify test validates error structure - look for jsonPath assertions on error fields
  // May be across multiple lines, so search in the test method body
  const testMethodBody = integrationTestContent.match(/testInputValidation_MissingIdempotencyKey[\s\S]{0,3000}?(?=@Test|void test|$)/m);
  assert.ok(testMethodBody, 'Test method body must exist');
  assert.match(testMethodBody[0], /jsonPath.*error/, 
    'Test must validate error field structure');
});

test('[TC-015] Backend integration test validates state transition errors', () => {
  // Verify test exists for invalid state transition
  assert.match(integrationTestContent, /testStateTransitionError_ApproveAlreadyApproved/, 
    'Test must exist for invalid state transition');
  
  // Verify test attempts to approve an already-approved request
  const stateErrorMatch = integrationTestContent.match(/testStateTransitionError_ApproveAlreadyApproved[\s\S]{0,2000}approvedRequest\.getId\(\)/m);
  assert.ok(stateErrorMatch, 'Test must use already-approved request');
  
  // Verify test expects error status code - look for any status() assertion
  const testMethodBody = integrationTestContent.match(/testStateTransitionError_ApproveAlreadyApproved[\s\S]{0,3000}?(?=@Test|void test|$)/m);
  assert.ok(testMethodBody, 'Test method body must exist');
  assert.match(testMethodBody[0], /\.andExpect\(status\(\)\.is[A-Z]/, 
    'Test must assert an error status code for invalid transition');
});
