// Endpoint: /api/content/articles-by-category/:categoryId
// Devuelve los artículos de una categoría específica

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Extraer el categoryId de la URL
  // La ruta será /api/content/articles-by-category/CATEGORY_ID
  const pathParts = path.split('/');
  const categoryId = pathParts[pathParts.length - 1]; // Obtener el último segmento de la ruta
  
  console.log(`[DEBUG] Ruta completa: ${path}`);
  console.log(`[DEBUG] Partes de la ruta:`, JSON.stringify(pathParts));
  console.log(`[DEBUG] CategoryId extraído: ${categoryId}`);
  
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
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  try {
    console.log(`Solicitud recibida: ${request.method} ${path}`);
    
    // Si la ruta es exactamente /api/content/articles-by-category o tiene una barra al final
    if (path === '/api/content/articles-by-category' || path === '/api/content/articles-by-category/') {
      return new Response(JSON.stringify({ error: 'Se requiere especificar una categoría' }), {
        status: 400,
        headers
      });
    }
    
    if (request.method === 'GET') {
      return handleGetArticlesByCategory(categoryId, env, headers);
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
    console.log(`[DEBUG] Obteniendo artículos para la categoría: ${categoryId}`);
    
    // Usar D1 para obtener artículos filtrados por categoría
    const { results } = await env.DB.prepare(`
      SELECT * FROM articles WHERE category = ? ORDER BY pub_date DESC
    `).bind(categoryId).all();
    
    console.log(`[DEBUG] Resultados SQL para categoría '${categoryId}':`, JSON.stringify(results));
    
    // Transformar los nombres de los campos para el frontend
    const transformedResults = results ? results.map(article => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      content: article.content,
      pubDate: article.pub_date,
      category: article.category,
      featured_image: article.featured_image,
      author: article.author,
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
