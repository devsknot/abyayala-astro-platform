// Endpoint a nivel raíz para evitar problemas de enrutamiento en Cloudflare
export async function onRequest(context) {
  // Logs detallados para depuración
  console.log('[contentapi.js] onRequest invocado');
  
  const { request, env } = context;
  
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
    console.log(`Solicitud recibida en contentapi.js: ${request.method}`);
    
    // Solo permitimos GET para este endpoint
    if (request.method === 'GET') {
      return await handleGetArticles(env, headers);
    }
    
    // Método no permitido
    return new Response(JSON.stringify({ 
      error: 'Método no permitido' 
    }), { 
      status: 405,
      headers 
    });
    
  } catch (error) {
    console.error('Error en contentapi.js:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), { 
      status: 500,
      headers 
    });
  }
}

// Función para obtener todos los artículos con categorías
async function handleGetArticles(env, headers) {
  try {
    console.log('Obteniendo todos los artículos con categorías');
    
    // Usar D1 para obtener todos los artículos con información de autor
    const { results } = await env.DB.prepare(`
      SELECT a.id, a.slug, a.title, a.description, a.content, a.pub_date, 
             a.featured_image, a.author_id, a.author, a.tags, 
             a.category,
             aut.id as author_id, 
             aut.name as author_name, 
             aut.slug as author_slug, 
             aut.avatar as author_avatar
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      ORDER BY a.pub_date DESC
    `).all();
    
    console.log(`Recuperados ${results.length} artículos de la base de datos`);
    
    // Transformar los resultados para incluir categorías como array
    const transformedResults = results.map(article => {
      // Obtener categoría desde DB
      const categoryFromDB = article.category || '';
      let categories = [];
      
      // Agregar categoría si existe
      if (categoryFromDB && categoryFromDB !== '') {
        categories.push(categoryFromDB);
      }
      
      // Procesar tags para encontrar categorías adicionales
      try {
        const tags = article.tags ? JSON.parse(article.tags) : [];
        const catTags = tags.filter(tag => tag.startsWith('cat:'));
        if (catTags.length > 0) {
          catTags.forEach(tag => {
            const catName = tag.substring(4).trim();
            if (catName && !categories.includes(catName)) {
              categories.push(catName);
            }
          });
        }
        
        // Log para depuración
        console.log(`Artículo [${article.slug}]: categoría principal [${categoryFromDB}], categorías finales [${categories.join(', ')}]`);
        
      } catch (e) {
        console.error(`Error procesando tags para artículo ${article.slug}: ${e.message}`);
      }
      
      // Crear objeto transformado
      return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        pubDate: article.pub_date,
        category: categoryFromDB,
        categories: categories, // Incluir array de categorías
        featured_image: article.featured_image,
        author: article.author,
        tags: article.tags ? JSON.parse(article.tags) : [],
        author_info: article.author_id ? {
          id: article.author_id,
          name: article.author_name,
          slug: article.author_slug,
          avatar: article.author_avatar
        } : null
      };
    });
    
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), { 
      status: 500, 
      headers 
    });
  }
}
