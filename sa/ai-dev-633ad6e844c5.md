# Architecture Design — Create a tiny AWS Lambda (Node.js 22, API Gateway HTTP API) with GET /echo that returns the q query parameter as JSON {"echo": q}. Any other method returns 405. No UI.

- Workflow: `ai-dev-633ad6e844c5`
- Repository (logical): `time-api`
- Module: `lambda`

## Requirement

Create a tiny AWS Lambda (Node.js 22, API Gateway HTTP API) with GET /echo that returns the q query parameter as JSON {"echo": q}. Any other method returns 405. No UI.

## Decision

Build a zero-dependency Node.js 22 ES-module Lambda in lambda/, deployed with AWS SAM behind an API Gateway HTTP API (payload v2). Define one function `EchoFunction` whose HttpApi event is declared as `Method: ANY, Path: /echo`, not `GET /echo`. HTTP API answers an unmatched method with its own 404 and never invokes the function, so the 405 and Allow header can only come from the handler if all methods reach it. The handler in src/handler.js stays thin. It reads requestContext.http.method and rawPath. For any method other than GET it returns 405 with `Allow: GET`. For GET on /echo it passes event.queryStringParameters to a pure function `buildEcho(params)` in src/echo.js, which returns the echo payload. The 200 response body is the JSON string `{"echo": q}` with q as a string. Missing q decision: when q is absent or empty, return 400 with the standard error shape `{error:{code:"MISSING_Q",message:"..."}}`, because the API baseline says to reject bad input rather than invent a null echo. A path other than /echo returns 404 in the same error shape. Responses set Content-Type `application/json; charset=utf-8` and `Cache-Control: no-store`. Any unexpected exception returns 500 with a generic message. Tests use node:test against the exported handler with realistic v2 events and cover 200, 400, 404, 405 and 500.

## Components

- lambda/template.yaml (SAM: EchoFunction nodejs22.x, Timeout, MemorySize, HttpApi event ANY /echo, Output with endpoint URL)
- lambda/src/handler.js (thin v2 handler: method/path routing, response building)
- lambda/src/echo.js (pure buildEcho(params) function)
- lambda/package.json (type: module, test script using node --test, no runtime dependencies)
- lambda/test/handler.test.js (node:test, status code coverage via exported handler)
- lambda/test/echo.test.js (node:test unit tests for buildEcho)

## Constraints

- The route must be `Method: ANY, Path: /echo`. A `GET /echo` route makes API Gateway answer other methods itself, so the handler's 405 would never run and QA would fail the 405 test against the template.
- The handler must read the HTTP API v2 fields (requestContext.http.method, rawPath, queryStringParameters). v1 fields like httpMethod would break every request.
- The 405 response must include `Allow: GET` and the standard JSON error body.
- A successful 200 body must be exactly the JSON string `{"echo": q}` with q as a string. The echo value must go through JSON.stringify only, with no string concatenation, so quotes and special characters in q cannot break the JSON.
- Missing or empty q returns 400, not 200 with null. This is the one open point flagged by Lan; the design commits to 400 and QA should test it.
- Zero runtime dependencies and ES modules only. The SAM template must not hardcode account ids, regions or secrets, and must use no IAM beyond the default basic execution role.
- Responses must never leak stack traces or internal error messages.
- The handler module must export `handler` as a named export so node:test can import it directly.

## Knowledge applied

- `K-seed-aws-lambda-node` AWS Lambda (Node.js) functions behind API Gateway: engineering standard
- `K-seed-api-design` REST API design baseline
- `ai-dev-17ae4234d530` Server time API on Lambda
- `ai-dev-8439078d4d3d` Refactor smoke: uptime endpoint
- `ai-dev-d7f18c95f188` Vietnam provinces API on Lambda

> Written by Kiến (Architect) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).