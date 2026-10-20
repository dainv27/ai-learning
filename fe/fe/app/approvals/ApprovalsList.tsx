import Link from 'next/link';
import { ApprovalRequest, ApprovalStatus } from './types';

const MOCK_APPROVALS: ApprovalRequest[] = [
  {
    id: 'req-001',
    requesterId: 'user-123',
    resourceType: 'BUDGET_ALLOCATION',
    resourceId: 'budget-2024-q1',
    status: ApprovalStatus.PENDING,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'req-002',
    requesterId: 'user-456',
    resourceType: 'BUDGET_ALLOCATION',
    resourceId: 'budget-2024-q2',
    status: ApprovalStatus.APPROVED,
    createdAt: '2024-01-14T09:00:00Z',
    approverId: 'approver-001',
    approvedAt: '2024-01-14T10:00:00Z',
    comment: 'Approved for Q2 allocation',
  },
  {
    id: 'req-003',
    requesterId: 'user-789',
    resourceType: 'BUDGET_ALLOCATION',
    resourceId: 'budget-2024-q3',
    status: ApprovalStatus.REJECTED,
    createdAt: '2024-01-13T08:00:00Z',
    approverId: 'approver-002',
    approvedAt: '2024-01-13T09:00:00Z',
    comment: 'Insufficient justification',
  },
];

function getStatusColor(status: ApprovalStatus): string {
  switch (status) {
    case ApprovalStatus.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case ApprovalStatus.APPROVED:
      return 'bg-green-100 text-green-800';
    case ApprovalStatus.REJECTED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function ApprovalsList() {
  if (MOCK_APPROVALS.length === 0) {
    return <div className="text-gray-500">No approval requests found.</div>;
  }

  return (
    <div className="space-y-4">
      {MOCK_APPROVALS.map((approval) => (
        <Link
          key={approval.id}
          href={`/approvals/${approval.id}`}
          className="block border rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold">{approval.resourceType}</h2>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(approval.status)}`}>
                  {approval.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Resource ID: <span className="font-mono">{approval.resourceId}</span>
              </p>
              <p className="text-sm text-gray-600 mb-1">
                Requester: <span className="font-mono">{approval.requesterId}</span>
              </p>
              <p className="text-xs text-gray-500">
                Created: {new Date(approval.createdAt).toLocaleString()}
              </p>
              {approval.approverId && (
                <p className="text-xs text-gray-500 mt-1">
                  {approval.status === ApprovalStatus.APPROVED ? 'Approved' : 'Rejected'} by {approval.approverId}
                  {approval.approvedAt && ` on ${new Date(approval.approvedAt).toLocaleString()}`}
                </p>
              )}
              {approval.comment && (
                <p className="text-sm text-gray-700 mt-2 italic">"{approval.comment}"</p>
              )}
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      ))}
    </div>
  );
}
