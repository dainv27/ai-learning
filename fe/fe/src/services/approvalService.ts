export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Approval {
  id: string;
  resourceType: string;
  resourceId: string;
  status: ApprovalStatus;
  requesterId: string;
  approverId: string | null;
  reason: string | null;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
}

export interface CreateApprovalRequest {
  resourceType: string;
  resourceId: string;
  reason?: string;
}

export interface RejectApprovalRequest {
  reason: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

class ApprovalService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authentication header if available (from session/cookie/etc)
    // For now, assuming authentication is handled via session cookie
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody: ApiError = await response.json();
        if (errorBody.error?.message) {
          errorMessage = errorBody.error.message;
        }
      } catch {
        // If parsing fails, use the default error message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async listApprovals(status?: ApprovalStatus): Promise<Approval[]> {
    const params = new URLSearchParams();
    if (status) {
      params.set('status', status);
    }
    const query = params.toString();
    const path = query ? `/api/approvals?${query}` : '/api/approvals';
    return this.request<Approval[]>(path);
  }

  async getApproval(id: string): Promise<Approval> {
    return this.request<Approval>(`/api/approvals/${id}`);
  }

  async createApproval(request: CreateApprovalRequest): Promise<Approval> {
    return this.request<Approval>('/api/approvals', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async approveApproval(id: string): Promise<Approval> {
    const idempotencyKey = generateIdempotencyKey();
    return this.request<Approval>(`/api/approvals/${id}/approve`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
  }

  async rejectApproval(id: string, reason: string): Promise<Approval> {
    const idempotencyKey = generateIdempotencyKey();
    return this.request<Approval>(`/api/approvals/${id}/reject`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ reason } as RejectApprovalRequest),
    });
  }
}

export const approvalService = new ApprovalService();
