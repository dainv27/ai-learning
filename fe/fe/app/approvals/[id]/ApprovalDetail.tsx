'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApprovalRequest, ApprovalStatus } from '../types';
import { approveRequest, rejectRequest } from '../api';

const MOCK_APPROVAL: ApprovalRequest = {
  id: 'req-001',
  requesterId: 'user-123',
  resourceType: 'BUDGET_ALLOCATION',
  resourceId: 'budget-2024-q1',
  status: ApprovalStatus.PENDING,
  createdAt: '2024-01-15T10:00:00Z',
};

interface Props {
  id: string;
}

type ActionState = 'idle' | 'approving' | 'rejecting' | 'success' | 'error';

export function ApprovalDetail({ id }: Props) {
  const [approval, setApproval] = useState<ApprovalRequest>(MOCK_APPROVAL);
  const [comment, setComment] = useState('');
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setActionState('approving');
    setError(null);

    try {
      const result = await approveRequest(id, comment);
      setApproval(result);
      setActionState('success');
      setComment('');
    } catch (err) {
      setActionState('error');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to approve request');
      }
    }
  };

  const handleReject = async () => {
    setActionState('rejecting');
    setError(null);

    try {
      const result = await rejectRequest(id, comment);
      setApproval(result);
      setActionState('success');
      setComment('');
    } catch (err) {
      setActionState('error');
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reject request');
      }
    }
  };

  const isLoading = actionState === 'approving' || actionState === 'rejecting';
  const isPending = approval.status === ApprovalStatus.PENDING;
  const canTakeAction = isPending && !isLoading;

  return (
    <div className="max-w-2xl">
      <Link href="/approvals" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to list
      </Link>

      <div className="border rounded-lg p-6 bg-white shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-2xl font-bold">{approval.resourceType}</h1>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              approval.status === ApprovalStatus.PENDING
                ? 'bg-yellow-100 text-yellow-800'
                : approval.status === ApprovalStatus.APPROVED
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {approval.status}
          </span>
        </div>

        <dl className="space-y-3 mb-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Request ID</dt>
            <dd className="mt-1 font-mono text-sm">{approval.id}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Resource ID</dt>
            <dd className="mt-1 font-mono text-sm">{approval.resourceId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Requester</dt>
            <dd className="mt-1 font-mono text-sm">{approval.requesterId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm">{new Date(approval.createdAt).toLocaleString()}</dd>
          </div>
          {approval.approverId && (
            <>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {approval.status === ApprovalStatus.APPROVED ? 'Approved by' : 'Rejected by'}
                </dt>
                <dd className="mt-1 font-mono text-sm">{approval.approverId}</dd>
              </div>
              {approval.approvedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Action Date</dt>
                  <dd className="mt-1 text-sm">{new Date(approval.approvedAt).toLocaleString()}</dd>
                </div>
              )}
            </>
          )}
          {approval.comment && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Comment</dt>
              <dd className="mt-1 text-sm italic">{approval.comment}</dd>
            </div>
          )}
        </dl>

        {actionState === 'success' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            Request {approval.status === ApprovalStatus.APPROVED ? 'approved' : 'rejected'} successfully.
          </div>
        )}

        {actionState === 'error' && error && (
          <div 
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm"
            data-testid="error-message"
          >
            <p className="font-medium">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        {isPending && (
          <div className="border-t pt-6">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Comment (optional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
              placeholder="Add a comment..."
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleApprove}
                disabled={!canTakeAction}
                data-testid="approve-button"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionState === 'approving' ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={handleReject}
                disabled={!canTakeAction}
                data-testid="reject-button"
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionState === 'rejecting' ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        )}

        {!isPending && (
          <div className="border-t pt-6">
            <p className="text-sm text-gray-500">
              This request has already been {approval.status === ApprovalStatus.APPROVED ? 'approved' : 'rejected'} and cannot be modified.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
