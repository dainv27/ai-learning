'use server';

import type { ApprovalRequest } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function getApprovalRequests(): Promise<ApprovalRequest[]> {
  try {
    const response = await fetch(`${API_BASE}/api/approval-requests?status=PENDING`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch approval requests:', response.status);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    return [];
  }
}

interface ActionResult {
  success: boolean;
  error?: string;
  wasIdempotent?: boolean;
}

export async function approveRequest(
  requestId: string,
  reviewerId: string,
  comment: string
): Promise<ActionResult> {
  const idempotencyKey = `approve-${requestId}-${reviewerId}-${Date.now()}`;

  try {
    const response = await fetch(`${API_BASE}/api/approval-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        reviewerId,
        comment: comment || undefined,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        wasIdempotent: result.wasIdempotent || false,
      };
    }

    if (response.status === 404) {
      return { success: false, error: 'Approval request not found' };
    }

    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || 'Invalid state transition - request may already be processed',
      };
    }

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || 'Invalid request',
      };
    }

    return { success: false, error: `Unexpected error: ${response.status}` };
  } catch (error) {
    console.error('Error approving request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function rejectRequest(
  requestId: string,
  reviewerId: string,
  comment: string
): Promise<ActionResult> {
  if (!comment.trim()) {
    return { success: false, error: 'Rejection comment is required' };
  }

  const idempotencyKey = `reject-${requestId}-${reviewerId}-${Date.now()}`;

  try {
    const response = await fetch(`${API_BASE}/api/approval-requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        reviewerId,
        comment,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        wasIdempotent: result.wasIdempotent || false,
      };
    }

    if (response.status === 404) {
      return { success: false, error: 'Approval request not found' };
    }

    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || 'Invalid state transition - request may already be processed',
      };
    }

    if (response.status === 400) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error?.message || 'Invalid request - comment is required',
      };
    }

    return { success: false, error: `Unexpected error: ${response.status}` };
  } catch (error) {
    console.error('Error rejecting request:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
