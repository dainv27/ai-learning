import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

// Mock backend handler simulating the reject endpoint behavior
async function mockRejectHandler(event) {
  const { id } = event.pathParameters || {};
  const headers = event.headers || {};
  const idempotencyKey = headers['idempotency-key'] || headers['Idempotency-Key'];
  
  // Validate Idempotency-Key header
  if (!idempotencyKey || idempotencyKey.trim() === '') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'MISSING_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key header is required'
        }
      })
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'INVALID_JSON',
          message: 'Request body must be valid JSON'
        }
      })
    };
  }

  // Mock approval database
  const mockApprovals = {
    '550e8400-e29b-41d4-a716-446655440000': {
      id: '550e8400-e29b-41d4-a716-446655440000',
      requesterId: 'user123',
      description: 'Test approval request',
      status: 'PENDING',
      approverId: null,
      comment: null,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    },
    '550e8400-e29b-41d4-a716-446655440001': {
      id: '550e8400-e29b-41d4-a716-446655440001',
      requesterId: 'user456',
      description: 'Already approved request',
      status: 'APPROVED',
      approverId: 'admin1',
      comment: 'Looks good',
      createdAt: '2024-01-15T09:00:00Z',
      updatedAt: '2024-01-15T09:30:00Z'
    }
  };

  const approval = mockApprovals[id];
  
  if (!approval) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'APPROVAL_NOT_FOUND',
          message: `Approval not found: ${id}`
        }
      })
    };
  }

  // State machine validation: only PENDING can be rejected
  if (approval.status !== 'PENDING') {
    return {
      statusCode: 409,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'INVALID_STATE_TRANSITION',
          message: `Cannot reject approval in status ${approval.status}. Only PENDING approvals can be rejected.`
        }
      })
    };
  }

  // Extract userId from auth context (simulated)
  const userId = event.requestContext?.authorizer?.principalId || 'test-user';
  
  // Perform rejection
  const rejectedApproval = {
    ...approval,
    status: 'REJECTED',
    approverId: userId,
    comment: requestBody.comment || null,
    updatedAt: new Date().toISOString()
  };

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rejectedApproval)
  };
}

test('reject endpoint requires Idempotency-Key header', async () => {
  const event = {
    httpMethod: 'POST',
    pathParameters: { id: '550e8400-e29b-41d4-a716-446655440000' },
    headers: {},
    body: JSON.stringify({ comment: 'Rejected for testing' })
  };

  const response = await mockRejectHandler(event);
  
  assert.equal(response.statusCode, 400);
  const body = JSON.parse(response.body);
  assert.equal(body.error.code, 'MISSING_IDEMPOTENCY_KEY');
});

test('reject endpoint returns 404 for non-existent approval', async () => {
  const event = {
    httpMethod: 'POST',
    pathParameters: { id: '00000000-0000-0000-0000-000000000000' },
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ comment: 'Rejected for testing' })
  };

  const response = await mockRejectHandler(event);
  
  assert.equal(response.statusCode, 404);
  const body = JSON.parse(response.body);
  assert.equal(body.error.code, 'APPROVAL_NOT_FOUND');
});

test('reject endpoint returns 409 for non-PENDING approval', async () => {
  const event = {
    httpMethod: 'POST',
    pathParameters: { id: '550e8400-e29b-41d4-a716-446655440001' },
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ comment: 'Trying to reject already approved' })
  };

  const response = await mockRejectHandler(event);
  
  assert.equal(response.statusCode, 409);
  const body = JSON.parse(response.body);
  assert.equal(body.error.code, 'INVALID_STATE_TRANSITION');
  assert.ok(body.error.message.includes('APPROVED'));
});

test('reject endpoint successfully rejects PENDING approval', async () => {
  const event = {
    httpMethod: 'POST',
    pathParameters: { id: '550e8400-e29b-41d4-a716-446655440000' },
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ comment: 'Does not meet requirements' }),
    requestContext: {
      authorizer: { principalId: 'reviewer1' }
    }
  };

  const response = await mockRejectHandler(event);
  
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.status, 'REJECTED');
  assert.equal(body.approverId, 'reviewer1');
  assert.equal(body.comment, 'Does not meet requirements');
  assert.equal(body.id, '550e8400-e29b-41d4-a716-446655440000');
});

test('reject request body contains only comment field', async () => {
  const event = {
    httpMethod: 'POST',
    pathParameters: { id: '550e8400-e29b-41d4-a716-446655440000' },
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ 
      comment: 'Rejected',
      approverId: 'should-be-ignored'
    }),
    requestContext: {
      authorizer: { principalId: 'actual-user' }
    }
  };

  const response = await mockRejectHandler(event);
  
  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  // approverId should come from auth context, not request body
  assert.equal(body.approverId, 'actual-user');
  assert.notEqual(body.approverId, 'should-be-ignored');
});
