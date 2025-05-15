// Utilidades CORS para las funciones de Cloudflare

/**
 * Cabeceras CORS predeterminadas para permitir solicitudes desde cualquier origen
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Jwt-Assertion',
  'Access-Control-Max-Age': '86400'
};
