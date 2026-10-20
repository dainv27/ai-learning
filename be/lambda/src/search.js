import { normalize } from './normalize.js';

// Pure filter. Returns fresh { code, name } copies so the shared list is never mutated
// and internal search keys are not exposed. Matching is plain substring, never a RegExp.
export function searchProvinces(provinces, q) {
  const needle = q === undefined ? '' : normalize(q);
  const matches =
    needle === '' ? provinces : provinces.filter((p) => p.searchKey.includes(needle));
  return matches.map((p) => ({ code: p.code, name: p.name }));
}
