// src/lib/url.ts

/** Acepta solo URLs http(s) o rutas relativas al sitio; cualquier otra cosa devuelve ''. */
export function safeUrl(value: string | null | undefined): string {
  const url = (value ?? '').trim();
  if (!url) return '';
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

/**
 * URL pública de la imagen destacada de un artículo.
 * Las rutas heredadas `media/uploads/...` (importadas de Blogger) no existen en R2,
 * así que se tratan como imagen ausente.
 */
export function articleImageUrl(value: string | null | undefined, fallback = ''): string {
  const raw = (value ?? '').trim();
  if (!raw || raw.startsWith('media/uploads/')) return fallback;
  if (/^\d{13}-[a-z0-9]+-/.test(raw) || raw.startsWith('2025/')) return `/api/media/${raw}`;
  return safeUrl(raw) || fallback;
}
