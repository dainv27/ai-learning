import test from "node:test";
import assert from "node:assert/strict";
import { handleHealth } from "../../be/lambda/src/health.js";

function makeEvent(method, rawPath, extra = {}) {
  return {
    version: "2.0",
    rawPath,
    rawQueryString: "",
    headers: { accept: "application/json" },
    requestContext: { http: { method, path: rawPath } },
    isBase64Encoded: false,
    ...extra,
  };
}

test("[TC-001] GET /health returns 200 with exact body {\"status\":\"ok\"}", () => {
  const res = handleHealth(makeEvent("GET", "/health"));
  assert.ok(res, "handleHealth must return a response for GET /health");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, '{"status":"ok"}');
});

test("[TC-002] response has JSON content-type, string body and only the status key", () => {
  const res = handleHealth(makeEvent("GET", "/health"));
  assert.ok(res);
  assert.equal(res.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(typeof res.body, "string", "body must be a JSON string, not an object");
  assert.deepEqual(JSON.parse(res.body), { status: "ok" });
});

test("[TC-003] health works with a minimal event, independent of any data", () => {
  const res = handleHealth({
    rawPath: "/health",
    requestContext: { http: { method: "GET" } },
  });
  assert.ok(res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { status: "ok" });
});

test("[TC-003] health ignores query string and extra headers", () => {
  const res = handleHealth(
    makeEvent("GET", "/health", {
      rawQueryString: "x=1",
      queryStringParameters: { x: "1" },
      headers: { accept: "text/html", "x-custom": "y" },
    })
  );
  assert.ok(res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body, '{"status":"ok"}');
});

for (const method of ["POST", "PUT", "PATCH", "DELETE", "HEAD"]) {
  test(`[TC-004] ${method} /health returns 405 with Allow: GET`, () => {
    const res = handleHealth(makeEvent(method, "/health"));
    assert.ok(res, `${method} /health must be answered, not fall through`);
    assert.equal(res.statusCode, 405);
    assert.equal(res.headers.allow ?? res.headers.Allow, "GET");
    assert.equal(typeof res.body, "string");
    const parsed = JSON.parse(res.body);
    assert.equal(typeof parsed.error, "object");
    assert.equal(typeof parsed.error.code, "string");
    assert.equal(typeof parsed.error.message, "string");
  });
}

test("[TC-005] other paths return null so existing routes are unaffected", () => {
  for (const method of ["GET", "POST"]) {
    for (const path of ["/provinces", "/healthz", "/", "/provinces/01"]) {
      assert.equal(
        handleHealth(makeEvent(method, path)),
        null,
        `${method} ${path} must fall through`
      );
    }
  }
});

test("[TC-006] malformed events do not throw and return null", () => {
  for (const ev of [undefined, null, {}, { rawPath: "/provinces" }]) {
    let res;
    assert.doesNotThrow(() => {
      res = handleHealth(ev);
    });
    assert.equal(res, null);
  }
});
