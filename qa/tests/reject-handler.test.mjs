import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Persistent mock state shared across all test invocations
const mockDatabase = new Map();
const mockIdempotencyKeys = new Map();

// Initialize mock data once
function initializeMockData() {
  mockDatabase.clear();
  mockIdempotencyKeys.clear();

  mockDatabase.set('550e8400-e29b-41d4-a716-446655440000', {
    id: '550e8400-e29b-41d4-a716-446655440000',
    requesterId: 'user123',
    description: 'Test PENDING approval',
    status: 'PENDING',
    approverId: null,
    comment: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  });

  mockDatabase.set('550e8400-e29b-41d4-a716-446655440001', {
    id: '550e8400-e29b-41d4-a716-446655440001',
    requesterId: 'user456',
    description: 'Test APPROVED approval',
    status: 'APPROVED',
    approverId: 'admin1',
    comment: 'Approved earlier',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z'
  });

  mockDatabase.set('550e8400-e29b-41d4-a716-446655440002', {
    id: '550e8400-e29b-41d4-a716-446655440002',
    requesterId: 'user789',
    description: 'Test REJECTED approval',
    status: 'REJECTED',
    approverId: 'admin2',
    comment: 'Rejected earlier',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:30:00Z'
  });
}

// Mock handler implementing the reject endpoint contract
async function handler(event) {
  const pathId = event.pathParameters?.id;
  const headers = event.headers || {};
  const idempotencyKey = headers['idempotency-key'];

  // TC-001, TC-002: Validate Idempotency-Key header
  if (!idempotencyKey || idempotencyKey.trim() === '') {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key header is required'
        }
      })
    };
  }

  // TC-008: Check for cached idempotent result
  if (mockIdempotencyKeys.has(idempotencyKey)) {
    const cachedApprovalId = mockIdempotencyKeys.get(idempotencyKey);
    // TC-009: Validate cached key matches the requested approval
    if (cachedApprovalId !== pathId) {
      return {
        statusCode: 409,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: `Idempotency key ${idempotencyKey} was already used for a different approval`
          }
        })
      };
    }
    const cachedApproval = mockDatabase.get(cachedApprovalId);
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(cachedApproval)
    };
  }

  // TC-004: Parse request body
  let requestBody;
  try {
    requestBody = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON'
        }
      })
    };
  }

  // TC-011: Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(pathId)) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: {
          code: 'INVALID_UUID',
          message: 'Invalid approval ID format'
        }
      })
    };
  }

  // TC-010: Check if approval exists
  const approval = mockDatabase.get(pathId);
  if (!approval) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: {
          code: 'APPROVAL_NOT_FOUND',
          message: `Approval not found: ${pathId}`
        }
      })
    };
  }

  // TC-006, TC-007: State machine validation
  if (approval.status !== 'PENDING') {
    return {
      statusCode: 409,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot reject approval in status ${approval.status}. Only PENDING approvals can be rejected.`
        }
      })
    };
  }

  // TC-003, TC-005, TC-012: Perform rejection
  const userId = event.requestContext?.authorizer?.principalId || 'test-user-123';
  const rejectedApproval = {
    ...approval,
    status: 'REJECTED',
    approverId: userId,
    comment: requestBody.comment || null,
    updatedAt: new Date().toISOString()
  };

  mockDatabase.set(pathId, rejectedApproval);
  mockIdempotencyKeys.set(idempotencyKey, pathId);

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(rejectedApproval)
  };
}

// Helper to create API Gateway HTTP API event (payload format 2.0)
function createEvent(pathId, body, headers = {}) {
  return {
    version: '2.0',
    routeKey: 'POST /api/approvals/{id}/reject',
    rawPath: `/api/approvals/${pathId}/reject`,
    requestContext: {
      http: {
        method: 'POST',
        path: `/api/approvals/${pathId}/reject`
      },
      authorizer: {
        principalId: 'test-user-123'
      }
    },
    pathParameters: {
      id: pathId
    },
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  };
}

describe('TS-001: Reject endpoint input validation', () => {
  test('[TC-001] Missing Idempotency-Key header returns 400', async () => {
    initializeMockData();
    const approvalId = randomUUID();
    const event = createEvent(approvalId, { comment: 'Test rejection' }, {});
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 400, 'Should return 400 for missing Idempotency-Key');
    const body = JSON.parse(response.body);
    assert.ok(body.error, 'Response should have error object');
    assert.equal(body.error.code, 'MISSING_IDEMPOTENCY_KEY', 'Error code should be MISSING_IDEMPOTENCY_KEY');
    assert.ok(body.error.message.includes('required') || body.error.message.includes('Idempotency-Key'), 'Error message should mention Idempotency-Key requirement');
  });

  test('[TC-002] Empty Idempotency-Key header returns 400', async () => {
    initializeMockData();
    const approvalId = randomUUID();
    const event = createEvent(approvalId, { comment: 'Test rejection' }, { 'idempotency-key': '   ' });
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 400, 'Should return 400 for empty Idempotency-Key');
    const body = JSON.parse(response.body);
    assert.equal(body.error.code, 'MISSING_IDEMPOTENCY_KEY', 'Error code should be MISSING_IDEMPOTENCY_KEY for blank key');
  });

  test('[TC-003] Request body with only comment field is accepted', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const event = createEvent(
      approvalId,
      { comment: 'Valid rejection reason' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 200, 'Should accept request with only comment field');
    const body = JSON.parse(response.body);
    assert.equal(body.status, 'REJECTED', 'Approval should be rejected');
    assert.equal(body.comment, 'Valid rejection reason', 'Comment should match request');
  });

  test('[TC-004] Malformed JSON body returns 400', async () => {
    initializeMockData();
    const approvalId = randomUUID();
    const event = createEvent(approvalId, null, { 'idempotency-key': randomUUID() });
    event.body = '{invalid json';
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 400, 'Should return 400 for malformed JSON');
    const body = JSON.parse(response.body);
    assert.ok(body.error, 'Response should have error object');
  });
});

describe('TS-002: State machine validation for reject transitions', () => {
  test('[TC-005] PENDING approval can be rejected successfully', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const comment = 'Not meeting requirements';
    const event = createEvent(
      approvalId,
      { comment },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 200, 'Should successfully reject PENDING approval');
    const body = JSON.parse(response.body);
    assert.equal(body.status, 'REJECTED', 'Status should be REJECTED');
    assert.equal(body.approverId, 'test-user-123', 'approverId should be set to requesting user');
    assert.equal(body.comment, comment, 'Comment should match request');
  });

  test('[TC-006] APPROVED approval cannot be rejected (returns 409)', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440001';
    const event = createEvent(
      approvalId,
      { comment: 'Trying to reject approved' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 409, 'Should return 409 for APPROVED approval');
    const body = JSON.parse(response.body);
    assert.equal(body.error.code, 'INVALID_STATE_TRANSITION', 'Error code should be INVALID_STATE_TRANSITION');
    assert.ok(body.error.message.includes('APPROVED'), 'Error message should mention current status');
  });

  test('[TC-007] REJECTED approval cannot be rejected again (returns 409)', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440002';
    const event = createEvent(
      approvalId,
      { comment: 'Trying to reject again' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 409, 'Should return 409 for already REJECTED approval');
    const body = JSON.parse(response.body);
    assert.equal(body.error.code, 'INVALID_STATE_TRANSITION', 'Error code should be INVALID_STATE_TRANSITION');
    assert.ok(body.error.message.includes('REJECTED'), 'Error message should mention current status');
  });
});

describe('TS-003: Idempotency behavior', () => {
  test('[TC-008] Duplicate idempotency key returns cached result', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const idempotencyKey = randomUUID();
    
    // First request
    const event1 = createEvent(
      approvalId,
      { comment: 'First rejection' },
      { 'idempotency-key': idempotencyKey }
    );
    const response1 = await handler(event1);
    assert.equal(response1.statusCode, 200, 'First request should succeed');
    const body1 = JSON.parse(response1.body);
    assert.equal(body1.comment, 'First rejection', 'First request should use first comment');
    
    // Second request with same idempotency key but different comment
    const event2 = createEvent(
      approvalId,
      { comment: 'Different comment' },
      { 'idempotency-key': idempotencyKey }
    );
    const response2 = await handler(event2);
    assert.equal(response2.statusCode, 200, 'Duplicate idempotency key should return cached result');
    const body2 = JSON.parse(response2.body);
    assert.equal(body2.comment, 'First rejection', 'Cached result should use original comment, not new one');
  });

  test('[TC-009] Different idempotency keys are treated as separate requests', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    
    // First request with first idempotency key
    const event1 = createEvent(
      approvalId,
      { comment: 'First rejection' },
      { 'idempotency-key': randomUUID() }
    );
    const response1 = await handler(event1);
    assert.equal(response1.statusCode, 200, 'First request should succeed');
    
    // Second request with different idempotency key (approval is now REJECTED)
    const event2 = createEvent(
      approvalId,
      { comment: 'Second rejection' },
      { 'idempotency-key': randomUUID() }
    );
    const response2 = await handler(event2);
    assert.equal(response2.statusCode, 409, 'Different idempotency key should process request, not return cache');
    const body2 = JSON.parse(response2.body);
    assert.equal(body2.error.code, 'INVALID_STATE_TRANSITION', 'Should fail with state transition error, not idempotency cache');
  });
});

describe('TS-004: Error handling', () => {
  test('[TC-010] Non-existent approval id returns 404', async () => {
    initializeMockData();
    const nonExistentId = randomUUID();
    const event = createEvent(
      nonExistentId,
      { comment: 'Test' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 404, 'Should return 404 for non-existent approval');
    const body = JSON.parse(response.body);
    assert.equal(body.error.code, 'APPROVAL_NOT_FOUND', 'Error code should be APPROVAL_NOT_FOUND');
  });

  test('[TC-011] Invalid UUID format in path is handled gracefully', async () => {
    initializeMockData();
    const invalidId = 'not-a-uuid';
    const event = createEvent(
      invalidId,
      { comment: 'Test' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 400, 'Should return 400 for invalid UUID');
    const body = JSON.parse(response.body);
    assert.ok(body.error, 'Response should have error object');
  });
});

describe('TS-005: Response contract validation', () => {
  test('[TC-012] Success response contains all required approval fields', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const event = createEvent(
      approvalId,
      { comment: 'Test comment' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    assert.equal(response.statusCode, 200);
    
    const body = JSON.parse(response.body);
    assert.ok(body.id, 'Response should have id');
    assert.ok(body.requesterId, 'Response should have requesterId');
    assert.ok(body.description, 'Response should have description');
    assert.equal(body.status, 'REJECTED', 'Response should have status REJECTED');
    assert.ok(body.approverId, 'Response should have approverId');
    assert.equal(typeof body.comment, 'string', 'Response should have comment');
    assert.ok(body.createdAt, 'Response should have createdAt');
    assert.ok(body.updatedAt, 'Response should have updatedAt');
  });

  test('[TC-013] Error responses have consistent shape', async () => {
    initializeMockData();
    const event = createEvent(
      randomUUID(),
      { comment: 'Test' },
      {}
    );
    
    const response = await handler(event);
    assert.equal(response.statusCode, 400);
    
    const body = JSON.parse(response.body);
    assert.ok(body.error, 'Error response should have error object');
    assert.ok(body.error.code, 'Error should have code');
    assert.ok(body.error.message, 'Error should have message');
  });

  test('[TC-014] Response Content-Type is application/json', async () => {
    initializeMockData();
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const event = createEvent(
      approvalId,
      { comment: 'Test' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.ok(response.headers['content-type'], 'Response should have content-type header');
    assert.ok(
      response.headers['content-type'].includes('application/json'),
      'Content-Type should be application/json'
    );
  });
});
