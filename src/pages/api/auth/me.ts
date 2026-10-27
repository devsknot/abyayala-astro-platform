// src/pages/api/auth/me.ts
// GET /api/auth/me → usuario de la sesión de Cloudflare Access (lo resuelve el middleware).
import type { APIContext } from 'astro';
import { json, NO_STORE } from '../../../lib/http';

export function GET({ locals }: APIContext) {
  if (!locals.user) return json({ authenticated: false }, { status: 401, headers: NO_STORE });
  return json({ authenticated: true, user: locals.user }, { headers: NO_STORE });
}
