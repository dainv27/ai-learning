# Test Design — Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

- Workflow: `ai-dev-d7f18c95f188`
- Repository (logical): `vn-provinces-api`
- Module: `lambda`

## Requirement under test

Write an API that returns the list of Vietnam provinces (63 provinces/cities), deployed as an AWS Lambda function (Node.js 22) behind API Gateway HTTP API. GET /provinces returns all, optional q query parameter filters by name ignoring diacritics and case.

## Objective

Verify that GET /provinces on the Lambda (HTTP API payload v2) returns the 63 Vietnamese provinces and cities, that the optional q filter ignores diacritics (including đ/Đ) and case, and that every error path (400, 404, 405 with Allow, 500) follows the architect's constraints.

## Approach

Black-box tests derived from the requirement and the architect constraints, using only node:test. Unit suites cover the dataset, normalization and the pure search function. An integration suite calls the exported handler with realistic v2 events and checks status codes, headers, JSON shape, UTF-8 content, input validation, determinism and no state leaking between invocations. A configuration suite reads template.yaml and package.json and checks runtime, handler wiring, least privilege and no hardcoded account or region values. Expected values (the official list of 63 provinces, the accent-insensitive queries) are written from the requirement, not copied from the code.

## Suite TS-01: Province dataset (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-001 | Dataset has exactly 63 entries | The list contains 63 provinces/cities | HIGH | PASSED |
| TC-002 | Codes and names are unique and non-empty | Dataset integrity: unique codes and names, no empty names | HIGH | PASSED |
| TC-003 | Dataset matches the official pre-2025 list of 63 | The list must follow the official list of 63 provinces/cities, including Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Hải Phòng, Cần Thơ | HIGH | PASSED |
| TC-004 | Dataset is sorted by code and frozen | Deterministic order by code; the shared array must not be mutable | MEDIUM | PASSED |

### TC-001 — Dataset has exactly 63 entries

1. Import PROVINCES
2. Check its length

**Expected:** Length is 63

### TC-002 — Codes and names are unique and non-empty

1. Collect codes and names into Sets
2. Check sizes and non-emptiness

**Expected:** 63 unique codes, 63 unique names, none empty

### TC-003 — Dataset matches the official pre-2025 list of 63

1. For each of the 63 expected names find the matching dataset entry using normalized comparison
2. Check each expected name maps to a distinct entry

**Expected:** All 63 official names are present, each mapped to a distinct entry

### TC-004 — Dataset is sorted by code and frozen

1. Check codes are ascending
2. Check PROVINCES and its entries are frozen

**Expected:** Ascending codes; frozen array and entries

## Suite TS-02: Normalization and search function (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-005 | normalize strips diacritics including stacked marks | q matching ignores diacritics | HIGH | PASSED |
| TC-006 | normalize maps đ and Đ to d | NFD does not decompose đ/Đ; they must be mapped explicitly | HIGH | PASSED |
| TC-007 | normalize is case-insensitive | q matching ignores case | HIGH | PASSED |
| TC-008 | normalize trims and collapses whitespace | Normalization trims and collapses whitespace | MEDIUM | PASSED |
| TC-009 | Precomposed and decomposed forms normalize identically | Cover precomposed and decomposed input forms of the same name | HIGH | PASSED |
| TC-010 | searchProvinces is a pure substring filter that does not mutate shared data | Plain substring match; the shared module-scope array is not mutated | HIGH | PASSED |

### TC-005 — normalize strips diacritics including stacked marks

1. normalize 'Thừa Thiên Huế' and 'Hà Nội'

**Expected:** 'thua thien hue' and 'ha noi'

### TC-006 — normalize maps đ and Đ to d

1. normalize 'Đà Nẵng', 'Đồng Nai', 'đ', 'Đ'

**Expected:** 'da nang', 'dong nai', 'd', 'd'

### TC-007 — normalize is case-insensitive

1. normalize upper- and lower-case Vietnamese strings

**Expected:** Same lowercase unaccented result

### TC-008 — normalize trims and collapses whitespace

1. normalize a string with leading, trailing and repeated whitespace

**Expected:** Single spaces, no edges

### TC-009 — Precomposed and decomposed forms normalize identically

1. Build NFC and NFD forms of several names
2. normalize both

**Expected:** Both give the same plain key

### TC-010 — searchProvinces is a pure substring filter that does not mutate shared data

1. Search with undefined, '' and 'hue'
2. Mutate the returned array
3. Search again

**Expected:** All 63 for undefined/''; only Thừa Thiên Huế for 'hue'; shared list unchanged

## Suite TS-03: GET /provinces handler (integration)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-011 | GET without q returns all 63 | GET /provinces returns all provinces | HIGH | PASSED |
| TC-012 | Empty q or unrelated parameters return all 63 | Without q, or with an empty q, all 63 are returned | HIGH | PASSED |
| TC-013 | q='da nang' matches Đà Nẵng | Diacritic-insensitive search with đ | HIGH | PASSED |
| TC-014 | q='dong nai' matches Đồng Nai | Diacritic-insensitive search with đ | HIGH | PASSED |
| TC-015 | Search ignores case and accents in the query itself | q is matched ignoring diacritics and case | HIGH | PASSED |
| TC-016 | Partial match returns several results ordered by code | Substring match; deterministic order by code | HIGH | PASSED |
| TC-017 | No match returns 200 with an empty list | Filter with no match is not an error | HIGH | PASSED |
| TC-018 | q of exactly 100 characters is accepted | q is a string of at most 100 characters | HIGH | PASSED |
| TC-019 | q longer than 100 characters is rejected | Longer q returns 400 with the standard error shape | HIGH | PASSED |
| TC-020 | Repeated or non-string q is rejected | q must be a single string; repeated parameters arrive comma-joined in v2 | HIGH | PASSED |
| TC-021 | Regex metacharacters in q are treated literally | Plain substring matching; never build a RegExp from user input | HIGH | PASSED |
| TC-022 | Unknown path returns 404 | 404 for other paths | HIGH | PASSED |
| TC-023 | Non-GET method returns 405 with Allow: GET | 405 with an Allow: GET header for other methods | HIGH | PASSED |
| TC-024 | Unexpected failure returns a generic 500 and leaks nothing | 500 is generic; errors are logged server-side only | HIGH | PASSED |
| TC-025 | Every response has Content-Type and Cache-Control set deliberately | Content-Type application/json; charset=utf-8; Cache-Control public, max-age=86400 on 200 and no-store on errors | MEDIUM | PASSED |
| TC-026 | Repeated invocations are stable and do not mutate shared state | Do not mutate the shared module-scope array between invocations | MEDIUM | PASSED |
| TC-027 | Error responses use the standard shape | Errors are { error: { code, message } } | MEDIUM | PASSED |

### TC-011 — GET without q returns all 63

1. Invoke handler with GET /provinces and no query

**Expected:** 200, string JSON body { data: 63 items with code and name, total: 63 }, UTF-8 intact

### TC-012 — Empty q or unrelated parameters return all 63

1. Invoke with q=''
2. Invoke with {foo:'bar'}
3. Invoke with queryStringParameters undefined
4. Invoke with whitespace-only q

**Expected:** 200 with total 63 in every case

### TC-013 — q='da nang' matches Đà Nẵng

1. Invoke with q='da nang'

**Expected:** 200, total 1, name 'Đà Nẵng'

### TC-014 — q='dong nai' matches Đồng Nai

1. Invoke with q='dong nai'

**Expected:** 200, total 1, name 'Đồng Nai'

### TC-015 — Search ignores case and accents in the query itself

1. Query 'HA NOI', 'Đà Nẵng', 'ĐÀ NẴNG', the NFD form of 'Đà Nẵng', '  da   nang  ', 'hồ chí minh'

**Expected:** Each returns the expected province

### TC-016 — Partial match returns several results ordered by code

1. Query 'quang'
2. Query 'ha' and check ordering

**Expected:** 'quang' gives codes 22,44,45,49,51 in order; all results are ascending by code

### TC-017 — No match returns 200 with an empty list

1. Query 'zzz'

**Expected:** 200, { data: [], total: 0 }

### TC-018 — q of exactly 100 characters is accepted

1. Query with 100 'a' characters

**Expected:** 200

### TC-019 — q longer than 100 characters is rejected

1. Query with 101 and 5000 characters

**Expected:** 400 with { error: { code, message } }

### TC-020 — Repeated or non-string q is rejected

1. Query 'ha,noi'
2. Query with an array value
3. Query with a number value

**Expected:** 400 with the standard error shape each time

### TC-021 — Regex metacharacters in q are treated literally

1. Query '.*', '(', '[', '\\', '+'

**Expected:** 200 with total 0 and no 500

### TC-022 — Unknown path returns 404

1. Invoke with /districts and /

**Expected:** 404 with the standard error shape

### TC-023 — Non-GET method returns 405 with Allow: GET

1. Invoke /provinces with POST, PUT, DELETE, PATCH

**Expected:** 405, Allow: GET, standard error shape

### TC-024 — Unexpected failure returns a generic 500 and leaks nothing

1. Invoke with an event whose queryStringParameters getter throws
2. Capture console.error

**Expected:** 500, generic message, no internal text or stack in the body, error logged

### TC-025 — Every response has Content-Type and Cache-Control set deliberately

1. Check headers on 200, 400, 404, 405 and 500 responses

**Expected:** Content-Type is JSON UTF-8 everywhere; 200 is cacheable for a day; errors are no-store

### TC-026 — Repeated invocations are stable and do not mutate shared state

1. Invoke several times with different q
2. Mutate a parsed response
3. Invoke again

**Expected:** Identical results each time; dataset length remains 63

### TC-027 — Error responses use the standard shape

1. Collect 400, 404 and 405 responses
2. Parse the body

**Expected:** error.code and error.message are non-empty strings and no extra top-level keys exist

## Suite TS-04: Deployment configuration (unit)

| ID | Title | Verifies | Priority | Result |
|---|---|---|---|---|
| TC-028 | SAM template and package.json follow the architect constraints | nodejs22.x, ES modules, no runtime dependencies, HttpApi GET /provinces, explicit Timeout and MemorySize, no IAM policies, no hardcoded account or region, Output with the URL | HIGH | PASSED |

### TC-028 — SAM template and package.json follow the architect constraints

1. Read template.yaml and package.json
2. Check each constraint
3. Check the Handler value matches the exported handler
4. Check search.js does not use RegExp on input

**Expected:** All constraints hold

## Test suite files

- `qa/tests/provinces-data.test.mjs`
- `qa/tests/provinces-handler.test.mjs`
- `qa/tests/provinces-config.test.mjs`

> Written by Quyên (QA engineer) of the AI Agent Team, backed by **anthropic/claude-sonnet-5.5** (openrouter).