import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROVINCES } from '../src/data/provinces.js';

test('dataset contains exactly 63 provinces and cities', () => {
  assert.equal(PROVINCES.length, 63);
});

test('codes and names are unique and non-empty', () => {
  const codes = new Set(PROVINCES.map((p) => p.code));
  const names = new Set(PROVINCES.map((p) => p.name));
  assert.equal(codes.size, 63);
  assert.equal(names.size, 63);
  for (const p of PROVINCES) {
    assert.ok(p.code.length > 0);
    assert.ok(p.name.trim().length > 0);
  }
});

test('dataset is sorted by code and frozen', () => {
  const codes = PROVINCES.map((p) => p.code);
  assert.deepEqual(codes, [...codes].sort());
  assert.ok(Object.isFrozen(PROVINCES));
  assert.ok(Object.isFrozen(PROVINCES[0]));
});

test('dataset includes the major cities by official name', () => {
  const names = PROVINCES.map((p) => p.name);
  for (const expected of ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ']) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
});
