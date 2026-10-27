// Cliente HTTP único del panel. La sesión la gestiona Cloudflare Access con
// la cookie CF_Authorization (HttpOnly): el navegador la envía sola en las
// peticiones al mismo origen, así que aquí no se añade ninguna cabecera de auth.

import { notifications } from '../components/notification.js';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let sessionWarningShown = false;

/** Muestra (una sola vez) el aviso persistente de sesión expirada. */
export function notifySessionExpired() {
  if (sessionWarningShown) return;
  sessionWarningShown = true;
  notifications.error('Tu sesión expiró, recarga la página', 0);
}

/**
 * Realiza una petición a la API y devuelve el JSON de la respuesta.
 * Lanza ApiError si la respuesta no es 2xx.
 * @param {string} path - Ruta relativa, p. ej. '/api/content/articles'
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>, signal?: AbortSignal }} [options]
 */
export async function apiRequest(path, { method = 'GET', body, query, signal } = {}) {
  let url = path;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }

  const init = {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal
  };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('No se pudo conectar con el servidor', 0, null);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) notifySessionExpired();
    const message = (data && data.error) || defaultErrorMessage(response.status);
    throw new ApiError(message, response.status, data);
  }

  return data ?? { success: true };
}

function defaultErrorMessage(status) {
  switch (status) {
    case 401: return 'Tu sesión expiró, recarga la página';
    case 403: return 'No tienes permisos para esta acción';
    case 404: return 'Recurso no encontrado';
    case 409: return 'El recurso ya existe o está en uso';
    case 413: return 'El archivo es demasiado grande';
    case 415: return 'Tipo de archivo no permitido';
    default: return `Error del servidor (${status})`;
  }
}

/**
 * Consulta la sesión actual de Cloudflare Access.
 * @returns {Promise<{ user: { email: string, name: string }, session: { expiresAt: string | null } } | null>}
 *   null si no hay sesión (401)
 */
export async function getSession() {
  const response = await fetch('/api/auth/me', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new ApiError(defaultErrorMessage(response.status), response.status, null);
  const data = await response.json();
  if (!data || !data.authenticated) return null;
  const expiresAt = data.session && typeof data.session.expiresAt === 'string' ? data.session.expiresAt : null;
  return {
    user: data.user || { email: '', name: '' },
    session: { expiresAt }
  };
}

/**
 * Consulta la sesión actual de Cloudflare Access.
 * @returns {Promise<{ email: string, name: string } | null>} usuario o null si no hay sesión
 */
export async function getCurrentUser() {
  const result = await getSession();
  return result ? result.user : null;
}
