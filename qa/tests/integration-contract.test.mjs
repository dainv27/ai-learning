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
  // Verify integration test method exists for ignoring approverId in body
  assert.match(integrationTestContent, /testApproveEndpoint_IgnoresApproverIdInBody/, 
    'Integration test must exist for ignoring approverId in body');
  
  // Verify test sends approverId in request body - look for hacker or spoof pattern
  assert.match(integrationTestContent, /"approverId".*[Hh]acker/, 
    'Test must send malicious approverId in request body');
  
  // Verify test asserts response approverId matches authenticated user
  assert.match(integrationTestContent, /jsonPath\("\$\.approverId"\)\.value\("approver-100"\)/, 
    'Test must assert approverId matches authenticated user, not body value');
  
  // Verify database assertion exists - check that the saved entity has correct approverId
  assert.match(integrationTestContent, /assertEquals\("approver-100",\s*saved\.getApproverId\(\)\)/, 
    'Test must verify database entity has approverId from authentication');
});

test('[TC-013] Backend integration test validates idempotency', () => {
  // Verify test method exists for idempotency validation
  assert.match(integrationTestContent, /testIdempotencyKeyEnforcement/, 
    'Test must exist for idempotency validation');
  
  // Verify test generates a single idempotency key
  assert.match(integrationTestContent, /String idempotencyKey = UUID/, 
    'Test must generate single idempotency key');
  
  // Verify test makes multiple requests - look for perform() calls
  const idempotencyTestMatch = integrationTestContent.match(/testIdempotencyKeyEnforcement[\s\S]{0,8000}?(?=@Test|@DisplayName|class |$)/m);
  assert.ok(idempotencyTestMatch, 'Idempotency test method must exist');
  const performCalls = (idempotencyTestMatch[0].match(/\.perform\(/g) || []).length;
  assert.ok(performCalls >= 2, 'Test must make at least two requests with same idempotency key');
});

test('[TC-014] Backend integration test validates input', () => {
  // Verify test exists for missing Idempotency-Key
  assert.match(integrationTestContent, /test.*MissingIdempotencyKey/, 
    'Test must exist for missing Idempotency-Key validation');
  
  // Verify test expects bad request status
  assert.match(integrationTestContent, /status\(\)\.isBadRequest\(\)/, 
    'Test must assert 400 Bad Request for missing key');
  
  // Verify test validates error response structure with jsonPath
  assert.match(integrationTestContent, /jsonPath\(["']\$/, 
    'Test must validate response body structure with jsonPath assertions');
});

test('[TC-015] Backend integration test validates state transition errors', () => {
  // Verify test exists for invalid state transition
  assert.match(integrationTestContent, /testStateTransitionError_ApproveAlreadyApproved/, 
    'Test must exist for invalid state transition');
  
  // Verify test uses already-approved request
  assert.match(integrationTestContent, /approvedRequest/, 
    'Test must reference already-approved request');
  
  // Verify test expects conflict or error status - look for status assertion
  assert.match(integrationTestContent, /status\(\)\.is(?:Conflict|BadRequest|4xxClientError)/, 
    'Test must assert an error status code for invalid state transition');
});
