// Función para gestionar artículos por categoría a través de Cloudflare Functions
export async function onRequest(context) {
  const { request, env, params } = context;
  const categoryId = params.categoryId;
  
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
  
  // Solo permitir solicitudes GET
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers
    });
  }
  
  try {
    return await handleGetArticlesByCategory(categoryId, env, headers);
  } catch (error) {
    console.error(`Error en la solicitud: ${error.message}`);
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
    // Consulta simplificada que sabemos que funciona
    const { results } = await env.DB.prepare(`
      SELECT * FROM articles WHERE category = ? ORDER BY pub_date DESC
    `).bind(categoryId).all();
    
    console.log(`Recuperados ${results ? results.length : 0} artículos para la categoría ${categoryId}`);
    
    // Transformar los nombres de los campos para que coincidan con lo que espera el frontend
    const transformedResults = results ? results.map(article => {
      const transformed = {
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        pubDate: article.pub_date,
        category: article.category,
        featured_image: article.featured_image,
        author: article.author,
        tags: article.tags ? JSON.parse(article.tags) : []
        // Ya no incluimos author_info porque no estamos obteniendo esos datos en la consulta simplificada
      };
      
      return transformed;
    }) : [];
    
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error(`Error al obtener artículos para la categoría ${categoryId}:`, error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), {
      status: 500,
      headers
    });
  }
}
