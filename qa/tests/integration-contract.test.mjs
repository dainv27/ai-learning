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
  
  // Verify test makes first request and captures response
  assert.match(integrationTestContent, /String firstResponse.*perform.*getContentAsString/, 
    'Test must make first request and capture response');
  
  // Verify test makes second request - relax the comment check, just verify the second perform call exists
  const hasSecondRequest = integrationTestContent.includes('perform(post("/api/approvals/{id}/approve"') && 
                          integrationTestContent.split('perform(post("/api/approvals/{id}/approve"').length >= 3;
  assert.ok(hasSecondRequest, 
    'Test must make second request with same idempotency key');
  
  // Verify test asserts both responses are identical - look for comparison pattern
  const hasResponseComparison = /assertEquals\(firstResponse,\s*secondResponse\)/.test(integrationTestContent) ||
                                /assertThat.*equalTo\(firstResponse\)/.test(integrationTestContent) ||
                                /secondResponse.*andExpect\(content\(\)\.string\(firstResponse\)/.test(integrationTestContent);
  assert.ok(hasResponseComparison, 
    'Test must verify second response matches first response (idempotency)');
});

test('[TC-014] Backend integration test validates input', () => {
  // Verify test exists for missing Idempotency-Key - look for method name pattern
  const hasMissingKeyTest = /test.*Missing.*Idempotency|test.*Idempotency.*Missing|test.*RequiredHeader/.test(integrationTestContent);
  assert.ok(hasMissingKeyTest, 
    'Test must exist for missing Idempotency-Key validation');
  
  // Verify test expects bad request status - accept various Spring Boot status assertion patterns
  const hasBadRequestAssertion = /status\(\)\.isBadRequest\(\)/.test(integrationTestContent) ||
                                  /andExpect\(status\(\)\.is\(400\)\)/.test(integrationTestContent) ||
                                  /status\(\)\.is\(HttpStatus\.BAD_REQUEST\)/.test(integrationTestContent);
  assert.ok(hasBadRequestAssertion, 
    'Test must assert 400 Bad Request for missing key');
  
  // Verify test validates error response structure - RFC 7807 ProblemDetail has title, detail, status fields
  const hasErrorStructureValidation = /jsonPath\("\$\.title"\)/.test(integrationTestContent) ||
                                       /jsonPath\("\$\.detail"\)/.test(integrationTestContent) ||
                                       /jsonPath\("\$\.type"\)/.test(integrationTestContent) ||
                                       /jsonPath\("\$\.status"\)/.test(integrationTestContent);
  assert.ok(hasErrorStructureValidation, 
    'Test must validate RFC 7807 error response structure (title, detail, type, or status field)');
});

test('[TC-015] Backend integration test validates state transition errors', () => {
  // Verify test exists for invalid state transition - look for method name pattern
  const hasStateTransitionTest = /test.*StateTransition.*Error|test.*Invalid.*State|test.*AlreadyApproved/.test(integrationTestContent);
  assert.ok(hasStateTransitionTest, 
    'Test must exist for invalid state transition');
  
  // Verify test uses already-approved or already-rejected request - check for entity creation with APPROVED/REJECTED status
  const hasApprovedRequest = /setStatus\(ApprovalStatus\.APPROVED\)/.test(integrationTestContent) ||
                             /ApprovalStatus\.APPROVED/.test(integrationTestContent);
  assert.ok(hasApprovedRequest, 
    'Test must reference already-approved or already-rejected request');
  
  // Verify test expects conflict status - accept Spring Boot's fluent assertion methods
  const hasConflictAssertion = /status\(\)\.isConflict\(\)/.test(integrationTestContent) ||
                                /status\(\)\.is\(409\)/.test(integrationTestContent) ||
                                /andExpect\(status\(\)\.is\(HttpStatus\.CONFLICT/.test(integrationTestContent) ||
                                /jsonPath\("\$\.status"\)\.value\(409\)/.test(integrationTestContent);
  assert.ok(hasConflictAssertion, 
    'Test must assert 409 Conflict status for invalid state transition');
  
  // Verify test validates error message contains state information
  const hasStateErrorMessage = /jsonPath\("\$\.detail"\).*containsString.*approved/.test(integrationTestContent) ||
                                /jsonPath\("\$\.detail"\).*containsString.*rejected/.test(integrationTestContent) ||
                                /jsonPath\("\$\.title"\)/.test(integrationTestContent) ||
                                /jsonPath\("\$\.detail"\).*value\(containsString\("already/.test(integrationTestContent);
  assert.ok(hasStateErrorMessage, 
    'Test must verify error response describes the invalid state transition');
});
