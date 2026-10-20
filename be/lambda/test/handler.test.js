import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../src/handler.js';

function makeEvent({ method = 'GET', path = '/provinces', query, rawQueryString } = {}) {
  const raw = rawQueryString ?? (typeof query?.q === 'string' ? new URLSearchParams({ q: query.q }).toString() : '');
  return {
    version: '2.0',
    routeKey: 'ANY /provinces',
    rawPath: path,
    rawQueryString: raw,
    queryStringParameters: query,
    requestContext: { http: { method, path } },
    isBase64Encoded: false,
  };
}

function parse(res) {
  return JSON.parse(res.body);
}

describe('GET /provinces 200', () => {
  test('returns all 63 provinces when q is absent', async () => {
    const res = await handler(makeEvent());
    assert.equal(res.statusCode, 200);
    const body = parse(res);
    assert.equal(body.total, 63);
    assert.equal(body.data.length, 63);
    assert.deepEqual(Object.keys(body.data[0]), ['code', 'name']);
  });

  test('returns all 63 provinces when queryStringParameters is undefined', async () => {
    const res = await handler(makeEvent({ query: undefined }));
    assert.equal(res.statusCode, 200);
    assert.equal(parse(res).total, 63);
  });

  test('returns all 63 provinces when q is empty or whitespace', async () => {
    assert.equal(parse(await handler(makeEvent({ query: { q: '' } }))).total, 63);
    assert.equal(parse(await handler(makeEvent({ query: { q: '   ' } }))).total, 63);
  });

  test('responses are ordered by code', async () => {
    const body = parse(await handler(makeEvent()));
    const codes = body.data.map((p) => p.code);
    assert.deepEqual(codes, [...codes].sort());
  });

  test('sets content type and public cache headers', async () => {
    const res = await handler(makeEvent());
    assert.equal(res.headers['Content-Type'], 'application/json; charset=utf-8');
    assert.equal(res.headers['Cache-Control'], 'public, max-age=3600');
  });

  test('serves real diacritics as UTF-8, not escaped', async () => {
    const res = await handler(makeEvent({ query: { q: 'da nang' } }));
    assert.ok(res.body.includes('Đà Nẵng'));
  });

  test('matches da nang to Đà Nẵng', async () => {
    const body = parse(await handler(makeEvent({ query: { q: 'da nang' } })));
    assert.equal(body.total, 1);
    assert.deepEqual(body.data, [{ code: '48', name: 'Đà Nẵng' }]);
  });

  test('matches DONG NAI case-insensitively to Đồng Nai', async () => {
    const body = parse(await handler(makeEvent({ query: { q: 'DONG NAI' } })));
    assert.deepEqual(body.data, [{ code: '75', name: 'Đồng Nai' }]);
  });

  test('matches accented input đà nẵng', async () => {
    const body = parse(await handler(makeEvent({ query: { q: 'đà nẵng' } })));
    assert.deepEqual(body.data, [{ code: '48', name: 'Đà Nẵng' }]);
  });

  test('matches accented input hà nội', async () => {
    const body = parse(await handler(makeEvent({ query: { q: 'hà nội' } })));
    assert.deepEqual(body.data, [{ code: '01', name: 'Hà Nội' }]);
  });

  test('matches stacked diacritics Thừa Thiên Huế', async () => {
    const body = parse(await handler(makeEvent({ query: { q: 'thua thien hue' } })));
    assert.deepEqual(body.data, [{ code: '46', name: 'Thừa Thiên Huế' }]);
  });

  test('NFC and NFD input give identical results', async () => {
    const nfc = 'hà nội'.normalize('NFC');
    const nfd = 'hà nội'.normalize('NFD');
    assert.notEqual(nfc, nfd);
    const a = await handler(makeEvent({ query: { q: nfc } }));
    const b = await handler(makeEvent({ query: { q: nfd } }));
    assert.equal(a.body, b.body);
  });

  test('returns 200 with empty data for a non-matching q', async () => {
    const res = await handler(makeEvent({ query: { q: 'zzzz' } }));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(parse(res), { data: [], total: 0 });
  });

  test('accepts q of exactly 100 characters', async () => {
    const res = await handler(makeEvent({ query: { q: 'a'.repeat(100) } }));
    assert.equal(res.statusCode, 200);
  });
});

describe('GET /provinces 400', () => {
  test('rejects q longer than 100 characters', async () => {
    const res = await handler(makeEvent({ query: { q: 'a'.repeat(101) } }));
    assert.equal(res.statusCode, 400);
    assert.equal(parse(res).error.code, 'BAD_REQUEST');
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });

  test('rejects non-string q', async () => {
    const res = await handler(makeEvent({ query: { q: ['a', 'b'] }, rawQueryString: '' }));
    assert.equal(res.statusCode, 400);
    assert.equal(parse(res).error.code, 'BAD_REQUEST');
  });

  test('rejects repeated q parameters', async () => {
    const res = await handler(makeEvent({ query: { q: 'a,b' }, rawQueryString: 'q=a&q=b' }));
    assert.equal(res.statusCode, 400);
    assert.equal(parse(res).error.code, 'BAD_REQUEST');
  });
});

describe('unknown path 404', () => {
  test('returns 404 for an unknown path', async () => {
    const res = await handler(makeEvent({ path: '/cities' }));
    assert.equal(res.statusCode, 404);
    assert.equal(parse(res).error.code, 'NOT_FOUND');
    assert.equal(res.headers['Cache-Control'], 'no-store');
  });
});

describe('wrong method 405', () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']) {
    test(`returns 405 with Allow: GET for ${method}`, async () => {
      const res = await handler(makeEvent({ method }));
      assert.equal(res.statusCode, 405);
      assert.equal(res.headers.Allow, 'GET');
      assert.equal(parse(res).error.code, 'METHOD_NOT_ALLOWED');
    });
  }
});

describe('unexpected error 500', () => {
  test('returns generic 500 without leaking internals', async () => {
    const event = makeEvent();
    Object.defineProperty(event, 'rawPath', {
      get() {
        throw new Error('secret internal detail');
      },
    });
    const res = await handler(event);
    assert.equal(res.statusCode, 500);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    const body = parse(res);
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.ok(!res.body.includes('secret'));
    assert.ok(!res.body.includes('stack'));
  });
});
