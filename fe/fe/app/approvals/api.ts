import { ApprovalRequest, ErrorResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorBody = await response.json();
      
      // RFC 7807 format: {type, title, status, detail}
      if (errorBody.title) {
        errorMessage = errorBody.title;
        if (errorBody.detail) {
          errorMessage += `: ${errorBody.detail}`;
        }
      }
      // Legacy format: {error: {code, message, detail}}
      else if (errorBody.error) {
        errorMessage = errorBody.error.message;
        if (errorBody.error.detail) {
          errorMessage += ` (${errorBody.error.detail})`;
        }
      }
    } catch {
      // If we can't parse the error body, use the default message
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
}

export async function approveRequest(
  id: string,
  comment: string
): Promise<ApprovalRequest> {
  const response = await fetch(`${API_BASE_URL}/api/approvals/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify({ comment }),
  });
  
  return handleResponse<ApprovalRequest>(response);
}

export async function rejectRequest(
  id: string,
  comment: string
): Promise<ApprovalRequest> {
  const response = await fetch(`${API_BASE_URL}/api/approvals/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': generateIdempotencyKey(),
    },
    body: JSON.stringify({ comment }),
  });
  
  return handleResponse<ApprovalRequest>(response);
}
