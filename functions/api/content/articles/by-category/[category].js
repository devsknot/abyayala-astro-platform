// API para obtener artículos por categoría
export async function onRequest(context) {
  const { request, env, params } = context;
  const categoryId = params.category;
  
  console.log(`[CATEGORY-API] Iniciando solicitud para categoría: "${categoryId}"`);
  console.log(`[CATEGORY-API] URL completa: ${request.url}`);
  console.log(`[CATEGORY-API] Método: ${request.method}`);
  
  // Configurar cabeceras CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  // Manejar solicitudes OPTIONS (preflight CORS)
  if (request.method === 'OPTIONS') {
    console.log(`[CATEGORY-API] Manejando solicitud OPTIONS`);
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
    console.log(`[CATEGORY-API] Método no permitido: ${request.method}`);
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers
    });
  }
  
  try {
    console.log(`[CATEGORY-API] Verificando conexión a la base de datos...`);
    if (!env.DB) {
      console.error(`[CATEGORY-API] Error: env.DB no está disponible`);
      return new Response(JSON.stringify({ error: 'Error de configuración de la base de datos' }), {
        status: 500,
        headers
      });
    }
    
    console.log(`[CATEGORY-API] Preparando consulta SQL para categoría: "${categoryId}"`);
    
    // Usar D1 para obtener artículos filtrados por categoría
    const query = `
      SELECT a.*, 
             aut.id as author_id, 
             aut.name as author_name, 
             aut.slug as author_slug, 
             aut.avatar as author_avatar
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      WHERE a.category = ?
      ORDER BY a.pub_date DESC
    `;
    
    console.log(`[CATEGORY-API] Ejecutando consulta: ${query.replace(/\s+/g, ' ')}`);
    console.log(`[CATEGORY-API] Parámetro de consulta: "${categoryId}"`);
    
    const statement = env.DB.prepare(query);
    console.log(`[CATEGORY-API] Statement preparado`);
    
    const bound = statement.bind(categoryId);
    console.log(`[CATEGORY-API] Parámetros vinculados`);
    
    const result = await bound.all();
    console.log(`[CATEGORY-API] Consulta ejecutada`);
    
    const { results, success, error } = result;
    
    if (!success) {
      console.error(`[CATEGORY-API] Error en la consulta:`, error);
      return new Response(JSON.stringify({ error: 'Error en la consulta a la base de datos' }), {
        status: 500,
        headers
      });
    }
    
    console.log(`[CATEGORY-API] Recuperados ${results ? results.length : 0} artículos para la categoría "${categoryId}"`);
    
    if (!results || results.length === 0) {
      console.log(`[CATEGORY-API] No se encontraron artículos para la categoría "${categoryId}"`);
      return new Response(JSON.stringify([]), { headers });
    }
    
    // Mostrar información del primer artículo para depuración
    console.log(`[CATEGORY-API] Primer artículo: ${JSON.stringify({
      slug: results[0].slug,
      title: results[0].title,
      category: results[0].category
    })}`);
    
    // Transformar los nombres de los campos para que coincidan con lo que espera el frontend
    console.log(`[CATEGORY-API] Transformando resultados para el frontend...`);
    const transformedResults = results.map(article => {
      const transformed = {
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        pubDate: article.pub_date,
        category: article.category,
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
      
      return transformed;
    });
    
    console.log(`[CATEGORY-API] Enviando respuesta con ${transformedResults.length} artículos`);
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error(`[CATEGORY-API] Error al obtener artículos para la categoría "${categoryId}":`, error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), {
      status: 500,
      headers
    });
  }
}
