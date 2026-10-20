import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from '../src/normalize.js';

describe('normalizeText', () => {
  test('strips diacritics and lowercases', () => {
    assert.equal(normalizeText('Đà Nẵng'), 'da nang');
  });

  test('maps đ and Đ to d explicitly', () => {
    assert.equal(normalizeText('đ'), 'd');
    assert.equal(normalizeText('Đ'), 'd');
    assert.equal(normalizeText('Đồng Nai'), 'dong nai');
  });

  test('handles stacked marks', () => {
    assert.equal(normalizeText('Thừa Thiên Huế'), 'thua thien hue');
  });

  test('NFC and NFD inputs normalize identically', () => {
    assert.equal(normalizeText('hà nội'.normalize('NFC')), normalizeText('hà nội'.normalize('NFD')));
    assert.equal(normalizeText('hà nội'.normalize('NFC')), 'ha noi');
  });

  test('trims and collapses whitespace', () => {
    assert.equal(normalizeText('  Hà    Nội  '), 'ha noi');
  });

  test('throws TypeError for non-string input', () => {
    assert.throws(() => normalizeText(42), TypeError);
  });
});
