import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createHandler, handler } from "../../be/lambda/src/handler.js";
import { computeUptimeSeconds, containerStartMs } from "../../be/lambda/src/uptime.js";

function makeEvent(method, rawPath = "/uptime", extra = {}) {
  return {
    version: "2.0",
    routeKey: `ANY ${rawPath}`,
    rawPath,
    rawQueryString: "",
    headers: { host: "abc123.execute-api.example.amazonaws.com" },
    requestContext: {
      http: { method, path: rawPath, protocol: "HTTP/1.1", sourceIp: "203.0.113.1" },
    },
    isBase64Encoded: false,
    ...extra,
  };
}

function header(res, name) {
  const key = Object.keys(res.headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : res.headers[key];
}

function assertCommon(res) {
  const ct = header(res, "content-type");
  assert.ok(typeof ct === "string" && ct.toLowerCase().startsWith("application/json"), `content-type was ${ct}`);
  assert.equal(header(res, "cache-control"), "no-store");
  assert.equal(typeof res.body, "string", "body must be a JSON string");
  JSON.parse(res.body);
}

const quiet = async (fn) => {
  const orig = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = orig;
  }
};

// ---------- TS-1 ----------

test("[TC-001] GET /uptime returns 200 with numeric uptimeSeconds", async () => {
  const h = createHandler({ now: () => 17_500, start: 5000 });
  const res = await h(makeEvent("GET"));
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.deepEqual(Object.keys(body), ["uptimeSeconds"]);
  assert.equal(typeof body.uptimeSeconds, "number");
  assert.ok(body.uptimeSeconds >= 12 && body.uptimeSeconds < 13, `got ${body.uptimeSeconds}`);
});

test("[TC-001] default exported handler returns a non-negative finite number", async () => {
  const res = await handler(makeEvent("GET"));
  assert.equal(res.statusCode, 200);
  const { uptimeSeconds } = JSON.parse(res.body);
  assert.equal(typeof uptimeSeconds, "number");
  assert.ok(Number.isFinite(uptimeSeconds) && uptimeSeconds >= 0);
});

test("[TC-002] 200, 405 and 404 responses all carry JSON content type and no-store", async () => {
  const h = createHandler({ now: () => 3000, start: 0 });
  for (const ev of [makeEvent("GET"), makeEvent("POST"), makeEvent("GET", "/other")]) {
    const res = await h(ev);
    assertCommon(res);
  }
});

for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
  test(`[TC-003] ${method} /uptime returns 405 with Allow: GET`, async () => {
    const h = createHandler({ now: () => 1000, start: 0 });
    const res = await h(makeEvent(method));
    assert.equal(res.statusCode, 405);
    assert.equal(header(res, "allow"), "GET");
  });
}

for (const method of ["HEAD", "OPTIONS"]) {
  test(`[TC-004] ${method} /uptime returns 405 with Allow: GET`, async () => {
    const h = createHandler({ now: () => 1000, start: 0 });
    const res = await h(makeEvent(method));
    assert.equal(res.statusCode, 405);
    assert.equal(header(res, "allow"), "GET");
    assertCommon(res);
  });
}

test("[TC-005] 405 body uses the { error: { code, message } } shape", async () => {
  const h = createHandler({ now: () => 1000, start: 0 });
  const res = await h(makeEvent("POST"));
  const body = JSON.parse(res.body);
  assert.ok(typeof body.error?.code === "string" && body.error.code.length > 0);
  assert.ok(typeof body.error?.message === "string" && body.error.message.length > 0);
  assert.equal(body.uptimeSeconds, undefined);
});

test("[TC-006] unknown paths return 404 with the error shape", async () => {
  const h = createHandler({ now: () => 1000, start: 0 });
  for (const p of ["/nope", "/"]) {
    const res = await h(makeEvent("GET", p));
    assert.equal(res.statusCode, 404, `path ${p}`);
    assertCommon(res);
    const body = JSON.parse(res.body);
    assert.ok(typeof body.error?.code === "string");
    assert.ok(typeof body.error?.message === "string");
  }
});

test("[TC-007] warm invocations on one handler are non-decreasing and never reset", async () => {
  let t = 1000;
  const h = createHandler({ now: () => t, start: 1000 });
  const read = async () => JSON.parse((await h(makeEvent("GET"))).body).uptimeSeconds;
  const a = await read();
  t += 3000;
  const b = await read();
  t += 7000;
  const c = await read();
  assert.ok(a >= 0 && a < 1, `a=${a}`);
  assert.ok(b >= 3 && b < 4, `b=${b}`);
  assert.ok(c >= 10 && c < 11, `c=${c}`);
  assert.ok(b >= a && c >= b);
});

test("[TC-007] default handler called twice returns non-decreasing uptime", async () => {
  const first = JSON.parse((await handler(makeEvent("GET"))).body).uptimeSeconds;
  const second = JSON.parse((await handler(makeEvent("GET"))).body).uptimeSeconds;
  assert.ok(second >= first, `second ${second} < first ${first}`);
});

test("[TC-008] unexpected exception yields a generic 500 without leaking internals", async () => {
  const h = createHandler({
    now: () => {
      throw new Error("secret internal detail");
    },
    start: 0,
  });
  const res = await quiet(() => h(makeEvent("GET")));
  assert.equal(res.statusCode, 500);
  assertCommon(res);
  const body = JSON.parse(res.body);
  assert.ok(typeof body.error?.code === "string");
  assert.ok(!res.body.includes("secret"), "internal message leaked");
  assert.ok(!/\bat .*\(.*:\d+:\d+\)/.test(res.body), "stack trace leaked");
});

test("[TC-009] v1-shaped event is not served as GET /uptime", async () => {
  const h = createHandler({ now: () => 1000, start: 0 });
  const res = await h({ httpMethod: "GET", path: "/uptime" });
  assert.notEqual(res.statusCode, 200);
  assert.notEqual(res.statusCode, 500);
  assertCommon(res);
});

test("[TC-009] empty event does not throw or return 500", async () => {
  const h = createHandler({ now: () => 1000, start: 0 });
  const res = await quiet(() => h({}));
  assert.ok([400, 404, 405].includes(res.statusCode), `status ${res.statusCode}`);
  assertCommon(res);
});

test("[TC-010] GET /uptime with a query string still returns 200", async () => {
  const h = createHandler({ now: () => 4000, start: 0 });
  const res = await h(makeEvent("GET", "/uptime", { rawQueryString: "a=1", queryStringParameters: { a: "1" } }));
  assert.equal(res.statusCode, 200);
  assert.equal(typeof JSON.parse(res.body).uptimeSeconds, "number");
});

// ---------- TS-2 ----------

test("[TC-011] computeUptimeSeconds computes whole non-negative seconds", () => {
  assert.equal(computeUptimeSeconds(1000, 1000), 0);
  assert.equal(computeUptimeSeconds(0, 5000), 5);
  const partial = computeUptimeSeconds(0, 5999);
  assert.ok(partial >= 5 && partial < 6, `got ${partial}`);
  assert.equal(computeUptimeSeconds(5000, 1000), 0);
});

test("[TC-011] computeUptimeSeconds returns a non-negative number for non-finite input", () => {
  for (const [s, n] of [[0, NaN], [undefined, 1000], [0, Infinity]]) {
    const r = computeUptimeSeconds(s, n);
    assert.equal(typeof r, "number");
    assert.ok(r >= 0, `got ${r} for ${s},${n}`);
  }
});

test("[TC-012] container start is captured once at module scope", async () => {
  assert.equal(typeof containerStartMs, "number");
  assert.ok(Number.isFinite(containerStartMs));
  const before = containerStartMs;
  const res = await handler(makeEvent("GET"));
  await handler(makeEvent("GET"));
  await handler(makeEvent("POST"));
  assert.equal(containerStartMs, before, "start time changed after invocations");
  const { uptimeSeconds } = JSON.parse(res.body);
  const expected = computeUptimeSeconds(before, performance.now());
  assert.ok(Math.abs(uptimeSeconds - expected) <= 1, `uptime ${uptimeSeconds} vs elapsed ${expected}`);
});

// ---------- TS-3 ----------

test("[TC-013] template.yaml declares Method ANY on /uptime with safe configuration", () => {
  const t = readFileSync(new URL("../../be/lambda/template.yaml", import.meta.url), "utf8");
  assert.match(t, /Method:\s*ANY\b/, "route must be Method: ANY");
  assert.match(t, /Path:\s*\/uptime\b/);
  assert.doesNotMatch(t, /Method:\s*GET\b/, "GET-only route would make API Gateway answer 404");
  assert.match(t, /Runtime:\s*nodejs22\.x/);
  assert.match(t, /Timeout:\s*\d+/);
  assert.match(t, /MemorySize:\s*\d+/);
  assert.match(t, /HttpApi/);
  assert.match(t, /^Outputs:/m);
  assert.match(t, /Handler:\s*src\/handler\.handler/);
  assert.doesNotMatch(t, /^\s*Policies:/m, "no extra IAM policies allowed");
  assert.doesNotMatch(t, /\b\d{12}\b/, "no hardcoded account id");
});

test("[TC-014] package.json is an ES module with no runtime dependencies", () => {
  const pkg = JSON.parse(readFileSync(new URL("../../be/lambda/package.json", import.meta.url), "utf8"));
  assert.equal(pkg.type, "module");
  assert.ok(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0);
});
