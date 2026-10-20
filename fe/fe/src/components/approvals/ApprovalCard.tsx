import Link from 'next/link';
import { type Approval } from '@/services/approvalService';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';

interface ApprovalCardProps {
  approval: Approval;
}

export function ApprovalCard({ approval }: ApprovalCardProps) {
  return (
    <Link
      href={`/approvals/${approval.id}`}
      className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {approval.resourceType}
            </h3>
            <ApprovalStatusBadge status={approval.status} />
          </div>
          <p className="text-sm text-gray-600 mb-1">
            Resource: <span className="font-medium">{approval.resourceId}</span>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Requester: <span className="font-medium">{approval.requesterId}</span>
          </p>
          {approval.reason && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {approval.reason}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-gray-500 ml-4">
          <p>{new Date(approval.requestedAt).toLocaleDateString()}</p>
          <p>{new Date(approval.requestedAt).toLocaleTimeString()}</p>
        </div>
      </div>
    </Link>
  );
}
