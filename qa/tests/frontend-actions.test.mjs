import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mock global fetch for frontend action tests
let mockFetch;
let fetchCalls;

function setupFetchMock() {
  fetchCalls = [];
  mockFetch = async (url, options) => {
    fetchCalls.push({ url, options });
    if (mockFetch._response) {
      return mockFetch._response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ wasIdempotent: false }),
    };
  };
  global.fetch = mockFetch;
}

function setMockResponse(response) {
  mockFetch._response = response;
}

test('[TC-035] approveRequest action calls correct endpoint', async () => {
  setupFetchMock();
  
  const { approveRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  await approveRequest('req-123', 'reviewer-001', 'looks good');
  
  assert.equal(fetchCalls.length, 1, 'Fetch should be called once');
  assert.ok(
    fetchCalls[0].url.includes('/api/approval-requests/req-123/approve'),
    'URL should contain correct endpoint'
  );
  assert.equal(fetchCalls[0].options.method, 'POST', 'Method should be POST');
});

test('[TC-036] approveRequest includes Idempotency-Key header', async () => {
  setupFetchMock();
  
  const { approveRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  await approveRequest('req-123', 'reviewer-001', '');
  
  assert.ok(
    fetchCalls[0].options.headers['Idempotency-Key'],
    'Idempotency-Key header should be present'
  );
  assert.ok(
    fetchCalls[0].options.headers['Idempotency-Key'].length > 0,
    'Idempotency-Key should not be empty'
  );
});

test('[TC-037] approveRequest returns success=true on 200', async () => {
  setupFetchMock();
  setMockResponse({
    ok: true,
    status: 200,
    json: async () => ({ wasIdempotent: false }),
  });
  
  const { approveRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await approveRequest('req-123', 'reviewer-001', '');
  
  assert.equal(result.success, true, 'Result should indicate success');
  assert.equal(result.wasIdempotent, false, 'Should indicate not idempotent');
});

test('[TC-038] approveRequest handles 404 with descriptive error', async () => {
  setupFetchMock();
  setMockResponse({
    ok: false,
    status: 404,
    json: async () => ({}),
  });
  
  const { approveRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await approveRequest('req-999', 'reviewer-001', '');
  
  assert.equal(result.success, false, 'Result should indicate failure');
  assert.ok(
    result.error.toLowerCase().includes('not found'),
    'Error should mention not found'
  );
});

test('[TC-039] approveRequest handles 409 as state transition error', async () => {
  setupFetchMock();
  setMockResponse({
    ok: false,
    status: 409,
    json: async () => ({
      error: { code: 'INVALID_STATE_TRANSITION', message: 'Cannot transition from APPROVED to APPROVED' },
    }),
  });
  
  const { approveRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await approveRequest('req-123', 'reviewer-001', '');
  
  assert.equal(result.success, false, 'Result should indicate failure');
  assert.ok(
    result.error.toLowerCase().includes('transition') || result.error.toLowerCase().includes('state'),
    'Error should mention state or transition'
  );
});

test('[TC-040] rejectRequest action calls correct endpoint', async () => {
  setupFetchMock();
  
  const { rejectRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  await rejectRequest('req-456', 'reviewer-002', 'not compliant');
  
  assert.equal(fetchCalls.length, 1, 'Fetch should be called once');
  assert.ok(
    fetchCalls[0].url.includes('/api/approval-requests/req-456/reject'),
    'URL should contain correct endpoint'
  );
  assert.equal(fetchCalls[0].options.method, 'POST', 'Method should be POST');
});

test('[TC-041] rejectRequest validates comment is not blank', async () => {
  setupFetchMock();
  
  const { rejectRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await rejectRequest('req-456', 'reviewer-002', '   ');
  
  assert.equal(result.success, false, 'Result should indicate failure');
  assert.ok(
    result.error.toLowerCase().includes('comment') && result.error.toLowerCase().includes('required'),
    'Error should mention comment is required'
  );
  assert.equal(fetchCalls.length, 0, 'Fetch should not be called');
});

test('[TC-042] rejectRequest includes Idempotency-Key header', async () => {
  setupFetchMock();
  
  const { rejectRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  await rejectRequest('req-456', 'reviewer-002', 'not good');
  
  assert.ok(
    fetchCalls[0].options.headers['Idempotency-Key'],
    'Idempotency-Key header should be present'
  );
  assert.ok(
    fetchCalls[0].options.headers['Idempotency-Key'].length > 0,
    'Idempotency-Key should not be empty'
  );
});

test('[TC-043] rejectRequest handles 400 as validation error', async () => {
  setupFetchMock();
  setMockResponse({
    ok: false,
    status: 400,
    json: async () => ({
      error: { code: 'INVALID_INPUT', message: 'Comment is required' },
    }),
  });
  
  const { rejectRequest } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await rejectRequest('req-456', 'reviewer-002', 'comment');
  
  assert.equal(result.success, false, 'Result should indicate failure');
  assert.ok(
    result.error.toLowerCase().includes('comment') || result.error.toLowerCase().includes('invalid'),
    'Error should mention validation issue'
  );
});

test('[TC-044] getApprovalRequests handles empty list', async () => {
  setupFetchMock();
  setMockResponse({
    ok: true,
    status: 200,
    json: async () => [],
  });
  
  const { getApprovalRequests } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await getApprovalRequests();
  
  assert.ok(Array.isArray(result), 'Result should be an array');
  assert.equal(result.length, 0, 'Array should be empty');
});

test('[TC-045] getApprovalRequests handles fetch error gracefully', async () => {
  setupFetchMock();
  mockFetch._response = Promise.reject(new Error('Network error'));
  
  const { getApprovalRequests } = await import('../../fe/fe/app/approve/actions.ts');
  
  const result = await getApprovalRequests();
  
  assert.ok(Array.isArray(result), 'Result should be an array');
  assert.equal(result.length, 0, 'Should return empty array on error');
});
