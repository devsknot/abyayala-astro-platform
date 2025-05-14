// Middleware para Cloudflare Pages
// Este archivo se ejecutará antes que cualquier función en /functions

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Manejo específico para la función hello
  if (url.pathname === '/hello') {
    console.log(`Middleware: Procesando solicitud para ${url.pathname}`);
    try {
      const response = await next();
      console.log(`Middleware: Respuesta recibida desde handler para ${url.pathname}, status: ${response.status}`);
      return response;
    } catch (e) {
      console.error(`Middleware: Error en next() handler para ${url.pathname}: ${e.message}`, e.stack);
      return new Response(JSON.stringify({ error: 'Error de ejecución de función', detalles: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Configurar CORS para solicitudes API y logging específico para GET
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      console.log(`Middleware: Attempting to process GET request for ${url.pathname}`);
      try {
        const response = await next();
        console.log(`Middleware: Response received from next handler for ${url.pathname}, status: ${response.status}`);
        // Ensure CORS headers are added to actual responses from functions if needed
        // For simple GET like ping, may not be strictly necessary but good for consistency
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        return new Response(response.body, { status: response.status, headers: newHeaders });
      } catch (e) {
        console.error(`Middleware: Error in next() handler for ${url.pathname}: ${e.message}`, e.stack);
        return new Response(JSON.stringify({ error: 'Function execution error', details: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }
    
    // Si es una solicitud OPTIONS (preflight), responder con las cabeceras CORS
    if (request.method === 'OPTIONS') {
      console.log(`Middleware: Handling OPTIONS preflight for ${url.pathname}`);
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
    
    // Para solicitudes API que no son GET ni OPTIONS (e.g., POST, PUT, DELETE)
    // verificar autenticación
    console.log(`Middleware: Processing ${request.method} for ${url.pathname} (requires auth)`);
    // Verificar cabeceras de Cloudflare Access
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    const clientId = request.headers.get('CF-Access-Client-Id');
    const clientSecret = request.headers.get('CF-Access-Client-Secret');
    
    // En un entorno de desarrollo, permitir cabeceras simuladas
    const isDevelopment = env.ENVIRONMENT === 'development' || 
                         clientId === 'development-client-id';
    
    if (!jwt && !isDevelopment) {
      console.log(`Middleware: Unauthorized ${request.method} request for ${url.pathname}`);
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    console.log(`Middleware: Authorized ${request.method} for ${url.pathname}, proceeding.`);
    // SI LA AUTENTICACIÓN ES EXITOSA PARA POST, PUT, DELETE, ETC., CONTINUAR:
    // Adding CORS headers to the actual response from the authed function
    const authedResponse = await next();
    const authedHeaders = new Headers(authedResponse.headers);
    authedHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(authedResponse.body, { status: authedResponse.status, headers: authedHeaders });
  }
  
  // Verificar si la ruta es para el panel de administración
  if (url.pathname.startsWith('/admin')) {
    // En producción, verificaríamos Cloudflare Access
    // En desarrollo, permitimos el acceso directo
    console.log(`Middleware: Processing /admin request for ${url.pathname}`);
    // Si es una solicitud a la API desde el panel de administración, ya se verificó arriba
    // (this logic might be redundant if /api/admin/* is handled by the /api/* block)
    // if (!url.pathname.startsWith('/api/')) { 
    //   return next();
    // }
    return await next(); // Simpler: just pass admin requests through for now
  }
  
  // Continuar con la solicitud para otras rutas (Astro SSR)
  console.log(`Middleware: Passing through request for ${url.pathname}`);
  return await next();
}
