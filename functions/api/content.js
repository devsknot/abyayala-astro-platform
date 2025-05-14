// Función para gestionar el contenido (artículos y categorías) a través de Cloudflare Functions
// Este archivo ahora actúa principalmente como router para redireccionar a los archivos específicos
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Configurar cabeceras CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  // Manejar solicitudes OPTIONS (preflight CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  try {
    console.log(`[content.js] Router: ${request.method} ${path}`);
    
    // Redirecciones a archivos específicos
    if (path === '/api/content' || path === '/api/content/') {
      // Redirigir al índice de la API en /api/content/index.js
      console.log('[content.js] Redirigiendo a /api/content/index.js');
      return new Response(null, {
        status: 307,
        headers: {
          ...headers,
          'Location': '/api/content/'
        }
      });
    } 
    else if (path === '/api/content/articles' || path === '/api/content/articles/') {
      // Redirigir al manejador específico de artículos
      console.log('[content.js] Redirigiendo al manejador de artículos');
      return new Response(null, {
        status: 307,
        headers: {
          ...headers,
          'Location': '/api/content/articles'
        }
      });
    } 
    else if (path.startsWith('/api/content/articles/')) {
      // Redirigir a manejador de artículo específico por slug
      const slug = path.replace('/api/content/articles/', '');
      console.log(`[content.js] Redirigiendo a artículo con slug: ${slug}`);
      // La redirección es implícita, ya que Cloudflare Functions manejará esto con el archivo [slug].js
      return new Response(null, {
        status: 307,
        headers: {
          ...headers,
          'Location': path
        }
      });
    } 
    else if (path === '/api/content/categories' || path === '/api/content/categories/') {
      // Redirigir al manejador específico de categorías
      console.log('[content.js] Redirigiendo al manejador de categorías');
      return new Response(null, {
        status: 307,
        headers: {
          ...headers,
          'Location': '/api/content/categories'
        }
      });
    }
    
    // Ruta no encontrada
    console.error(`Ruta no encontrada: ${path}`);
    return new Response(JSON.stringify({ error: 'Ruta no encontrada', path }), {
      status: 404,
      headers
    });
  } catch (error) {
    console.error('Error en la API:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), {
      status: 500,
      headers
    });
  }
}

// Estas funciones han sido movidas a archivos específicos en la carpeta content/
