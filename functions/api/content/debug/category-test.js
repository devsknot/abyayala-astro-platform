// API para depurar y probar la consulta de artículos por categoría
export async function onRequest(context) {
  const { request, env } = context;
  
  // Configurar cabeceras CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  try {
    console.log(`[DEBUG-API] Iniciando prueba de consulta de categorías`);
    
    // Verificar conexión a la base de datos
    if (!env.DB) {
      console.error(`[DEBUG-API] Error: env.DB no está disponible`);
      return new Response(JSON.stringify({ error: 'Error de configuración de la base de datos' }), {
        status: 500,
        headers
      });
    }
    
    // Obtener todas las categorías disponibles
    console.log(`[DEBUG-API] Consultando todas las categorías disponibles...`);
    const categoriesResult = await env.DB.prepare(`
      SELECT id, name FROM categories
    `).all();
    
    const categories = categoriesResult.results || [];
    console.log(`[DEBUG-API] Categorías encontradas: ${categories.length}`);
    
    // Obtener un conteo de artículos por categoría
    console.log(`[DEBUG-API] Consultando conteo de artículos por categoría...`);
    const countResult = await env.DB.prepare(`
      SELECT category, COUNT(*) as count 
      FROM articles 
      GROUP BY category
    `).all();
    
    const counts = countResult.results || [];
    console.log(`[DEBUG-API] Resultados de conteo: ${counts.length}`);
    
    // Probar específicamente la categoría "agricultura"
    console.log(`[DEBUG-API] Probando específicamente la categoría "agricultura"...`);
    const agriculturaResult = await env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM articles 
      WHERE category = ?
    `).bind("agricultura").all();
    
    const agriculturaCount = agriculturaResult.results?.[0]?.count || 0;
    console.log(`[DEBUG-API] Artículos en categoría "agricultura": ${agriculturaCount}`);
    
    // Obtener algunos ejemplos de artículos de agricultura
    console.log(`[DEBUG-API] Obteniendo ejemplos de artículos de agricultura...`);
    const agriculturaExamples = await env.DB.prepare(`
      SELECT id, slug, title, category
      FROM articles 
      WHERE category = ?
      LIMIT 5
    `).bind("agricultura").all();
    
    const examples = agriculturaExamples.results || [];
    console.log(`[DEBUG-API] Ejemplos obtenidos: ${examples.length}`);
    
    // Construir respuesta con toda la información de depuración
    const response = {
      status: "success",
      categories: categories,
      categoryCounts: counts,
      agriculturaCount: agriculturaCount,
      agriculturaExamples: examples,
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response, null, 2), { headers });
  } catch (error) {
    console.error(`[DEBUG-API] Error en la API de depuración:`, error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error del servidor',
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers
    });
  }
}
