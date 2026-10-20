import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PROVINCES } from '../src/data/provinces.js';

describe('province reference data', () => {
  test('contains exactly 63 provinces and cities', () => {
    assert.equal(PROVINCES.length, 63);
  });

  test('codes are unique', () => {
    assert.equal(new Set(PROVINCES.map((p) => p.code)).size, 63);
  });

  test('names are unique and non-empty', () => {
    const names = PROVINCES.map((p) => p.name);
    assert.equal(new Set(names).size, 63);
    for (const name of names) {
      assert.ok(typeof name === 'string' && name.trim().length > 0);
    }
  });

  test('is sorted by code', () => {
    const codes = PROVINCES.map((p) => p.code);
    assert.deepEqual(codes, [...codes].sort());
  });

  test('names are stored in NFC with real diacritics', () => {
    for (const p of PROVINCES) {
      assert.equal(p.name, p.name.normalize('NFC'));
    }
    assert.ok(PROVINCES.some((p) => p.code === '48' && p.name === 'Đà Nẵng'));
  });

  test('data and entries are frozen', () => {
    assert.ok(Object.isFrozen(PROVINCES));
    for (const p of PROVINCES) {
      assert.ok(Object.isFrozen(p));
    }
  });
});
