import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getNow } from "../../be/lambda/src/time.js";
import { createHandler, handler as defaultHandler } from "../../be/lambda/src/handler.js";

const ISO_UTC_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FIXED = new Date("2024-05-01T12:34:56.789Z");
const FIXED_ISO = "2024-05-01T12:34:56.789Z";

function makeEvent({ method = "GET", path = "/time", query } = {}) {
  return {
    version: "2.0",
    routeKey: "ANY /time",
    rawPath: path,
    rawQueryString: query ?? "",
    queryStringParameters: query ? Object.fromEntries(new URLSearchParams(query)) : undefined,
    headers: { host: "example.execute-api.localhost", accept: "*/*" },
    requestContext: {
      accountId: "anonymous",
      apiId: "example",
      domainName: "example.execute-api.localhost",
      http: { method, path, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "node:test" },
      requestId: "qa-request",
      routeKey: "ANY /time",
      stage: "$default",
      time: "01/May/2024:12:34:56 +0000",
      timeEpoch: FIXED.getTime(),
    },
    isBase64Encoded: false,
  };
}

function header(res, name) {
  const found = Object.keys(res.headers ?? {}).find((k) => k.toLowerCase() === name.toLowerCase());
  return found === undefined ? undefined : res.headers[found];
}

const fixedHandler = createHandler(() => FIXED);

// ---------- S-1 getNow ----------

test("[TC-001] getNow returns the injected clock value as ISO 8601 UTC", () => {
  assert.deepEqual(getNow(() => FIXED), { now: FIXED_ISO });
});

test("[TC-002] getNow reads the clock on every call", () => {
  let calls = 0;
  const clock = () => {
    calls += 1;
    return new Date(Date.UTC(2024, 0, 1, 0, 0, calls));
  };
  const a = getNow(clock);
  const b = getNow(clock);
  assert.equal(calls, 2);
  assert.notEqual(a.now, b.now);
});

test("[TC-003] getNow default clock returns the real current time", () => {
  const before = Date.now();
  const r = getNow();
  const after = Date.now();
  assert.match(r.now, ISO_UTC_MS);
  const t = Date.parse(r.now);
  assert.ok(t >= before && t <= after, "now must lie within the test window");
});

// ---------- S-2 GET /time ----------

test("[TC-004] GET /time returns 200 with only {now}", async () => {
  const res = await fixedHandler(makeEvent());
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body, "string", "body must be a JSON string");
  assert.deepEqual(JSON.parse(res.body), { now: FIXED_ISO });
});

test("[TC-005] now is a UTC ISO 8601 string that round-trips", async () => {
  const res = await fixedHandler(makeEvent());
  const { now } = JSON.parse(res.body);
  assert.match(now, ISO_UTC_MS);
  assert.equal(new Date(now).toISOString(), now);
  assert.ok(now.endsWith("Z"));
});

test("[TC-006] default handler returns current time and calls are fresh", async () => {
  const before = Date.now();
  const res = await defaultHandler(makeEvent());
  const after = Date.now();
  assert.equal(res.statusCode, 200);
  const t = Date.parse(JSON.parse(res.body).now);
  assert.ok(t >= before && t <= after, "now must be generated at call time");

  let n = 0;
  const h = createHandler(() => new Date(Date.UTC(2024, 0, 1, 0, 0, ++n)));
  const r1 = JSON.parse((await h(makeEvent())).body).now;
  const r2 = JSON.parse((await h(makeEvent())).body).now;
  assert.notEqual(r1, r2, "each request must read the clock again");
});

test("[TC-007] valid tz parameter is ignored and the response stays UTC", async () => {
  const res = await fixedHandler(makeEvent({ query: "tz=Asia/Ho_Chi_Minh" }));
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { now: FIXED_ISO });
});

test("[TC-008] invalid, empty or repeated tz does not cause an error", async () => {
  for (const query of ["tz=Not/AZone", "tz=", "tz=UTC&tz=Asia/Tokyo", "tz=%00"]) {
    const res = await fixedHandler(makeEvent({ query }));
    assert.equal(res.statusCode, 200, `query ${query} must not fail`);
    assert.deepEqual(JSON.parse(res.body), { now: FIXED_ISO });
  }
});

test("[TC-009] 200 response has JSON Content-Type and Cache-Control: no-store", async () => {
  const res = await fixedHandler(makeEvent());
  assert.match(String(header(res, "content-type")), /^application\/json/);
  assert.equal(header(res, "cache-control"), "no-store");
});

// ---------- S-3 other methods, paths, errors ----------

for (const method of ["POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]) {
  test(`[TC-010] ${method} /time returns 405 with Allow: GET`, async () => {
    const res = await fixedHandler(makeEvent({ method }));
    assert.equal(res.statusCode, 405);
    assert.equal(header(res, "allow"), "GET");
  });
}

test("[TC-011] 405 body uses the {error:{code,message}} shape and has no now", async () => {
  const res = await fixedHandler(makeEvent({ method: "POST" }));
  assert.equal(typeof res.body, "string");
  const body = JSON.parse(res.body);
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
  assert.equal(typeof body.error.message, "string");
  assert.ok(body.error.message.length > 0);
  assert.equal("now" in body, false);
});

test("[TC-012] 405 and 404 carry Content-Type and Cache-Control: no-store", async () => {
  const r405 = await fixedHandler(makeEvent({ method: "POST" }));
  const r404 = await fixedHandler(makeEvent({ path: "/nope" }));
  for (const res of [r405, r404]) {
    assert.equal(typeof res.body, "string");
    JSON.parse(res.body);
    assert.match(String(header(res, "content-type")), /^application\/json/);
    assert.equal(header(res, "cache-control"), "no-store");
  }
});

test("[TC-013] unknown path returns 404 with an error body", async () => {
  const res = await fixedHandler(makeEvent({ path: "/nope" }));
  assert.equal(res.statusCode, 404);
  const body = JSON.parse(res.body);
  assert.equal(body.error.code, "NOT_FOUND");
  assert.equal(typeof body.error.message, "string");
});

test("[TC-014] unexpected exception returns a generic 500 without internals", async () => {
  const h = createHandler(() => {
    throw new Error("secret internal detail");
  });
  const res = await h(makeEvent());
  assert.equal(res.statusCode, 500);
  const body = JSON.parse(res.body);
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.ok(!res.body.includes("secret internal detail"));
  assert.ok(!/stack|at\s.+\(/i.test(res.body));
  assert.match(String(header(res, "content-type")), /^application\/json/);
  assert.equal(header(res, "cache-control"), "no-store");
});

// ---------- S-4 deployment and packaging ----------

test("[TC-015] SAM template routes ANY /time on nodejs22.x with explicit limits", () => {
  const tpl = readFileSync(new URL("../../be/lambda/template.yaml", import.meta.url), "utf8");
  assert.match(tpl, /Type:\s*HttpApi/);
  assert.match(tpl, /Method:\s*ANY\b/, "route must be ANY so that non-GET reaches the function");
  assert.match(tpl, /Path:\s*\/time\b/);
  assert.doesNotMatch(tpl, /Method:\s*GET\b/, "a GET-only route would make 405 unreachable");
  assert.match(tpl, /Runtime:\s*nodejs22\.x/);
  assert.match(tpl, /Handler:\s*src\/handler\.handler/);
  assert.match(tpl, /Timeout:\s*\d+/);
  assert.match(tpl, /MemorySize:\s*\d+/);
});

test("[TC-016] package.json is an ES module with no runtime dependencies", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../be/lambda/package.json", import.meta.url), "utf8"));
  assert.equal(pkg.type, "module");
  assert.ok(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0);
});

test("[TC-017] handler and createHandler are exported functions", () => {
  assert.equal(typeof defaultHandler, "function");
  assert.equal(typeof createHandler, "function");
});
