import { PROVINCES } from './data/provinces.js';
import { normalizeText } from './normalize.js';

const keyCache = new WeakMap();

function keyOf(entry) {
  let key = keyCache.get(entry);
  if (key === undefined) {
    key = normalizeText(entry.name);
    keyCache.set(entry, key);
  }
  return key;
}

export function buildSearchIndex(list) {
  if (!Array.isArray(list)) {
    throw new TypeError('buildSearchIndex expects an array');
  }
  for (const entry of list) {
    keyOf(entry);
  }
  return list;
}

export function filterProvinces(list, q) {
  if (!Array.isArray(list)) {
    throw new TypeError('filterProvinces expects an array');
  }
  const needle = typeof q === 'string' ? normalizeText(q) : '';
  if (needle === '') {
    return list.slice();
  }
  return list.filter((entry) => keyOf(entry).includes(needle));
}

// Warm the normalized search keys once per cold start.
buildSearchIndex(PROVINCES);
