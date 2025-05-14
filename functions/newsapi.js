// Endpoint API para lista de artículos (a nivel raíz para evitar problemas de ruta)
export async function onRequest(context) {
  console.log('>>> ENTRANDO A ENDPOINT NEWSAPI (NIVEL RAÍZ) <<<');
  const { request, env } = context;
  
  // Log para depuración
  console.log('URL de petición:', request.url);
  console.log('Método:', request.method);
  
  // Configurar cabeceras CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  try {
    console.log('Obteniendo todos los artículos desde newsapi.js (endpoint raíz)');
    
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
      } catch (e) {
        console.error(`Error procesando tags: ${e.message}`);
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
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers 
    });
  }
}
