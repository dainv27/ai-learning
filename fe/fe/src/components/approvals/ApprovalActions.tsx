'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveRequest, rejectRequest } from '@/lib/api/approvals';
import { generateIdempotencyKey } from '@/lib/idempotency';

interface ApprovalActionsProps {
  approvalId: string;
}

export default function ApprovalActions({ approvalId }: ApprovalActionsProps) {
  const router = useRouter();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey('approve', approvalId);
      await approveRequest(approvalId, comment, idempotencyKey);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve request';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);

    try {
      const idempotencyKey = generateIdempotencyKey('reject', approvalId);
      await rejectRequest(approvalId, comment, idempotencyKey);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject request';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 bg-white border rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Take Action</h2>

      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={3}
          placeholder="Add a comment about your decision..."
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
        >
          {loading ? 'Processing...' : 'Approve'}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
        >
          {loading ? 'Processing...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
