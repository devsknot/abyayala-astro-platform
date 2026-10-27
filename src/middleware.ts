// src/middleware.ts
// Se ejecuta en cada petición que llega al Worker (páginas SSR y /api).
//  1. Redirige www → dominio principal (la sesión de Access vive en el dominio principal).
//  2. Autentica con Cloudflare Access (JWT verificado) las rutas de escritura y las privadas.
//  3. Rechaza escrituras cross-origin (CSRF).
//  4. Añade cabeceras de seguridad (las de public/_headers solo aplican a archivos estáticos).
//  5. Cachea en el borde, durante poco tiempo, las lecturas públicas anónimas y las invalida
//     cuando un editor guarda cambios.
// Nota: /admin/* son archivos estáticos que no pasan por aquí; los protege Cloudflare Access.
import { defineMiddleware } from 'astro:middleware';
import { DEV_USER, getAccessUser } from './lib/auth';
import { error } from './lib/http';

const SAFE_METHODS = new Set(['GET', 'HEAD']);
const CANONICAL_HOST = 'colectivoabyayala.org';

// Lecturas que también exigen sesión (además de todo /api/admin/*).
const PRIVATE_GET = [
  /^\/api\/admin\//,
  /^\/api\/content\/activities\/?$/,
  /^\/api\/media\/?$/,
  /^\/api\/media\/list\/?$/,
];

const EDGE_CACHE_SECONDS = 60;

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: https:",
  "frame-src https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const hasAccessCookie = (request: Request) => Boolean(request.headers.get('Cookie')?.includes('CF_Authorization='));

function requiresAuth(pathname: string, method: string) {
  if (!pathname.startsWith('/api/')) return false;
  if (!SAFE_METHODS.has(method)) return true;
  return PRIVATE_GET.some((re) => re.test(pathname));
}

function withSecurityHeaders(response: Response, pathname: string) {
  // Las respuestas de R2, de la caché o de Response.redirect pueden tener cabeceras inmutables.
  const res = new Response(response.body, response);
  const h = res.headers;
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  h.set('X-Frame-Options', 'DENY');
  if (pathname.startsWith('/api/media/')) {
    // Archivos subidos por usuarios: nunca se ejecutan como documento.
    h.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
  } else if (!h.has('Content-Security-Policy')) {
    h.set('Content-Security-Policy', CSP);
  }
  return res;
}

function isCacheable(request: Request, pathname: string) {
  if (import.meta.env.DEV || typeof caches === 'undefined') return false;
  if (request.method !== 'GET') return false;
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/auth')) return false;
  if (PRIVATE_GET.some((re) => re.test(pathname))) return false;
  // Quien tiene sesión de Access (editores) siempre ve contenido fresco.
  if (hasAccessCookie(request)) return false;
  return true;
}

/**
 * URLs públicas afectadas por una escritura en la API. La Cache API solo borra en el
 * centro de datos actual; en el resto las copias caducan solas en EDGE_CACHE_SECONDS.
 */
function affectedUrls(origin: string, pathname: string): string[] {
  const urls = ['/', '/news', '/categories', '/authors', '/about', '/rss.xml', '/api/content/articles', '/api/content/categories', '/api/content/authors'];
  const article = pathname.match(/^\/api\/content\/articles\/([^/]+)\/?$/);
  if (article) urls.push(`/news/${article[1]}`, `/api/content/articles/${article[1]}`);
  const category = pathname.match(/^\/api\/content\/categories\/([^/]+)\/?$/);
  if (category) urls.push(`/category/${category[1]}`, `/api/content/categories/${category[1]}`);
  const author = pathname.match(/^\/api\/content\/authors\/([^/]+)\/?$/);
  if (author) urls.push(`/authors/${author[1]}`, `/api/content/authors/${author[1]}`);
  const media = pathname.match(/^\/api\/media\/(.+)$/);
  if (media) urls.push(`/api/media/${media[1]}`);
  return urls.map((u) => origin + u);
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals } = context;
  const pathname = url.pathname;
  const env = locals.runtime?.env ?? {};
  const ctx = locals.runtime?.ctx;

  if (url.hostname === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  if (requiresAuth(pathname, request.method) || pathname === '/api/auth/me') {
    locals.user = import.meta.env.DEV ? DEV_USER : await getAccessUser(request, env);
    if (!locals.user && pathname !== '/api/auth/me') {
      return withSecurityHeaders(error(401, 'No autorizado. Inicia sesión en el panel.'), pathname);
    }
  } else if (pathname.startsWith('/api/') && hasAccessCookie(request)) {
    // Lecturas públicas: si hay sesión, se identifica al usuario (p. ej. para mostrar emails de autores).
    locals.user = import.meta.env.DEV ? DEV_USER : await getAccessUser(request, env);
  } else if (import.meta.env.DEV && pathname.startsWith('/api/')) {
    locals.user = DEV_USER;
  }

  if (!SAFE_METHODS.has(request.method)) {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      return withSecurityHeaders(error(403, 'Origen no permitido'), pathname);
    }
  }

  const cache = isCacheable(request, pathname) ? (caches as unknown as { default: Cache }).default : null;
  if (cache) {
    try {
      const hit = await cache.match(request);
      // Copia con cabeceras mutables: Astro modifica la respuesta que devuelve el middleware.
      if (hit) return new Response(hit.body, hit);
    } catch (err) {
      console.error('[cache] match', err);
    }
  }

  const response = withSecurityHeaders(await next(), pathname);

  // Respuestas para editores: nunca en cachés compartidas ni en la del navegador.
  if (locals.user && pathname.startsWith('/api/') && !pathname.startsWith('/api/media/')) {
    response.headers.set('Cache-Control', 'private, no-store');
  }

  // Un editor guardó cambios: se borran las copias públicas afectadas en este centro de datos.
  if (
    !SAFE_METHODS.has(request.method) &&
    response.ok &&
    !import.meta.env.DEV &&
    typeof caches !== 'undefined' &&
    (pathname.startsWith('/api/content/') || pathname.startsWith('/api/media/') || pathname === '/api/admin/maintenance')
  ) {
    const edge = (caches as unknown as { default: Cache }).default;
    const purge = Promise.all(affectedUrls(url.origin, pathname).map((u) => edge.delete(u))).catch((err) =>
      console.error('[cache] delete', err),
    );
    if (ctx?.waitUntil) ctx.waitUntil(purge);
    else await purge;
  }

  if (cache && response.status === 200 && !response.headers.has('Set-Cookie')) {
    const cc = response.headers.get('Cache-Control') ?? '';
    if (!/no-store|private/.test(cc)) {
      try {
        const copy = response.clone();
        const cached = new Response(copy.body, copy);
        cached.headers.set('Cache-Control', `public, max-age=${EDGE_CACHE_SECONDS}`);
        const save = cache.put(request, cached).catch((err) => console.error('[cache] put', err));
        if (ctx?.waitUntil) ctx.waitUntil(save);
        else await save;
      } catch (err) {
        console.error('[cache] put', err);
      }
    }
  }
  return response;
});
