import { type ApprovalStatus } from '@/services/approvalService';

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
}

export function ApprovalStatusBadge({ status }: ApprovalStatusBadgeProps) {
  const styles = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    APPROVED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {status}
    </span>
  );
}
