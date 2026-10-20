import { test } from "node:test";
import assert from "node:assert/strict";
import { handleHealth } from "../src/health.js";

function makeEvent(method, rawPath) {
  return {
    version: "2.0",
    rawPath,
    rawQueryString: "",
    headers: { accept: "application/json" },
    requestContext: { http: { method, path: rawPath } },
    isBase64Encoded: false,
  };
}

test("GET /health returns 200 with exact body {\"status\":\"ok\"}", () => {
  const res = handleHealth(makeEvent("GET", "/health"));
  assert.ok(res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, '{"status":"ok"}');
  assert.deepEqual(JSON.parse(res.body), { status: "ok" });
});

test("GET /health sets JSON content-type with UTF-8 charset", () => {
  const res = handleHealth(makeEvent("GET", "/health"));
  assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
});

test("GET /health sets no-store cache-control", () => {
  const res = handleHealth(makeEvent("GET", "/health"));
  assert.equal(res.headers["cache-control"], "no-store");
});

test("method is matched case-insensitively for GET", () => {
  const res = handleHealth(makeEvent("get", "/health"));
  assert.equal(res.statusCode, 200);
});

test("POST /health returns 405 with Allow: GET", () => {
  const res = handleHealth(makeEvent("POST", "/health"));
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET");
  assert.deepEqual(JSON.parse(res.body), {
    error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
  });
});

test("HEAD /health returns 405 with Allow: GET", () => {
  const res = handleHealth(makeEvent("HEAD", "/health"));
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.allow, "GET");
});

test("non-health paths return null so existing routes are unaffected", () => {
  assert.equal(handleHealth(makeEvent("GET", "/provinces")), null);
  assert.equal(handleHealth(makeEvent("GET", "/healthz")), null);
  assert.equal(handleHealth(makeEvent("POST", "/provinces")), null);
});

test("event without requestContext does not throw and returns null for non-health path", () => {
  assert.equal(handleHealth({ rawPath: "/provinces" }), null);
});

test("event with missing method on /health returns 405", () => {
  const res = handleHealth({ rawPath: "/health", requestContext: {} });
  assert.equal(res.statusCode, 405);
});
