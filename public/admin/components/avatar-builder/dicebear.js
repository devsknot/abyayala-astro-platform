/**
 * Construcción segura de URLs de DiceBear (API 9.x).
 * Única fuente de verdad para la versión y los estilos permitidos.
 */

export const DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x';

// Estilos habilitados en el panel (lista blanca)
export const DICEBEAR_STYLES = ['avataaars', 'bottts'];

export const DEFAULT_STYLE = 'avataaars';

/**
 * Devuelve el estilo si está permitido; si no, el estilo por defecto.
 * @param {unknown} style
 */
export function normalizeStyle(style) {
  return DICEBEAR_STYLES.includes(style) ? style : DEFAULT_STYLE;
}

/**
 * Genera una semilla aleatoria corta.
 */
export function randomSeed() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Construye la URL SVG del avatar.
 * @param {string} style - Estilo de DiceBear (se valida contra la lista blanca)
 * @param {string} seed - Semilla
 * @param {Record<string, string>} [options] - Opciones del estilo (clave → valor)
 */
export function buildAvatarUrl(style, seed, options = {}) {
  const params = new URLSearchParams();
  params.set('seed', String(seed || 'default'));
  for (const [key, value] of Object.entries(options || {})) {
    if (value && /^[a-zA-Z]+$/.test(key)) params.set(key, String(value));
  }
  return `${DICEBEAR_BASE_URL}/${normalizeStyle(style)}/svg?${params.toString()}`;
}
