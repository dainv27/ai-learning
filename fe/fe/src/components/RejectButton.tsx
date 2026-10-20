'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface RejectButtonProps {
  approvalId: string;
  onRejectSuccess: () => void;
  disabled?: boolean;
}

export default function RejectButton({ approvalId, onRejectSuccess, disabled }: RejectButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReject = async () => {
    if (!comment.trim()) {
      setError('Rejection comment is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const idempotencyKey = uuidv4();
      const response = await fetch(`/api/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        credentials: 'include',
        body: JSON.stringify({ comment: comment.trim() }),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setComment('');
        onRejectSuccess();
      } else if (response.status === 409) {
        const data = await response.json();
        setError(data.error?.message || 'Cannot reject: approval is not in PENDING state');
      } else if (response.status === 404) {
        setError('Approval not found');
      } else if (response.status === 400) {
        const data = await response.json();
        setError(data.error?.message || 'Bad request');
      } else {
        setError(`Unexpected error: ${response.status}`);
      }
    } catch (err) {
      setError('Network error: failed to reject approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled || isSubmitting}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Reject
      </button>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Reject Approval</h2>
            
            <div className="mb-4">
              <label htmlFor="rejectComment" className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                id="rejectComment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="Explain why this approval is being rejected..."
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDialogOpen(false);
                  setComment('');
                  setError(null);
                }}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isSubmitting || !comment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
