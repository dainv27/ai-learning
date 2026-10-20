'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import RejectButton from '@/components/RejectButton';

interface Approval {
  id: string;
  requesterId: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approverId: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const approvalId = params.id as string;

  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApproval = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/approvals/${approvalId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setApproval(data);
        setError(null);
      } else if (response.status === 404) {
        setError('Approval not found');
      } else {
        setError(`Failed to load approval: ${response.status}`);
      }
    } catch (err) {
      setError('Network error: failed to load approval');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproval();
  }, [approvalId]);

  const handleRejectSuccess = () => {
    fetchApproval();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading approval...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
            {error}
          </div>
          <button
            onClick={() => router.push('/approvals')}
            className="mt-4 text-blue-600 hover:underline"
          >
            ← Back to approvals
          </button>
        </div>
      </div>
    );
  }

  if (!approval) {
    return null;
  }

  const statusColor = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }[approval.status];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <button
          onClick={() => router.push('/approvals')}
          className="text-blue-600 hover:underline mb-6"
        >
          ← Back to approvals
        </button>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Approval Request
              </h1>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
                {approval.status}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              ID: {approval.id}
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requester
              </label>
              <div className="text-gray-900">{approval.requesterId}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <div className="text-gray-900 whitespace-pre-wrap">{approval.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created
                </label>
                <div className="text-gray-900 text-sm">
                  {new Date(approval.createdAt).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Updated
                </label>
                <div className="text-gray-900 text-sm">
                  {new Date(approval.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            {approval.approverId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {approval.status === 'APPROVED' ? 'Approved by' : 'Rejected by'}
                </label>
                <div className="text-gray-900">{approval.approverId}</div>
              </div>
            )}

            {approval.comment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {approval.status === 'APPROVED' ? 'Approval Comment' : 'Rejection Reason'}
                </label>
                <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                  {approval.comment}
                </div>
              </div>
            )}
          </div>

          {approval.status === 'PENDING' && (
            <div className="flex gap-3 pt-4 border-t">
              <RejectButton
                approvalId={approval.id}
                onRejectSuccess={handleRejectSuccess}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
