// Endpoint de prueba para depurar la transformación de artículos
export async function onRequest(context) {
  const { env } = context;
  
  // Configurar cabeceras CORS y caché
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
  
  try {
    console.log('[DEBUG] Obteniendo artículos para depuración');
    
    // Obtener un artículo de ejemplo
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
      LIMIT 1
    `).all();
    
    if (results.length === 0) {
      return new Response(JSON.stringify({ error: 'No se encontraron artículos' }), { headers });
    }
    
    const article = results[0];
    console.log('[DEBUG] Artículo original de la base de datos:', article);
    
    // Transformar manualmente sin añadir el campo categories
    const transformedArticle = {
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
      } : null,
      // Añadir información de depuración
      debug_info: {
        timestamp: new Date().toISOString(),
        environment: env.ENVIRONMENT || 'unknown',
        original_category: article.category,
        has_categories_field: false
      }
    };
    
    console.log('[DEBUG] Artículo transformado:', transformedArticle);
    
    // Devolver el artículo transformado
    return new Response(JSON.stringify(transformedArticle), { headers });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers
    });
  }
}
