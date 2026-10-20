# Architecture Design — Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

- Workflow: `ai-dev-d7f18c95f188`
- Repository (logical): `vn-provinces-api`
- Module: `lambda`

## Requirement

Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

## Decision

Build a zero-dependency Node.js 22 ES-module Lambda in lambda/, deployed with AWS SAM behind an API Gateway HTTP API (payload v2). `src/handler.js` stays thin: it checks method and path from requestContext.http and rawPath, validates the `q` query parameter, calls a pure search function and returns { statusCode, headers, body } with a JSON string body. Province data lives in a static `src/data/provinces.js` module exporting a frozen array of 63 entries { code, name }. It is loaded at module scope, sorted deterministically by code, and each entry gets a precomputed normalized search key at load time. Normalization lives in `src/normalize.js` as one pure function: NFD, strip combining marks \p{M}, map đ/Đ to d explicitly (NFD does not decompose them), lowercase, trim and collapse whitespace. `src/search.js` filters by substring match of the normalized q against the precomputed key. Without q, or with an empty q, it returns all 63. The 200 response is { data: [...], total: n }. Errors use { error: { code, message } }: 400 for q that is not a single string (repeated q params arrive comma-joined in v2, so check for this) or is longer than 100 characters, 404 for unknown paths, 405 with an Allow: GET header for other methods, and 500 as a generic message without internals. All responses set Content-Type: application/json; charset=utf-8 and a deliberate Cache-Control (public, max-age=86400 on 200 because the data is static, no-store on errors). Tests use node:test against the exported handler with realistic v2 events. The API is complete and requires no frontend deliverable.

## Components

- lambda/src/handler.js (exported handler, routing, input validation, response building)
- lambda/src/normalize.js (diacritic/case-insensitive normalization with explicit đ/Đ mapping)
- lambda/src/search.js (pure filter over the preloaded province list)
- lambda/src/data/provinces.js (frozen list of 63 provinces/cities with code and name, plus precomputed search keys)
- lambda/src/response.js (json response helper with headers and error-shape builder)
- lambda/test/handler.test.js (node:test: 200 all, 200 filtered, 400, 404, 405, 500 path)
- lambda/test/normalize.test.js (node:test: diacritics, đ/Đ, case, whitespace)
- lambda/test/provinces.test.js (node:test: exactly 63 entries, unique codes and names, no empty names)
- lambda/template.yaml (SAM: AWS::Serverless::Function nodejs22.x, explicit Timeout and MemorySize, HttpApi event GET /provinces, no extra IAM policies, Output with the endpoint URL)
- lambda/package.json (type: module, test script using node --test, no runtime dependencies)

## Constraints

- Runtime must be nodejs22.x with ES modules ("type": "module"); no runtime dependencies, no bundler, so the SAM CodeUri deploys as-is.
- Normalization must handle đ/Đ explicitly: NFD alone fails "dong nai" and "da nang". Tests must assert q="da nang" matches "Đà Nẵng" and q="dong nai" matches "Đồng Nai". Also cover precomposed and decomposed input forms of the same name.
- The dataset must be exactly 63 entries with unique codes and names and must follow the official pre-2025-merger list of 63 provinces/cities (including Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hải Phòng, Cần Thơ). A test must assert the count of 63.
- Results are always returned in a deterministic order (by code) and the response is bounded (63 items max, no pagination needed). Do not mutate the shared module-scope array between invocations.
- Treat q as untrusted: it must be a string of at most 100 characters; otherwise return 400 with the standard error shape. Match by plain substring, never build a RegExp from user input.
- Support only the HTTP API v2 event shape. Return 405 with an Allow: GET header for non-GET methods and 404 for other paths. Never leak stack traces or internals in a 500, and log errors server-side only.
- SAM template: no hardcoded account IDs, regions or secrets; least-privilege (no extra IAM policies, since the function needs none); the Output exposes the API URL.
- Scope is limited to the lambda/ module. Do not touch files outside lambda/ and do not add frontend files. No production or AWS account access is available, so verification is limited to local node --test, and `sam validate` only if the SAM CLI is present.

## Knowledge applied

- `K-seed-aws-lambda-node` AWS Lambda (Node.js) functions behind API Gateway: engineering standard
- `K-seed-api-design` REST API design baseline
- `ai-dev-0f94c6bc602d` Vietnam provinces API on Lambda

> Written by Kiến (Architect) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).