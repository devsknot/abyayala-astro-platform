// src/lib/http.ts
// Utilidades de respuesta para los endpoints de la API.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

export function json(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers as Record<string, string> | undefined) },
  });
}

export function error(status: number, message: string): Response {
  return json({ success: false, error: message }, { status });
}

/** Registra el error real en los logs del Worker y responde con un mensaje genérico. */
export function serverError(context: string, err: unknown, message = 'Error interno del servidor'): Response {
  console.error(`[${context}]`, err);
  return error(500, message);
}

/** Cabeceras para lecturas públicas: caché corta en navegador y en el borde. */
export const PUBLIC_CACHE = { 'Cache-Control': 'public, max-age=60' };
export const NO_STORE = { 'Cache-Control': 'no-store' };

export async function readJson<T = any>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Normaliza el parámetro `[...slug]` de Astro (string | undefined). */
export function slugParam(value: string | undefined): string {
  return (value ?? '').trim().replace(/^\/+|\/+$/g, '');
}
