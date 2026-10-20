'use client';

import { useState } from 'react';
import { approveRequest, rejectRequest } from './actions';
import type { ApprovalRequest } from './types';

interface Props {
  request: ApprovalRequest;
}

export function ApprovalRequestCard({ request }: Props) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await approveRequest(request.id, 'reviewer-001', '');
      if (result.success) {
        setSuccess(`Request ${result.wasIdempotent ? '(already) ' : ''}approved`);
      } else {
        setError(result.error || 'Approval failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      setError('Rejection comment is required');
      return;
    }

    setIsRejecting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await rejectRequest(request.id, 'reviewer-001', rejectComment);
      if (result.success) {
        setSuccess(`Request ${result.wasIdempotent ? '(already) ' : ''}rejected`);
        setShowRejectForm(false);
        setRejectComment('');
      } else {
        setError(result.error || 'Rejection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsRejecting(false);
    }
  };

  const statusColor = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }[request.status] || 'bg-gray-100 text-gray-800';

  const isTerminal = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(request.status);

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">Request {request.id}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
              {request.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">Requester: {request.requesterId}</p>
          <p className="text-sm text-gray-600">Resource: {request.resourceId}</p>
          <p className="text-xs text-gray-400 mt-1">
            Created: {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {request.reviewerId && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-gray-600">Reviewer: {request.reviewerId}</p>
          {request.reviewComment && (
            <p className="text-sm text-gray-700 mt-1">Comment: {request.reviewComment}</p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800" role="alert">
          {success}
        </div>
      )}

      {!isTerminal && !success && (
        <div className="mt-4 pt-4 border-t">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Approve request"
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isApproving || isRejecting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                aria-label="Reject request"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor={`reject-comment-${request.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection reason (required)
                </label>
                <textarea
                  id={`reject-comment-${request.id}`}
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                  placeholder="Explain why this request is rejected..."
                  disabled={isRejecting}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectComment.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectComment('');
                    setError(null);
                  }}
                  disabled={isRejecting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
