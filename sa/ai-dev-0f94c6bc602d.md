# Architecture Design — Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

- Workflow: `ai-dev-0f94c6bc602d`
- Repository (logical): `vn-provinces-api`
- Module: `lambda`

## Requirement

Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

## Decision

Build a zero-dependency Node.js 22 ES-module Lambda deployed with AWS SAM behind an HTTP API (payload v2). The handler in `src/handler.js` stays thin. It checks the method and path, validates `q`, calls pure functions, and returns `{statusCode, headers, body}` with a JSON string body. The 63 provinces live in `src/data/provinces.js` as a frozen array of `{code, name}` sorted by `code`. They use the pre-2025-merger list of 63 units, with GSO administrative codes. Each entry's normalized search key is precomputed once at module scope, so warm invocations reuse it. `src/normalize.js` exports `normalizeText(s)`. It lowercases, applies NFD, strips combining marks U+0300–U+036F, explicitly maps `đ` to `d`, then trims and collapses whitespace. NFD alone does not handle `đ`. `src/provinces.js` exports `filterProvinces(list, q)`, which does a substring match of the normalized `q` against the precomputed normalized names and keeps the code order. Behaviour: GET /provinces returns 200 `{data:[{code,name}], total}`. An absent or empty `q` returns all 63. Repeated or non-string `q`, or `q` longer than 100 characters, returns 400. Any method other than GET on /provinces returns 405 with `Allow: GET`. Any other path returns 404. Unexpected exceptions return 500 with a generic message and no internals. Every error uses `{error:{code,message}}`. All responses send `Content-Type: application/json; charset=utf-8`. 200 responses send `Cache-Control: public, max-age=3600`, and errors send `no-store`. The list is naturally bounded at 63, so there is no pagination. `template.yaml` defines one `AWS::Serverless::Function` (`nodejs22.x`, explicit Timeout and MemorySize, no extra IAM policies) with an HttpApi event on `ANY /provinces`, so the Lambda itself produces the 405 contract. It has an Output with the endpoint URL. There is no frontend deliverable, since the requirement is API-only.

## Components

- lambda/src/handler.js (exported `handler`: method and path dispatch, q validation, response building)
- lambda/src/normalize.js (`normalizeText`: NFD, strip combining marks, đ→d, lowercase)
- lambda/src/provinces.js (`filterProvinces` pure function plus module-scope precomputed index)
- lambda/src/data/provinces.js (frozen static array of 63 `{code, name}` entries)
- lambda/src/response.js (`json(statusCode, body, extraHeaders)` and `errorResponse(status, code, message)` helpers)
- lambda/template.yaml (SAM: Function, HttpApi event `ANY /provinces`, Outputs)
- lambda/package.json (`type: module`, `npm test` script, no runtime dependencies)
- lambda/test/handler.test.js, lambda/test/normalize.test.js, lambda/test/data.test.js (node:test)

## Constraints

- Runtime must be `nodejs22.x` with ES modules (`"type":"module"`). Use no runtime dependencies and no build step. Tests use only `node:test`.
- The handler must read the HTTP API v2 event shape: `requestContext.http.method`, `rawPath`, `queryStringParameters`, which may be undefined. It must not assume REST API v1 fields.
- Diacritic-insensitive search must handle `đ`/`Đ` explicitly. Tests must show that `da nang`, `DONG NAI`, `đà nẵng` and `hà nội` all match, and that NFC and NFD input give identical results.
- The data must be exactly 63 entries with unique codes and unique names, and correct Vietnamese spelling with diacritics. A data test must assert count 63, uniqueness and non-empty names. Do not switch to the post-2025 34-province list. The requirement says 63.
- `q` validation: it must be a string, at most 100 characters after trimming, and an empty string means no filter. Anything else returns 400 with a JSON error. A non-matching `q` returns 200 with `data: []` and `total: 0`, not 404.
- Every status code must be covered by a test: 200 (all, filtered, empty result), 400 (too-long `q`, bad `q`), 404 (unknown path), 405 (POST, PUT, DELETE, HEAD, OPTIONS with `Allow: GET`), and 500 (forced internal error with no stack or message leaked).
- Response ordering must be deterministic (by `code`). The body must be UTF-8 JSON with real diacritic characters, not escaped or mangled.
- `template.yaml` must have no hardcoded account IDs, regions or secrets. Use least-privilege IAM (no added policies), explicit `Timeout` and `MemorySize`, and an Output for the endpoint URL.
- Scope is the `lambda` module only. Do not add frontend, authentication or database resources, and do not touch files outside `lambda/`.

## Knowledge applied

- `K-seed-aws-lambda-node` AWS Lambda (Node.js) functions behind API Gateway: engineering standard
- `K-seed-api-design` REST API design baseline
- `ai-dev-515e00e21f85` Test Task

> Written by Kiến (Architect) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).