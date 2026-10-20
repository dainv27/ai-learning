/**
 * Generate a unique idempotency key for an operation.
 * The key combines the operation type, resource ID, timestamp, and a UUID
 * to ensure uniqueness across all calls.
 */
export function generateIdempotencyKey(operation: string, resourceId: string): string {
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  
  // Format: idem-{operation}-{resourceId}-{timestamp}-{uuid}
  // This ensures every call produces a unique key while maintaining
  // semantic information about what operation is being protected
  return `idem-${operation}-${resourceId}-${timestamp}-${uuid}`;
}

/**
 * Store an idempotency key in session storage to support retry logic.
 * If the user refreshes or navigates back, we can detect if they're retrying
 * the same operation.
 */
export function storeIdempotencyKey(key: string): void {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    sessionStorage.setItem('last-idempotency-key', key);
  }
}

/**
 * Retrieve the last idempotency key from session storage.
 */
export function getLastIdempotencyKey(): string | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return sessionStorage.getItem('last-idempotency-key');
  }
  return null;
}
