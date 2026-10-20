import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/normalize.js';

test('removes diacritics, including stacked marks', () => {
  assert.equal(normalize('Thừa Thiên Huế'), 'thua thien hue');
  assert.equal(normalize('Hà Nội'), 'ha noi');
});

test('maps đ and Đ to d explicitly', () => {
  assert.equal(normalize('Đà Nẵng'), 'da nang');
  assert.equal(normalize('Đồng Nai'), 'dong nai');
  assert.equal(normalize('đ'), 'd');
  assert.equal(normalize('Đ'), 'd');
});

test('is case-insensitive', () => {
  assert.equal(normalize('HÀ NỘI'), 'ha noi');
  assert.equal(normalize('đà nẵng'), 'da nang');
});

test('trims and collapses whitespace', () => {
  assert.equal(normalize('  Bà   Rịa \t - Vũng Tàu '), 'ba ria - vung tau');
});

test('precomposed and decomposed forms normalize to the same key', () => {
  const composed = 'Đà Nẵng';
  const decomposed = composed.normalize('NFD');
  assert.notEqual(composed, decomposed);
  assert.equal(normalize(composed), normalize(decomposed));
  assert.equal(normalize(decomposed), 'da nang');
});

test('non-string input yields an empty string', () => {
  assert.equal(normalize(undefined), '');
  assert.equal(normalize(null), '');
  assert.equal(normalize(42), '');
});
