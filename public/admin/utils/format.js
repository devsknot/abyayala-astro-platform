// Utilidades de formato compartidas por las vistas del panel (todas en español).

const numberFormat = new Intl.NumberFormat('es');
const relativeFormat = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** Número con separadores de miles. */
export function formatNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? numberFormat.format(n) : '0';
}

/** Tamaño legible en bytes (B, KB, MB, GB). */
export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString('es', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

/**
 * Convierte un valor a Date válida o null.
 * Las marcas de SQLite/D1 ("2026-10-26 18:30:00", sin zona) están en UTC:
 * se interpretan como tales en lugar de como hora local.
 */
export function toDate(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value.trim())) {
    value = `${value.trim().replace(' ', 'T')}Z`;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Valor YYYY-MM-DD para un <input type="date"> en la zona horaria LOCAL.
 * (toISOString() usa UTC y en América adelanta un día por la tarde/noche.)
 * Si recibe una cadena que ya empieza por YYYY-MM-DD, la respeta tal cual.
 * @param {unknown} [value] - por defecto, hoy
 */
export function localDateInputValue(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) return value.trim().slice(0, 10);
  const date = toDate(value) || new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Fecha corta: 26 oct 2026. */
export function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

/** Fecha y hora: 26/10/2026, 18:30. */
export function formatDateTime(value) {
  const date = toDate(value);
  return date
    ? date.toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
}

/**
 * Tiempo relativo en español respecto a ahora: "hace 5 minutos", "dentro de 2 horas".
 * @param {unknown} value
 * @param {number} [now]
 */
export function formatRelative(value, now = Date.now()) {
  const date = toDate(value);
  if (!date) return '';
  const diffSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(diffSeconds);
  if (abs < 45) return diffSeconds >= 0 ? 'en unos segundos' : 'hace unos segundos';
  const steps = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [86400 * 30, 'day'],
    [86400 * 365, 'month'],
    [Infinity, 'year']
  ];
  const divisors = { second: 1, minute: 60, hour: 3600, day: 86400, month: 86400 * 30, year: 86400 * 365 };
  for (const [limit, unit] of steps) {
    if (abs < limit) {
      return relativeFormat.format(Math.round(diffSeconds / divisors[unit]), unit);
    }
  }
  return '';
}

/** Iniciales (máx. 2) a partir de un nombre o correo. */
export function initials(value) {
  const text = String(value || '').trim();
  if (!text) return '?';
  const base = text.includes('@') && !text.includes(' ') ? text.split('@')[0].replace(/[._-]+/g, ' ') : text;
  const parts = base.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** Respeta la preferencia de movimiento reducido del sistema. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** scrollIntoView que respeta prefers-reduced-motion. */
export function scrollIntoViewSafe(element) {
  if (!element) return;
  element.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/** Normaliza un texto a slug (quita tildes: "Agroecología" → "agroecologia"). */
export function slugify(text, maxLength = 80) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, maxLength);
}
