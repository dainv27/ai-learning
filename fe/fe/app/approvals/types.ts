export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface ApprovalRequest {
  id: string;
  requesterId: string;
  resourceType: string;
  resourceId: string;
  status: ApprovalStatus;
  createdAt: string;
  approverId?: string;
  approvedAt?: string;
  comment?: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    detail?: string;
  };
}
