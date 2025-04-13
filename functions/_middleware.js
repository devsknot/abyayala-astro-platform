// Middleware para Cloudflare Pages
// Este archivo se ejecutará antes que cualquier función en /functions

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  
  // Configurar CORS para solicitudes API
  if (url.pathname.startsWith('/api/')) {
    // Si es una solicitud OPTIONS (preflight), responder con las cabeceras CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, CF-Access-Client-Id, CF-Access-Client-Secret, CF-Access-Jwt-Assertion',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    // Para solicitudes API, verificar autenticación (excepto GET)
    if (url.pathname.startsWith('/api/') && request.method !== 'GET') {
      // Verificar cabeceras de Cloudflare Access
      const jwt = request.headers.get('CF-Access-Jwt-Assertion');
      const clientId = request.headers.get('CF-Access-Client-Id');
      const clientSecret = request.headers.get('CF-Access-Client-Secret');
      
      // En un entorno de desarrollo, permitir cabeceras simuladas
      const isDevelopment = env.ENVIRONMENT === 'development' || 
                           clientId === 'development-client-id';
      
      if (!jwt && !isDevelopment) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
  }
  
  // Verificar si la ruta es para el panel de administración
  if (url.pathname.startsWith('/admin')) {
    // En producción, verificaríamos Cloudflare Access
    // En desarrollo, permitimos el acceso directo
    
    // Si es una solicitud a la API desde el panel de administración, ya se verificó arriba
    if (!url.pathname.startsWith('/api/')) {
      // Permitir acceso al panel de administración
      return next();
    }
  }
  
  // Continuar con la solicitud
  return next();
}
