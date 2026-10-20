import { PROVINCES } from './data/provinces.js';
import { filterProvinces } from './provinces.js';
import { json, errorResponse } from './response.js';

const ROUTE_PATH = '/provinces';
const ALLOWED_METHOD = 'GET';
const MAX_Q_LENGTH = 100;
const CACHE_CONTROL_OK = 'public, max-age=3600';

function readQuery(event) {
  const raw = event.rawQueryString;
  if (typeof raw === 'string' && raw.length > 0) {
    if (new URLSearchParams(raw).getAll('q').length > 1) {
      return { ok: false, message: 'Parameter q must not be repeated' };
    }
  }
  const q = event.queryStringParameters?.q;
  if (q === undefined) {
    return { ok: true, q: '' };
  }
  if (typeof q !== 'string') {
    return { ok: false, message: 'Parameter q must be a string' };
  }
  const trimmed = q.trim();
  if (Array.from(trimmed).length > MAX_Q_LENGTH) {
    return { ok: false, message: `Parameter q must be at most ${MAX_Q_LENGTH} characters` };
  }
  return { ok: true, q: trimmed };
}

export async function handler(event) {
  try {
    const method = event?.requestContext?.http?.method;
    const path = event?.rawPath;

    if (path !== ROUTE_PATH) {
      return errorResponse(404, 'NOT_FOUND', 'Route not found');
    }
    if (method !== ALLOWED_METHOD) {
      return errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed', { Allow: ALLOWED_METHOD });
    }

    const query = readQuery(event);
    if (!query.ok) {
      return errorResponse(400, 'BAD_REQUEST', query.message);
    }

    const data = filterProvinces(PROVINCES, query.q);
    return json(200, { data, total: data.length }, { 'Cache-Control': CACHE_CONTROL_OK });
  } catch (err) {
    console.error('Unhandled error', err?.name ?? 'Error');
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  }
}
