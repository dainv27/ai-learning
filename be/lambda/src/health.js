const JSON_HEADERS = Object.freeze({
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
});

const HEALTH_PATH = "/health";

export function getHttpMethod(event) {
  const method = event?.requestContext?.http?.method;
  return typeof method === "string" ? method.toUpperCase() : undefined;
}

export function getRawPath(event) {
  const path = event?.rawPath;
  return typeof path === "string" ? path : undefined;
}

export function isHealthRoute(event) {
  return getRawPath(event) === HEALTH_PATH;
}

export function buildHealthBody() {
  return JSON.stringify({ status: "ok" });
}

export function buildMethodNotAllowed() {
  return {
    statusCode: 405,
    headers: { ...JSON_HEADERS, allow: "GET" },
    body: JSON.stringify({
      error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
    }),
  };
}

/**
 * Handles GET /health.
 * Returns null when the request is not for /health so that the caller can
 * continue with the existing provinces routes and their 404 fallback.
 * Does not touch the province data.
 */
export function handleHealth(event) {
  if (!isHealthRoute(event)) {
    return null;
  }

  if (getHttpMethod(event) !== "GET") {
    return buildMethodNotAllowed();
  }

  return {
    statusCode: 200,
    headers: { ...JSON_HEADERS },
    body: buildHealthBody(),
  };
}
