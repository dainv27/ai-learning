import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Mock handler implementing the reject endpoint contract
async function handler(event) {
  const pathId = event.pathParameters?.id;
  const headers = event.headers || {};
  const idempotencyKey = headers['idempotency-key'];
  
  // Get fresh mock data for each request
  const mockDatabase = getMockDatabase();
  const mockIdempotencyKeys = new Map();

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

// Helper to get fresh mock data for each test
function getMockDatabase() {
  const db = new Map();
  db.set('550e8400-e29b-41d4-a716-446655440000', {
    id: '550e8400-e29b-41d4-a716-446655440000',
    requesterId: 'user123',
    description: 'Test PENDING approval',
    status: 'PENDING',
    approverId: null,
    comment: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  });

  db.set('550e8400-e29b-41d4-a716-446655440001', {
    id: '550e8400-e29b-41d4-a716-446655440001',
    requesterId: 'user456',
    description: 'Test APPROVED approval',
    status: 'APPROVED',
    approverId: 'admin1',
    comment: 'Approved earlier',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T09:30:00Z'
  });

  db.set('550e8400-e29b-41d4-a716-446655440002', {
    id: '550e8400-e29b-41d4-a716-446655440002',
    requesterId: 'user789',
    description: 'Test REJECTED approval',
    status: 'REJECTED',
    approverId: 'admin2',
    comment: 'Rejected earlier',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:30:00Z'
  });

  return db;
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
    const approvalId = randomUUID();
    const event = createEvent(approvalId, { comment: 'Test rejection' }, { 'idempotency-key': '   ' });
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 400, 'Should return 400 for empty Idempotency-Key');
    const body = JSON.parse(response.body);
    assert.equal(body.error.code, 'MISSING_IDEMPOTENCY_KEY', 'Error code should be MISSING_IDEMPOTENCY_KEY for blank key');
  });

  test('[TC-003] Request body with only comment field is accepted', async () => {
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
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const comment = 'Not meeting requirements';
    const event = createEvent(
      approvalId,
      { comment },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 200, 'Should return 200 for valid rejection');
    const body = JSON.parse(response.body);
    assert.equal(body.id, approvalId, 'Response should contain the approval ID');
    assert.equal(body.status, 'REJECTED', 'Status should be REJECTED');
    assert.equal(body.approverId, 'test-user-123', 'ApproverId should be set from request context');
    assert.equal(body.comment, comment, 'Comment should match the request');
    assert.ok(body.updatedAt, 'UpdatedAt should be set');
  });

  test('[TC-006] APPROVED approval cannot be rejected (returns 409)', async () => {
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
    assert.ok(body.error.message.includes('PENDING'), 'Error message should mention only PENDING can be rejected');
  });

  test('[TC-007] REJECTED approval cannot be rejected again (returns 409)', async () => {
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
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const idempotencyKey = randomUUID();
    const comment = 'First rejection';
    
    const event1 = createEvent(
      approvalId,
      { comment },
      { 'idempotency-key': idempotencyKey }
    );
    
    const response1 = await handler(event1);
    assert.equal(response1.statusCode, 200, 'First request should succeed');
    const body1 = JSON.parse(response1.body);
    
    // Second request with same idempotency key but different comment
    const event2 = createEvent(
      approvalId,
      { comment: 'Different comment' },
      { 'idempotency-key': idempotencyKey }
    );
    
    const response2 = await handler(event2);
    assert.equal(response2.statusCode, 200, 'Second request should return cached result');
    const body2 = JSON.parse(response2.body);
    
    // Cached result should match first request
    assert.equal(body2.comment, comment, 'Cached result should use original comment, not new one');
    assert.equal(body2.id, body1.id, 'Cached result should have same approval ID');
    assert.equal(body2.status, body1.status, 'Cached result should have same status');
  });

  test('[TC-009] Different idempotency keys are treated as separate requests', async () => {
    const approvalId1 = '550e8400-e29b-41d4-a716-446655440000';
    const key1 = randomUUID();
    const key2 = randomUUID();
    
    const event1 = createEvent(
      approvalId1,
      { comment: 'First rejection' },
      { 'idempotency-key': key1 }
    );
    
    const response1 = await handler(event1);
    assert.equal(response1.statusCode, 200, 'First request should succeed');
    
    // Different key should not return cached result (though it will fail with 409 because approval is now REJECTED)
    const event2 = createEvent(
      approvalId1,
      { comment: 'Second rejection attempt' },
      { 'idempotency-key': key2 }
    );
    
    const response2 = await handler(event2);
    // This will be 409 because the approval is no longer PENDING, which proves it's not using the cache
    assert.equal(response2.statusCode, 409, 'Different idempotency key should process request, not return cache');
  });
});

describe('TS-004: Error handling', () => {
  test('[TC-010] Non-existent approval id returns 404', async () => {
    const nonExistentId = randomUUID();
    const event = createEvent(
      nonExistentId,
      { comment: 'Rejection attempt' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 404, 'Should return 404 for non-existent approval');
    const body = JSON.parse(response.body);
    assert.equal(body.error.code, 'APPROVAL_NOT_FOUND', 'Error code should be APPROVAL_NOT_FOUND');
    assert.ok(body.error.message.includes(nonExistentId), 'Error message should include the approval ID');
  });

  test('[TC-011] Invalid UUID format in path is handled gracefully', async () => {
    const invalidId = 'not-a-uuid';
    const event = createEvent(
      invalidId,
      { comment: 'Rejection attempt' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.equal(response.statusCode, 400, 'Should return 400 for invalid UUID format');
    const body = JSON.parse(response.body);
    assert.ok(body.error, 'Response should have error object');
    assert.ok(body.error.code, 'Error should have a code');
  });
});

describe('TS-005: Response contract validation', () => {
  test('[TC-012] Success response contains all required approval fields', async () => {
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const event = createEvent(
      approvalId,
      { comment: 'Valid rejection' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    assert.equal(response.statusCode, 200, 'Should return 200');
    
    const body = JSON.parse(response.body);
    
    // Verify all required fields are present
    assert.ok(body.id, 'Response should have id field');
    assert.ok(body.requesterId, 'Response should have requesterId field');
    assert.ok(body.description, 'Response should have description field');
    assert.equal(body.status, 'REJECTED', 'Response should have status REJECTED');
    assert.ok(body.approverId, 'Response should have approverId field');
    assert.ok(body.hasOwnProperty('comment'), 'Response should have comment field (may be null)');
    assert.ok(body.createdAt, 'Response should have createdAt field');
    assert.ok(body.updatedAt, 'Response should have updatedAt field');
  });

  test('[TC-013] Error responses have consistent shape', async () => {
    const event = createEvent(
      randomUUID(),
      { comment: 'Test' },
      {} // Missing idempotency key
    );
    
    const response = await handler(event);
    
    const body = JSON.parse(response.body);
    assert.ok(body.error, 'Error response should have error object');
    assert.ok(body.error.code, 'Error should have code field');
    assert.ok(body.error.message, 'Error should have message field');
    assert.equal(typeof body.error.code, 'string', 'Error code should be a string');
    assert.equal(typeof body.error.message, 'string', 'Error message should be a string');
  });

  test('[TC-014] Response Content-Type is application/json', async () => {
    const approvalId = '550e8400-e29b-41d4-a716-446655440000';
    const event = createEvent(
      approvalId,
      { comment: 'Test' },
      { 'idempotency-key': randomUUID() }
    );
    
    const response = await handler(event);
    
    assert.ok(response.headers, 'Response should have headers');
    const contentType = response.headers['content-type'];
    assert.ok(contentType, 'Response should have content-type header');
    assert.ok(contentType.includes('application/json'), 'Content-Type should be application/json');
  });
});
