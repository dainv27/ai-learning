// Pure text normalization used for accent-insensitive and case-insensitive matching.
// NFD does not decompose đ/Đ, so they are mapped to d explicitly.
const COMBINING_MARKS = /\p{M}/gu;
const DJ_LETTERS = /[Đđ]/g;
const WHITESPACE = /\s+/g;

export function normalize(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(DJ_LETTERS, 'd')
    .toLowerCase()
    .trim()
    .replace(WHITESPACE, ' ');
}
