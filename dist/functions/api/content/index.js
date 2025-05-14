// Punto de entrada para la API de contenido
export async function onRequest(context) {
  const { request } = context;
  
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Solo permitir solicitudes GET para este endpoint
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers
    });
  }
  
  // Información sobre la API
  const apiInfo = {
    name: 'Abya Yala CMS API',
    version: '1.0.0',
    description: 'API para gestionar contenido del CMS de Abya Yala',
    endpoints: [
      {
        path: '/api/content',
        method: 'GET',
        description: 'Información general sobre la API'
      },
      {
        path: '/api/content/articles',
        method: 'GET',
        description: 'Obtener todos los artículos'
      },
      {
        path: '/api/content/articles',
        method: 'POST',
        description: 'Crear un nuevo artículo',
        auth: true
      },
      {
        path: '/api/content/articles/{slug}',
        method: 'GET',
        description: 'Obtener un artículo específico por su slug'
      },
      {
        path: '/api/content/articles/{slug}',
        method: 'PUT',
        description: 'Actualizar un artículo existente',
        auth: true
      },
      {
        path: '/api/content/articles/{slug}',
        method: 'DELETE',
        description: 'Eliminar un artículo',
        auth: true
      },
      {
        path: '/api/content/categories',
        method: 'GET',
        description: 'Obtener todas las categorías'
      },
      {
        path: '/api/content/categories',
        method: 'POST',
        description: 'Crear una nueva categoría',
        auth: true
      }
    ],
    documentation: 'Para más información, consulta la documentación del proyecto'
  };
  
  return new Response(JSON.stringify(apiInfo), { headers });
}
