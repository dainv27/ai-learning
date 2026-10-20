import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { handler } from "../../be/lambda/src/handler.js";
import { PROVINCES } from "../../be/lambda/src/data/provinces.js";

function makeEvent({ method = "GET", rawPath = "/provinces", query } = {}) {
  return {
    version: "2.0",
    routeKey: "GET /provinces",
    rawPath,
    rawQueryString: query ? new URLSearchParams(query).toString() : "",
    queryStringParameters: query,
    headers: { accept: "application/json" },
    requestContext: {
      http: { method, path: rawPath, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "qa" },
      requestId: "qa-request",
      stage: "$default",
    },
    isBase64Encoded: false,
  };
}

function header(res, name) {
  const key = Object.keys(res.headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
  return key === undefined ? undefined : res.headers[key];
}

async function call(query, extra = {}) {
  const res = await handler(makeEvent({ query, ...extra }));
  return res;
}

function assertErrorShape(res) {
  assert.equal(typeof res.body, "string", "body must be a JSON string");
  const body = JSON.parse(res.body);
  assert.deepEqual(Object.keys(body), ["error"]);
  assert.equal(typeof body.error.code, "string");
  assert.ok(body.error.code.length > 0);
  assert.equal(typeof body.error.message, "string");
  assert.ok(body.error.message.length > 0);
}

async function silentlyBroken() {
  const errorLog = mock.method(console, "error", () => {});
  try {
    const event = {
      rawPath: "/provinces",
      requestContext: { http: { method: "GET" } },
      get queryStringParameters() {
        throw new Error("boom secret internal detail");
      },
    };
    const res = await handler(event);
    return { res, calls: errorLog.mock.callCount() };
  } finally {
    errorLog.mock.restore();
  }
}

test("[TC-011] GET without q returns all 63 provinces", async () => {
  const res = await call(undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(typeof res.body, "string");
  const body = JSON.parse(res.body);
  assert.equal(body.total, 63);
  assert.equal(body.data.length, 63);
  for (const item of body.data) {
    assert.equal(typeof item.code, "string");
    assert.equal(typeof item.name, "string");
  }
  assert.ok(res.body.includes("Đà Nẵng"), "UTF-8 names must be serialized unmangled");
  assert.ok(body.data.some((p) => p.name === "Hà Nội"));
});

test("[TC-012] empty q, unrelated params and missing query map return all 63", async () => {
  for (const query of [{ q: "" }, { foo: "bar" }, undefined, { q: "   " }]) {
    const res = await call(query);
    assert.equal(res.statusCode, 200, `query ${JSON.stringify(query)}`);
    assert.equal(JSON.parse(res.body).total, 63, `query ${JSON.stringify(query)}`);
  }
});

test("[TC-013] q='da nang' matches Đà Nẵng", async () => {
  const res = await call({ q: "da nang" });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.total, 1);
  assert.equal(body.data[0].name, "Đà Nẵng");
});

test("[TC-014] q='dong nai' matches Đồng Nai", async () => {
  const res = await call({ q: "dong nai" });
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.total, 1);
  assert.equal(body.data[0].name, "Đồng Nai");
});

test("[TC-015] search ignores case and accents in the query itself", async () => {
  const cases = [
    ["HA NOI", "Hà Nội"],
    ["Đà Nẵng", "Đà Nẵng"],
    ["ĐÀ NẴNG", "Đà Nẵng"],
    ["Đà Nẵng".normalize("NFD"), "Đà Nẵng"],
    ["  da   nang  ", "Đà Nẵng"],
    ["hồ chí minh", "TP. Hồ Chí Minh"],
    ["THUA THIEN", "Thừa Thiên Huế"],
  ];
  for (const [q, name] of cases) {
    const res = await call({ q });
    assert.equal(res.statusCode, 200, `q=${q}`);
    const names = JSON.parse(res.body).data.map((p) => p.name);
    assert.ok(
      names.some((n) => n === name || n.endsWith(name.replace(/^TP\. /, ""))),
      `q=${q} should match ${name}, got ${JSON.stringify(names)}`,
    );
  }
  const ha = JSON.parse((await call({ q: "HA NOI" })).body);
  assert.equal(ha.total, 1);
});

test("[TC-016] partial match returns several results ordered by code", async () => {
  // 'quang' is a substring of the five Quảng provinces AND of Tuyên Quang (code 08).
  const quang = JSON.parse((await call({ q: "quang" })).body);
  assert.deepEqual(quang.data.map((p) => p.code), ["08", "22", "44", "45", "49", "51"]);
  assert.equal(quang.total, 6);
  const ha = JSON.parse((await call({ q: "ha" })).body);
  assert.ok(ha.total > 1);
  const codes = ha.data.map((p) => p.code);
  assert.deepEqual(codes, [...codes].sort());
  const all = JSON.parse((await call(undefined)).body);
  const allCodes = all.data.map((p) => p.code);
  assert.deepEqual(allCodes, [...allCodes].sort());
});

test("[TC-017] no match returns 200 with an empty list", async () => {
  const res = await call({ q: "zzz" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { data: [], total: 0 });
});

test("[TC-018] q of exactly 100 characters is accepted", async () => {
  const res = await call({ q: "a".repeat(100) });
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).total, 0);
});

test("[TC-019] q longer than 100 characters returns 400", async () => {
  for (const len of [101, 5000]) {
    const res = await call({ q: "a".repeat(len) });
    assert.equal(res.statusCode, 400, `length ${len}`);
    assertErrorShape(res);
  }
});

test("[TC-020] repeated or non-string q returns 400", async () => {
  for (const q of ["ha,noi", ["ha", "noi"], 5, { a: 1 }]) {
    const res = await handler({ ...makeEvent(), queryStringParameters: { q } });
    assert.equal(res.statusCode, 400, `q=${JSON.stringify(q)}`);
    assertErrorShape(res);
  }
});

test("[TC-021] regex metacharacters in q are matched literally and never crash", async () => {
  for (const q of [".*", "(", "[", "\\", "+", "?", "(a+)+$"]) {
    const res = await call({ q });
    assert.equal(res.statusCode, 200, `q=${q}`);
    assert.equal(JSON.parse(res.body).total, 0, `q=${q} must not match as a pattern`);
  }
});

test("[TC-022] unknown path returns 404", async () => {
  for (const rawPath of ["/districts", "/"]) {
    const res = await handler(makeEvent({ rawPath }));
    assert.equal(res.statusCode, 404, rawPath);
    assertErrorShape(res);
  }
});

test("[TC-023] non-GET method returns 405 with Allow: GET", async () => {
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    const res = await handler(makeEvent({ method }));
    assert.equal(res.statusCode, 405, method);
    assert.equal(header(res, "Allow"), "GET", method);
    assertErrorShape(res);
  }
});

test("[TC-024] unexpected failure returns a generic 500 and leaks nothing", async () => {
  const { res, calls } = await silentlyBroken();
  assert.equal(res.statusCode, 500);
  assertErrorShape(res);
  assert.ok(!/boom|secret|internal detail|stack|\n\s+at /i.test(res.body), `body leaked internals: ${res.body}`);
  assert.ok(calls >= 1, "error must be logged server-side");
});

test("[TC-025] headers: JSON UTF-8 content type, cache policy per status", async () => {
  const ok = await call(undefined);
  const bad = await call({ q: "a".repeat(101) });
  const nf = await handler(makeEvent({ rawPath: "/x" }));
  const na = await handler(makeEvent({ method: "POST" }));
  const { res: err } = await silentlyBroken();
  for (const [label, res] of [["200", ok], ["400", bad], ["404", nf], ["405", na], ["500", err]]) {
    assert.equal(header(res, "Content-Type"), "application/json; charset=utf-8", label);
  }
  assert.equal(header(ok, "Cache-Control"), "public, max-age=86400");
  for (const res of [bad, nf, na, err]) {
    assert.equal(header(res, "Cache-Control"), "no-store");
  }
});

test("[TC-026] repeated invocations are stable and do not mutate shared state", async () => {
  const first = (await call(undefined)).body;
  const parsed = JSON.parse((await call({ q: "da nang" })).body);
  parsed.data.length = 0;
  await call({ q: "quang" });
  const again = (await call(undefined)).body;
  assert.equal(again, first, "response must be identical across invocations");
  assert.equal(JSON.parse(again).total, 63);
  assert.equal(PROVINCES.length, 63);
  const dn = JSON.parse((await call({ q: "da nang" })).body);
  assert.equal(dn.total, 1);
  assert.equal(dn.data[0].name, "Đà Nẵng");
});

test("[TC-027] 400, 404 and 405 use the standard error shape", async () => {
  const responses = [
    await call({ q: "a".repeat(101) }),
    await handler(makeEvent({ rawPath: "/nope" })),
    await handler(makeEvent({ method: "POST" })),
  ];
  for (const res of responses) {
    assertErrorShape(res);
  }
});
