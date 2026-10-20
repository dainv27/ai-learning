import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const APPROVALS_TABLE = process.env.APPROVALS_TABLE;
const IDEMPOTENCY_TABLE = process.env.IDEMPOTENCY_TABLE;

export async function handler(event) {
  const method = event.requestContext.http.method;
  const path = event.rawPath;

  if (method !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'allow': 'POST'
      },
      body: JSON.stringify({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Only POST is allowed'
        }
      })
    };
  }

  const match = path.match(/^\/api\/approvals\/([a-f0-9-]+)\/reject$/);
  if (!match) {
    return {
      statusCode: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found'
        }
      })
    };
  }

  const approvalId = match[1];
  const idempotencyKey = event.headers['idempotency-key'];

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

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || '{}');
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

  const { comment } = requestBody;
  const userId = event.requestContext.authorizer?.principalId || 'test-user';

  try {
    const result = await rejectApproval(approvalId, userId, comment, idempotencyKey);
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    if (error.code === 'APPROVAL_NOT_FOUND') {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          error: {
            code: 'APPROVAL_NOT_FOUND',
            message: error.message
          }
        })
      };
    }
    if (error.code === 'INVALID_STATE_TRANSITION') {
      return {
        statusCode: 409,
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          error: {
            code: 'INVALID_STATE_TRANSITION',
            message: error.message
          }
        })
      };
    }
    throw error;
  }
}

async function rejectApproval(approvalId, userId, comment, idempotencyKey) {
  const cachedResult = await findByIdempotencyKey(idempotencyKey);
  if (cachedResult) {
    return cachedResult;
  }

  const approval = await getApproval(approvalId);
  if (!approval) {
    const error = new Error(`Approval not found: ${approvalId}`);
    error.code = 'APPROVAL_NOT_FOUND';
    throw error;
  }

  if (approval.status !== 'PENDING') {
    const error = new Error(`Cannot reject approval in status ${approval.status}. Only PENDING approvals can be rejected.`);
    error.code = 'INVALID_STATE_TRANSITION';
    throw error;
  }

  const now = new Date().toISOString();
  const updated = {
    ...approval,
    status: 'REJECTED',
    approverId: userId,
    comment: comment || '',
    updatedAt: now
  };

  await saveApproval(updated);
  await recordIdempotencyKey(idempotencyKey, approvalId);

  return updated;
}

async function getApproval(id) {
  const result = await docClient.send(new GetCommand({
    TableName: APPROVALS_TABLE,
    Key: { id }
  }));
  return result.Item;
}

async function saveApproval(approval) {
  await docClient.send(new PutCommand({
    TableName: APPROVALS_TABLE,
    Item: approval
  }));
}

async function findByIdempotencyKey(idempotencyKey) {
  const result = await docClient.send(new QueryCommand({
    TableName: IDEMPOTENCY_TABLE,
    IndexName: 'IdempotencyKeyIndex',
    KeyConditionExpression: 'idempotencyKey = :key',
    ExpressionAttributeValues: {
      ':key': idempotencyKey
    },
    Limit: 1
  }));

  if (result.Items && result.Items.length > 0) {
    const approvalId = result.Items[0].approvalId;
    return await getApproval(approvalId);
  }
  return null;
}

async function recordIdempotencyKey(idempotencyKey, approvalId) {
  await docClient.send(new PutCommand({
    TableName: IDEMPOTENCY_TABLE,
    Item: {
      idempotencyKey,
      approvalId,
      createdAt: new Date().toISOString()
    }
  }));
}
