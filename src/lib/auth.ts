// src/lib/auth.ts
// Verificación del JWT de Cloudflare Access.
// Access entrega el token en la cabecera `Cf-Access-Jwt-Assertion` (cuando la ruta
// está protegida por Access) o en la cookie `CF_Authorization` (sesión del navegador).
// Aquí se valida firma, emisor (team domain) y audiencia (AUD de la aplicación).
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AccessUser {
  email: string;
  name: string;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export const DEV_USER: AccessUser = { email: 'dev@localhost', name: 'Desarrollo local' };

/**
 * Devuelve el usuario si la petición trae un JWT de Access válido, o null.
 * Falla cerrado: si faltan CF_ACCESS_TEAM_DOMAIN o CF_ACCESS_AUD, nadie se autentica.
 */
export async function getAccessUser(request: Request, env: Partial<Env>): Promise<AccessUser | null> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion') || readCookie(request, 'CF_Authorization');
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  if (!token || !teamDomain || !audience) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(teamDomain), {
      issuer: `https://${teamDomain}`,
      audience,
    });
    const email = typeof payload.email === 'string' ? payload.email : '';
    if (!email) return null;
    return { email, name: typeof payload.name === 'string' && payload.name ? payload.name : email };
  } catch {
    return null;
  }
}
