// Utilidades para insertar datos en el DOM de forma segura.

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
};

/**
 * Escapa un valor para insertarlo en HTML (contenido o atributos entre comillas).
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"'`]/g, ch => HTML_ESCAPES[ch]);
}

/**
 * Devuelve la URL solo si usa un esquema permitido; en otro caso, `fallback`.
 * Permite http(s), rutas relativas que empiezan por '/' (no '//') y, si se
 * indica, data:image/* (solo para previsualizaciones locales).
 * El resultado NO está escapado: usar escapeHtml() al meterlo en un atributo.
 * @param {unknown} value
 * @param {{ fallback?: string, allowDataImage?: boolean }} [options]
 * @returns {string}
 */
export function safeUrl(value, { fallback = '', allowDataImage = false } = {}) {
  if (typeof value !== 'string') return fallback;
  const url = value.trim();
  if (!url) return fallback;

  if (url.startsWith('/') && !url.startsWith('//')) return url;

  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch (_) {
    // URL inválida
  }
  return fallback;
}

/**
 * Atajo: URL segura y escapada lista para un atributo src/href.
 * @param {unknown} value
 * @param {{ fallback?: string, allowDataImage?: boolean }} [options]
 * @returns {string}
 */
export function attrUrl(value, options) {
  return escapeHtml(safeUrl(value, options));
}
