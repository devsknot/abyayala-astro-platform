// src/lib/sanitize.ts
// Saneamiento del HTML de los artículos (lista blanca de etiquetas y atributos).
// Se aplica al guardar (API) y al renderizar (defensa en profundidad para los
// artículos que ya están en la base).
import { FilterXSS, getDefaultWhiteList, safeAttrValue } from 'xss';

const common = ['class', 'style', 'id', 'dir', 'lang', 'title'];
const whiteList: Record<string, string[]> = {};
for (const [tag, attrs] of Object.entries(getDefaultWhiteList())) {
  whiteList[tag] = [...new Set([...(attrs ?? []), ...common])];
}
Object.assign(whiteList, {
  img: [...common, 'src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes'],
  a: [...common, 'href', 'target', 'rel', 'name'],
  iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'title', 'loading'],
  figure: common,
  figcaption: common,
  picture: common,
  source: ['src', 'srcset', 'type', 'media'],
  span: common,
  div: common,
  p: common,
  br: [],
  hr: common,
});

// Solo se permiten iframes de proveedores de video conocidos.
const IFRAME_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|www\.facebook\.com)\//i;

const filter = new FilterXSS({
  whiteList,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'noscript', 'template'],
  allowCommentTag: false,
  safeAttrValue(tag, name, value, cssFilter) {
    if (tag === 'iframe' && name === 'src') {
      return IFRAME_HOSTS.test(value) ? value : '';
    }
    // `style` se deja pasar sin el filtro CSS de la librería (que eliminaría casi
    // todo el formato heredado de Blogger), pero sin expresiones ni url(javascript:).
    if (name === 'style') {
      return /expression\s*\(|javascript:|url\s*\(\s*['"]?\s*(?:javascript|vbscript|data):/i.test(value)
        ? ''
        : value.replace(/[<>"]/g, '');
    }
    return safeAttrValue(tag, name, value, cssFilter);
  },
});

export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return filter.process(html);
}

/** Elimina todo el HTML: para títulos, descripciones y otros campos de texto plano. */
export function stripHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, '').trim();
}
