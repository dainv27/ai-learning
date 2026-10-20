import { PROVINCES } from './data/provinces.js';
import { searchProvinces } from './search.js';
import { ok, errorResponse } from './response.js';

const ROUTE_PATH = '/provinces';
export const MAX_Q_LENGTH = 100;

// Validates the optional q parameter (HTTP API payload v2 shape).
function readQuery(event) {
  const params = event.queryStringParameters;
  if (params === undefined || params === null || !Object.hasOwn(params, 'q')) {
    return { q: undefined };
  }
  const q = params.q;
  if (typeof q !== 'string') {
    return { error: 'Query parameter q must be a single string.' };
  }
  // Repeated query parameters are joined with commas in payload v2; no province name contains a comma.
  if (q.includes(',')) {
    return { error: 'Query parameter q must be provided at most once.' };
  }
  if (q.length > MAX_Q_LENGTH) {
    return { error: `Query parameter q must be at most ${MAX_Q_LENGTH} characters.` };
  }
  return { q };
}

export const handler = async (event) => {
  try {
    const path = event?.rawPath;
    const method = event?.requestContext?.http?.method;

    if (path !== ROUTE_PATH) {
      return errorResponse(404, 'NOT_FOUND', 'Route not found.');
    }
    if (method !== 'GET') {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', { Allow: 'GET' });
    }

    const parsed = readQuery(event);
    if (parsed.error !== undefined) {
      return errorResponse(400, 'INVALID_QUERY', parsed.error);
    }

    return ok(searchProvinces(PROVINCES, parsed.q));
  } catch (err) {
    console.error('Unhandled error while serving GET /provinces', err);
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  }
};
