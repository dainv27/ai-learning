'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Approval {
  id: string;
  resourceId: string;
  resourceType: string;
  requesterId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  approverId: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface ApprovalDetailProps {
  approval: Approval;
}

export default function ApprovalDetail({ approval: initialApproval }: ApprovalDetailProps) {
  const [approval, setApproval] = useState<Approval>(initialApproval);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const canModify = approval.status === 'PENDING';

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setSuccess(null);

    const idempotencyKey = `approve-${approval.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/approvals/${approval.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          approverId: 'current-user-id', // In real app, get from auth context
          comment: comment || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        if (res.status === 400) {
          throw new Error(errorData.error?.message || 'Invalid request. Please check your input.');
        } else if (res.status === 403) {
          throw new Error('You do not have permission to approve this request.');
        } else if (res.status === 404) {
          throw new Error('Approval request not found.');
        } else if (res.status === 409) {
          throw new Error('This approval is already in a final state and cannot be modified.');
        } else {
          throw new Error(`Failed to approve: ${res.status}`);
        }
      }

      const updated = await res.json();
      setApproval(updated);
      setSuccess('Approval request has been approved successfully.');
      setComment('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    setError(null);
    setSuccess(null);

    const idempotencyKey = `reject-${approval.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
      const res = await fetch(`${baseUrl}/api/approvals/${approval.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          approverId: 'current-user-id', // In real app, get from auth context
          comment: comment || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        
        if (res.status === 400) {
          throw new Error(errorData.error?.message || 'Invalid request. Please check your input.');
        } else if (res.status === 403) {
          throw new Error('You do not have permission to reject this request.');
        } else if (res.status === 404) {
          throw new Error('Approval request not found.');
        } else if (res.status === 409) {
          throw new Error('This approval is already in a final state and cannot be modified.');
        } else {
          throw new Error(`Failed to reject: ${res.status}`);
        }
      }

      const updated = await res.json();
      setApproval(updated);
      setSuccess('Approval request has been rejected.');
      setComment('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsRejecting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-700 bg-green-100';
      case 'REJECTED':
        return 'text-red-700 bg-red-100';
      case 'CANCELLED':
        return 'text-gray-700 bg-gray-100';
      case 'PENDING':
      default:
        return 'text-yellow-700 bg-yellow-100';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Approval Details</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(approval.status)}`}>
            {approval.status}
          </span>
        </div>
        
        <dl className="space-y-3">
          <div className="flex">
            <dt className="w-1/3 text-sm font-medium text-gray-500">Approval ID:</dt>
            <dd className="w-2/3 text-sm text-gray-900 font-mono">{approval.id}</dd>
          </div>
          <div className="flex">
            <dt className="w-1/3 text-sm font-medium text-gray-500">Resource:</dt>
            <dd className="w-2/3 text-sm text-gray-900">{approval.resourceType} / {approval.resourceId}</dd>
          </div>
          <div className="flex">
            <dt className="w-1/3 text-sm font-medium text-gray-500">Requester ID:</dt>
            <dd className="w-2/3 text-sm text-gray-900 font-mono">{approval.requesterId}</dd>
          </div>
          <div className="flex">
            <dt className="w-1/3 text-sm font-medium text-gray-500">Created At:</dt>
            <dd className="w-2/3 text-sm text-gray-900">{new Date(approval.createdAt).toLocaleString()}</dd>
          </div>
          <div className="flex">
            <dt className="w-1/3 text-sm font-medium text-gray-500">Updated At:</dt>
            <dd className="w-2/3 text-sm text-gray-900">{new Date(approval.updatedAt).toLocaleString()}</dd>
          </div>
          {approval.approverId && (
            <div className="flex">
              <dt className="w-1/3 text-sm font-medium text-gray-500">Approver ID:</dt>
              <dd className="w-2/3 text-sm text-gray-900 font-mono">{approval.approverId}</dd>
            </div>
          )}
          {approval.comment && (
            <div className="flex">
              <dt className="w-1/3 text-sm font-medium text-gray-500">Comment:</dt>
              <dd className="w-2/3 text-sm text-gray-900">{approval.comment}</dd>
            </div>
          )}
        </dl>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded" role="alert">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded" role="alert">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {canModify && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Take Action</h3>
          
          <div className="mb-4">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Comment (optional)
            </label>
            <textarea
              id="comment"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment to explain your decision..."
              disabled={isApproving || isRejecting}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Approve request"
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
            
            <button
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Reject request"
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      )}

      {!canModify && (
        <div className="border-t pt-6">
          <p className="text-sm text-gray-600">
            This approval is in a final state and cannot be modified.
          </p>
        </div>
      )}
    </div>
  );
}
