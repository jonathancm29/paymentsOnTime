export function digitsOnly(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits.replace(/^0+(?=\d)/, '');
}

export function formatCopFromDigits(digits) {
  const normalized = digitsOnly(digits);
  if (!normalized) return '';

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return '';

  return new Intl.NumberFormat('es-CO').format(amount);
}

export function parseCopDigitsToNumber(digits) {
  const normalized = digitsOnly(digits);
  return normalized ? parseInt(normalized, 10) : 0;
}
