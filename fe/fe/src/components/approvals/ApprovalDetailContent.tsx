'use client';

import { useState, useEffect } from 'react';
import { approvalService, type Approval } from '@/services/approvalService';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ApprovalDetailContentProps {
  id: string;
}

export function ApprovalDetailContent({ id }: ApprovalDetailContentProps) {
  const router = useRouter();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    loadApproval();
  }, [id]);

  async function loadApproval() {
    try {
      setLoading(true);
      setError(null);
      const data = await approvalService.getApproval(id);
      setApproval(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approval) return;
    
    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await approvalService.approveApproval(approval.id);
      setApproval(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!approval) return;
    
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      setActionLoading(true);
      setActionError(null);
      const updated = await approvalService.rejectApproval(approval.id, reason);
      setApproval(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800 font-semibold">Error loading approval</p>
        <p className="text-red-600 mt-2">{error}</p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => loadApproval()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Retry
          </button>
          <Link
            href="/approvals"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <p className="text-gray-600">Approval not found</p>
        <Link
          href="/approvals"
          className="mt-4 inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/approvals" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
        ← Back to approvals
      </Link>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Approval Request</h2>
            <p className="text-gray-500 mt-1">ID: {approval.id}</p>
          </div>
          <ApprovalStatusBadge status={approval.status} />
        </div>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Resource Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{approval.resourceType}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Resource ID</dt>
            <dd className="mt-1 text-sm text-gray-900">{approval.resourceId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Requester</dt>
            <dd className="mt-1 text-sm text-gray-900">{approval.requesterId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Requested At</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(approval.requestedAt).toLocaleString()}
            </dd>
          </div>
          {approval.approverId && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Approver</dt>
              <dd className="mt-1 text-sm text-gray-900">{approval.approverId}</dd>
            </div>
          )}
          {approval.approvedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Approved At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(approval.approvedAt).toLocaleString()}
              </dd>
            </div>
          )}
          {approval.rejectedAt && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Rejected At</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(approval.rejectedAt).toLocaleString()}
              </dd>
            </div>
          )}
        </dl>

        {approval.reason && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-gray-500">Reason</dt>
            <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{approval.reason}</dd>
          </div>
        )}

        {actionError && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800 text-sm">{actionError}</p>
          </div>
        )}

        {approval.status === 'PENDING' && (
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {actionLoading ? 'Processing...' : 'Approve'}
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {actionLoading ? 'Processing...' : 'Reject'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
