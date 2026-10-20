import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as mod from "../../be/lambda/src/handler.js";

const read = (rel) => readFileSync(new URL(`../../be/lambda/${rel}`, import.meta.url), "utf8");

test("[TC-028] package.json: ES modules and no runtime dependencies", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.type, "module");
  assert.deepEqual(Object.keys(pkg.dependencies || {}), []);
});

test("[TC-028] template.yaml: runtime, handler wiring, HttpApi event, least privilege", () => {
  const t = read("template.yaml");
  assert.match(t, /Runtime:\s*nodejs22\.x/);
  assert.match(t, /Timeout:\s*\d+/);
  assert.match(t, /MemorySize:\s*\d+/);
  assert.match(t, /Type:\s*HttpApi/);
  assert.match(t, /Method:\s*GET/);
  assert.match(t, /Path:\s*\/provinces/);
  assert.match(t, /Outputs:/);
  assert.ok(!/Policies:/.test(t), "no extra IAM policies expected");
  assert.ok(!/\b\d{12}\b/.test(t), "no hardcoded account id");
  assert.ok(!/\b(us|eu|ap|sa|ca|me|af)-[a-z]+-\d\b/.test(t), "no hardcoded region");
  const m = t.match(/Handler:\s*([\w./-]+)\.(\w+)\s*$/m);
  assert.ok(m, "Handler must be defined as <file>.<export>");
  assert.equal(m[1], "src/handler");
  assert.equal(typeof mod[m[2]], "function", "Handler export must be a function");
});

test("[TC-028] search never builds a RegExp from user input", () => {
  const src = read("src/search.js");
  assert.ok(!/new\s+RegExp/.test(src));
});
