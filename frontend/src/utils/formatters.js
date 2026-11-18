/**
 * Shared Vietnamese number, VND currency, date/time, and API payload helpers.
 */

export function formatNumberVi(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toLocaleString('vi-VN') : '0';
}

export function formatVnd(value, suffix = '₫') {
  return `${formatNumberVi(value)}${suffix ? ` ${suffix}` : ''}`;
}

export function formatMillionVnd(value) {
  const num = Number(value || 0) / 1_000_000;
  return `${Number.isFinite(num) ? num.toLocaleString('vi-VN') : '0'} Tr ₫`;
}

export function formatCompactVnd(value) {
  const val = Number(value || 0);
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} Tỷ ₫`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} Tr ₫`;
  return formatVnd(val);
}

export function formatDateTimeVi(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString('vi-VN');
}

export function formatDateVi(value, fallback = '—') {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('vi-VN');
}

export function unwrapApiData(res) {
  return res && typeof res === 'object' && 'result' in res ? res.result : res;
}

export function isClientHttpError(err) {
  return Number(err?.status) >= 400 && Number(err?.status) < 500;
}
