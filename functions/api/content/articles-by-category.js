// Función para gestionar artículos por categoría a través de Cloudflare Functions
export async function onRequest(context) {
  // --- Add log here ---
  console.log('[articles-by-category.js] onRequest invoked');
  // --------------------
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
    console.log(`Solicitud recibida: ${request.method} ${path}`);
    
    // Extraer el ID de la categoría si está presente en la URL
    // Formato esperado: /api/content/articles-by-category/{categoryId}
    const parts = path.split('/');
    const categoryId = parts[parts.length - 1];
    
    // Verificar si estamos en la ruta raíz o en una categoría específica
    const isRootPath = path === '/api/content/articles-by-category' || path === '/api/content/articles-by-category/';
    const isSpecificCategory = !isRootPath && categoryId !== 'articles-by-category';
    
    console.log(`[DEBUG] Path: ${path}, CategoryId: ${categoryId}, isSpecificCategory: ${isSpecificCategory}`);
    
    if (request.method === 'GET') {
      if (isSpecificCategory) {
        console.log(`[DEBUG] Obteniendo artículos para la categoría: ${categoryId}`);
        return handleGetArticlesByCategory(categoryId, env, headers);
      } else {
        // Si estamos en la ruta raíz, devolver un mensaje de error
        return new Response(JSON.stringify({ 
          error: 'Se requiere especificar una categoría', 
          path: path,
          debug: 'Ruta raíz de articles-by-category'
        }), {
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
    return new Response(JSON.stringify({ 
      error: error.message || 'Error del servidor',
      path: path,
      debug: 'Error al procesar la solicitud de artículos por categoría'
    }), {
      status: 500,
      headers
    });
  }
}

// Obtener artículos por categoría
async function handleGetArticlesByCategory(categoryId, env, headers) {
  try {
    console.log(`[DEBUG] Obteniendo artículos para la categoría: ${categoryId}`);
    
    // Verificar si tenemos acceso a la base de datos
    if (!env.DB) {
      console.error(`[ERROR] No se pudo acceder a la base de datos D1`);
      return new Response(JSON.stringify({
        error: 'Error de configuración: No se pudo acceder a la base de datos',
        debug: 'env.DB no está disponible'
      }), {
        status: 500,
        headers
      });
    }
    
    // Usar D1 para obtener artículos filtrados por categoría
    console.log(`[DEBUG] Ejecutando consulta SQL para categoría: ${categoryId}`);
    const { results } = await env.DB.prepare(`
      SELECT * FROM articles WHERE category = ? ORDER BY pub_date DESC
    `).bind(categoryId).all();
    
    console.log(`[DEBUG] Resultados SQL para categoría '${categoryId}': ${results ? results.length : 0} artículos encontrados`);
    
    // Transformar los nombres de los campos para el frontend
    const transformedResults = results ? results.map(article => {
      // Verificar que todos los campos existan
      const transformed = {
        slug: article.slug || '',
        title: article.title || '',
        description: article.description || '',
        content: article.content || '',
        pubDate: article.pub_date || null,
        category: article.category || '',
        featured_image: article.featured_image || null,
        author: article.author || '',
        tags: []
      };
      
      // Intentar parsear tags si existen
      if (article.tags) {
        try {
          transformed.tags = JSON.parse(article.tags);
        } catch (e) {
          console.warn(`[WARN] Error al parsear tags para artículo ${article.slug}:`, e);
          transformed.tags = [];
        }
      }
      
      return transformed;
    }) : [];
    
    console.log(`[DEBUG] Transformados ${transformedResults.length} artículos para la respuesta`);
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error(`[ERROR] Error al obtener artículos para la categoría ${categoryId}:`, error);
    return new Response(JSON.stringify({
      error: error.message || 'Error del servidor',
      category: categoryId,
      debug: 'Error al procesar la consulta de artículos por categoría'
    }), {
      status: 500,
      headers
    });
  }
}
