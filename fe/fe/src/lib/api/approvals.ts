interface Approval {
  id: string;
  requesterId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string | null;
  approverId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  
  // In production, auth token would come from session/cookie
  // For validation, we assume authentication is handled by infrastructure
  headers.set('Content-Type', 'application/json');
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send cookies for session-based auth
  });

  return response;
}

function handleApiError(data: unknown): never {
  if (data && typeof data === 'object' && 'error' in data) {
    const apiError = data as ApiError;
    throw new Error(apiError.error.message);
  }
  throw new Error('An unexpected error occurred');
}

export async function getApprovals(): Promise<Approval[]> {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/approvals`);
  
  if (!response.ok) {
    const data = await response.json();
    handleApiError(data);
  }
  
  return response.json();
}

export async function getApproval(id: string): Promise<Approval> {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/approvals/${id}`);
  
  if (response.status === 404) {
    throw new Error('Approval not found');
  }
  
  if (!response.ok) {
    const data = await response.json();
    handleApiError(data);
  }
  
  return response.json();
}

export async function approveRequest(
  id: string,
  comment: string,
  idempotencyKey: string
): Promise<Approval> {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/approvals/${id}/approve`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ comment }),
  });
  
  if (response.status === 401) {
    throw new Error('Authentication required');
  }
  
  if (response.status === 409) {
    const data = await response.json();
    if (data.error?.code === 'INVALID_STATE_TRANSITION') {
      throw new Error('Cannot approve: approval is not in pending state');
    }
    handleApiError(data);
  }
  
  if (response.status === 404) {
    throw new Error('Approval not found');
  }
  
  if (!response.ok) {
    const data = await response.json();
    handleApiError(data);
  }
  
  return response.json();
}

export async function rejectRequest(
  id: string,
  comment: string,
  idempotencyKey: string
): Promise<Approval> {
  const response = await fetchWithAuth(`${API_BASE_URL}/api/approvals/${id}/reject`, {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ comment }),
  });
  
  if (response.status === 401) {
    throw new Error('Authentication required');
  }
  
  if (response.status === 409) {
    const data = await response.json();
    if (data.error?.code === 'INVALID_STATE_TRANSITION') {
      throw new Error('Cannot reject: approval is not in pending state');
    }
    handleApiError(data);
  }
  
  if (response.status === 404) {
    throw new Error('Approval not found');
  }
  
  if (!response.ok) {
    const data = await response.json();
    handleApiError(data);
  }
  
  return response.json();
}
