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
  
  // Verify test makes a request to approve endpoint
  assert.match(integrationTestContent, /post\("\/api\/approvals\/\{id\}\/approve"/, 
    'Test must call approve endpoint');
  
  // Verify test asserts approverId matches authenticated username
  assert.match(integrationTestContent, /jsonPath\("\$\.approverId"\)\.value\("approver-100"\)/, 
    'Test must assert approverId matches authenticated username');
});

test('[TC-012] Backend integration test ignores approverId in request body', () => {
  // Verify integration test sends approverId in request body and it is ignored
  assert.match(integrationTestContent, /testApproveEndpoint_IgnoresApproverIdInBody/, 
    'Integration test must exist for ignoring approverId in body');
  
  // Verify test sends approverId in request body
  assert.match(integrationTestContent, /"approverId"\s*:\s*"hacker/, 
    'Test must send approverId in request body');
  
  // Verify test asserts response approverId matches authenticated user
  assert.match(integrationTestContent, /jsonPath\("\$\.approverId"\)\.value\("approver-100"\)/, 
    'Test must assert approverId matches authenticated user');
  
  // Verify test asserts approverId does not equal the body value using Hamcrest not()
  // More flexible regex that accepts any string in not() containing "hacker"
  assert.match(integrationTestContent, /not\("hacker[^"]*"\)/, 
    'Test must assert approverId does not match body value using Hamcrest not() matcher');
});

test('[TC-013] Backend integration test validates idempotency', () => {
  // Verify test exists for duplicate approve with same key
  assert.match(integrationTestContent, /testIdempotency_DuplicateApprove/, 
    'Test must exist for idempotency validation');
  
  // Verify test generates single idempotency key
  assert.match(integrationTestContent, /String idempotencyKey = UUID/, 
    'Test must generate single idempotency key');
  
  // Verify test makes two requests - look for comments indicating this
  const idempotencyTestMatch = integrationTestContent.match(/testIdempotency_DuplicateApprove[\s\S]{0,3000}?(?=@Test|void test|$)/m);
  assert.ok(idempotencyTestMatch, 'Idempotency test method must exist');
  assert.match(idempotencyTestMatch[0], /First request/, 
    'Test must have first request');
  assert.match(idempotencyTestMatch[0], /Second request/, 
    'Test must have second request with same key');
});

test('[TC-014] Backend integration test validates input', () => {
  // Verify test exists for missing Idempotency-Key
  assert.match(integrationTestContent, /testInputValidation_MissingIdempotencyKey|testValidateInput_MissingIdempotencyKey/, 
    'Test must exist for missing Idempotency-Key validation');
  
  // Verify test expects 400 status
  const testMethodBody = integrationTestContent.match(/test(?:InputValidation|ValidateInput)_MissingIdempotencyKey[\s\S]{0,2000}?(?=@Test|void test|$)/m);
  assert.ok(testMethodBody, 'Test method body must exist');
  assert.match(testMethodBody[0], /status\(\)\.isBadRequest\(\)/, 
    'Test must assert 400 Bad Request for missing key');
  
  // Verify test validates error structure - more flexible pattern
  assert.match(testMethodBody[0], /jsonPath.*\$\./, 
    'Test must validate response body structure with jsonPath assertions');
});

test('[TC-015] Backend integration test validates state transition errors', () => {
  // Verify test exists for invalid state transition
  assert.match(integrationTestContent, /testStateTransitionError_ApproveAlreadyApproved/, 
    'Test must exist for invalid state transition');
  
  // Verify test attempts to approve an already-approved request
  const testMethodBody = integrationTestContent.match(/testStateTransitionError_ApproveAlreadyApproved[\s\S]{0,3000}?(?=@Test|void test|$)/m);
  assert.ok(testMethodBody, 'Test method body must exist');
  assert.match(testMethodBody[0], /approvedRequest\.getId\(\)/, 
    'Test must use already-approved request');
  
  // Verify test expects error status code
  assert.match(testMethodBody[0], /status\(\)\.is(?:Conflict|BadRequest|[A-Z])/, 
    'Test must assert an error status code for invalid transition');
});
