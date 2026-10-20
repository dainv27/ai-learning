/**
 * Generate a deterministic idempotency key for an operation.
 * The key combines the operation type and resource ID with a client-side timestamp
 * to ensure uniqueness while allowing the same logical operation to be retried.
 */
export function generateIdempotencyKey(operation: string, resourceId: string): string {
  // Use a stable timestamp (rounded to nearest second) so retries within the same
  // second use the same key, but different operations get different keys
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Combine operation, resource, and timestamp into a deterministic key
  return `${operation}-${resourceId}-${timestamp}`;
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
