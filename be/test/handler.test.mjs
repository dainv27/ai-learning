import { test } from "node:test";
import assert from "node:assert/strict";
import { handler } from "../src/handler.mjs";

test("GET /provinces returns 200 with all provinces", async () => {
  const event = {
    requestContext: { http: { method: "GET" } },
    queryStringParameters: {}
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "application/json");
  assert.ok(res.headers["Cache-Control"]);
  const body = JSON.parse(res.body);
  assert.ok(Array.isArray(body));
  assert.ok(body.length >= 63);
  assert.ok(body.some(p => p.name === "Hà Nội"));
});

test("GET with q filters by name case-insensitive and diacritic-insensitive", async () => {
  const event = {
    requestContext: { http: { method: "GET" } },
    queryStringParameters: { q: "ha noi" }
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.ok(body.length === 1);
  assert.equal(body[0].name, "Hà Nội");
});

test("GET with q matching multiple returns filtered list", async () => {
  const event = {
    requestContext: { http: { method: "GET" } },
    queryStringParameters: { q: "binh" }
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.ok(body.length > 1);
  assert.ok(body.every(p => p.name.toLowerCase().includes("binh") || p.name.includes("Bình")));
});

test("Non-GET method returns 405", async () => {
  const event = {
    requestContext: { http: { method: "POST" } },
    queryStringParameters: {}
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers["Allow"], "GET");
});

test("Empty query returns all provinces", async () => {
  const event = {
    requestContext: { http: { method: "GET" } },
    queryStringParameters: { q: "" }
  };
  const res = await handler(event);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.length, 63);
});
