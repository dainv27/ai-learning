import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read frontend API file content
const apiFilePath = join(__dirname, '../../fe/fe/app/approvals/api.ts');
const apiContent = readFileSync(apiFilePath, 'utf-8');

test('[TC-001] Frontend approve request sends only comment field', () => {
  // Verify the approveRequest function body construction
  assert.match(apiContent, /body:\s*JSON\.stringify\(\{\s*comment\s*\}\)/, 
    'approveRequest must construct body with only comment field');
  
  // Verify no approverId is sent in the approve request body
  const approveMatch = apiContent.match(/export async function approveRequest[\s\S]*?^}/m);
  assert.ok(approveMatch, 'approveRequest function must exist');
  assert.doesNotMatch(approveMatch[0], /approverId/, 
    'approveRequest must not include approverId in request body');
});

test('[TC-002] Frontend reject request sends only comment field', () => {
  // Verify the rejectRequest function body construction
  assert.match(apiContent, /body:\s*JSON\.stringify\(\{\s*comment\s*\}\)/g, 
    'rejectRequest must construct body with only comment field');
  
  // Verify no approverId is sent in the reject request body
  const rejectMatch = apiContent.match(/export async function rejectRequest[\s\S]*?^}/m);
  assert.ok(rejectMatch, 'rejectRequest function must exist');
  assert.doesNotMatch(rejectMatch[0], /approverId/, 
    'rejectRequest must not include approverId in request body');
});

test('[TC-003] Frontend includes Idempotency-Key header', () => {
  // Verify generateIdempotencyKey function exists
  assert.match(apiContent, /function generateIdempotencyKey\(\)/, 
    'generateIdempotencyKey function must exist');
  
  // Verify approveRequest includes Idempotency-Key header
  const approveMatch = apiContent.match(/export async function approveRequest[\s\S]*?fetch\([\s\S]*?\)/m);
  assert.ok(approveMatch, 'approveRequest fetch call must exist');
  assert.match(approveMatch[0], /'Idempotency-Key':\s*generateIdempotencyKey\(\)/, 
    'approveRequest must include Idempotency-Key header');
  
  // Verify rejectRequest includes Idempotency-Key header
  const rejectMatch = apiContent.match(/export async function rejectRequest[\s\S]*?fetch\([\s\S]*?\)/m);
  assert.ok(rejectMatch, 'rejectRequest fetch call must exist');
  assert.match(rejectMatch[0], /'Idempotency-Key':\s*generateIdempotencyKey\(\)/, 
    'rejectRequest must include Idempotency-Key header');
});

test('[TC-004] Frontend handles RFC 7807 error responses', () => {
  // Verify handleResponse function exists and parses error structure
  assert.match(apiContent, /async function handleResponse/, 
    'handleResponse function must exist');
  
  // Verify it extracts error.message from RFC 7807 structure
  assert.match(apiContent, /errorBody\.error\.message/, 
    'handleResponse must extract error.message from RFC 7807 structure');
  
  // Verify it appends error.detail if present
  assert.match(apiContent, /errorBody\.error\.detail/, 
    'handleResponse must check for error.detail field');
});
