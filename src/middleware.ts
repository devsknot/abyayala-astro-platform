// src/middleware.ts
// Se ejecuta en cada petición que llega al Worker (páginas SSR y /api).
//  1. Autentica con Cloudflare Access (JWT verificado) las rutas de escritura y las privadas.
//  2. Rechaza escrituras cross-origin (CSRF).
//  3. Añade cabeceras de seguridad (las de public/_headers solo aplican a archivos estáticos).
//  4. Cachea en el borde, durante poco tiempo, las lecturas públicas anónimas.
import { defineMiddleware } from 'astro:middleware';
import { DEV_USER, getAccessUser } from './lib/auth';
import { error } from './lib/http';

const SAFE_METHODS = new Set(['GET', 'HEAD']);

// Lecturas que también exigen sesión.
const PRIVATE_GET = [/^\/api\/content\/activities\/?$/, /^\/api\/media\/?$/, /^\/api\/media\/list\/?$/];

const EDGE_CACHE_SECONDS = 60;

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: https: ",
  "frame-src https://www.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.facebook.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function requiresAuth(pathname: string, method: string) {
  if (!pathname.startsWith('/api/')) return false;
  if (!SAFE_METHODS.has(method)) return true;
  return PRIVATE_GET.some((re) => re.test(pathname));
}

function withSecurityHeaders(response: Response, pathname: string) {
  // Las respuestas de R2 o de Response.redirect pueden tener cabeceras inmutables.
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
  if (request.headers.get('Cookie')?.includes('CF_Authorization=')) return false;
  return true;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, url, locals } = context;
  const pathname = url.pathname;
  const env = locals.runtime?.env ?? {};

  if (requiresAuth(pathname, request.method) || pathname === '/api/auth/me') {
    locals.user = import.meta.env.DEV ? DEV_USER : await getAccessUser(request, env);
    if (!locals.user && pathname !== '/api/auth/me') {
      return withSecurityHeaders(error(401, 'No autorizado. Inicia sesión en el panel.'), pathname);
    }
  } else if (pathname.startsWith('/api/') && request.headers.get('Cookie')?.includes('CF_Authorization=')) {
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

  const cacheable = isCacheable(request, pathname);
  const cache = cacheable ? (caches as unknown as { default: Cache }).default : null;
  if (cache) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }

  const response = withSecurityHeaders(await next(), pathname);

  if (cache && response.status === 200 && !response.headers.has('Set-Cookie')) {
    const cc = response.headers.get('Cache-Control') ?? '';
    if (!/no-store|private/.test(cc)) {
      const copy = response.clone();
      const cached = new Response(copy.body, copy);
      cached.headers.set('Cache-Control', `public, max-age=${EDGE_CACHE_SECONDS}`);
      const save = cache.put(request, cached);
      const ctx = locals.runtime?.ctx;
      if (ctx?.waitUntil) ctx.waitUntil(save);
      else await save;
    }
  }
  return response;
});
