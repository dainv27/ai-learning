export function normalizeText(value) {
  if (typeof value !== 'string') {
    throw new TypeError('normalizeText expects a string');
  }
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
