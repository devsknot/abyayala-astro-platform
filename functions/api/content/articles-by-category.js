// Función para gestionar artículos por categoría a través de Cloudflare Functions
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Configurar cabeceras CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
  
  // Manejar solicitudes OPTIONS (preflight CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  try {
    // Extraer el ID de la categoría de la URL
    // Formato esperado: /api/content/articles-by-category/{categoryId}
    const parts = path.split('/');
    const categoryId = parts[parts.length - 1];
    
    console.log(`Solicitud recibida: ${request.method} ${path}, categoryId: ${categoryId}`);
    
    // Verificar si estamos en la ruta raíz o en una categoría específica
    const isRootPath = path === '/api/content/articles-by-category' || path === '/api/content/articles-by-category/';
    
    if (request.method === 'GET') {
      if (!isRootPath && categoryId !== 'articles-by-category') {
        return handleGetArticlesByCategory(categoryId, env, headers);
      } else {
        // Si estamos en la ruta raíz, devolver un mensaje de error
        return new Response(JSON.stringify({ error: 'Se requiere especificar una categoría' }), {
          status: 400,
          headers
        });
      }
    }
    
    // Método no permitido
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers
    });
  } catch (error) {
    console.error('Error en la API de artículos por categoría:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), {
      status: 500,
      headers
    });
  }
}

// Obtener artículos por categoría
async function handleGetArticlesByCategory(categoryId, env, headers) {
  try {
    console.log(`Obteniendo artículos para la categoría: ${categoryId}`);
    
    // Usar D1 para obtener artículos filtrados por categoría
    const { results } = await env.DB.prepare(`
      SELECT * FROM articles WHERE category = ? ORDER BY pub_date DESC
    `).bind(categoryId).all();
    
    console.log(`Recuperados ${results ? results.length : 0} artículos para la categoría ${categoryId}`);
    
    // Transformar los nombres de los campos para el frontend
    const transformedResults = results ? results.map(article => ({
      slug: article.slug || '',
      title: article.title || '',
      description: article.description || '',
      content: article.content || '',
      pubDate: article.pub_date || null,
      category: article.category || '',
      featured_image: article.featured_image || null,
      author: article.author || '',
      tags: article.tags ? JSON.parse(article.tags) : []
    })) : [];
    
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error(`Error al obtener artículos para la categoría ${categoryId}:`, error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), {
      status: 500,
      headers
    });
  }
}
