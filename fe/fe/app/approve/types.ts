export interface ApprovalRequest {
  id: string;
  requesterId: string;
  resourceId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewerId?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalResult {
  approvalRequestId: string;
  status: string;
  wasIdempotent: boolean;
}

export interface RejectionResult {
  approvalRequestId: string;
  status: string;
  wasIdempotent: boolean;
}
