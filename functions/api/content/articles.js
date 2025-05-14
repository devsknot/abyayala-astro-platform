// Función para gestionar el listado de artículos
export async function onRequest(context) {
  const { request, env } = context;
  
  console.log('[articles.js] Solicitud recibida:', request.method);
  
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Verificar autenticación para métodos que no sean GET
  if (request.method !== 'GET') {
    const authenticated = await verifyAuthentication(request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers
      });
    }
  }
  
  try {
    // Manejar solicitudes según el método
    if (request.method === 'GET') {
      return await handleGetArticles(env, headers);
    } else if (request.method === 'POST') {
      return await handleCreateArticle(await request.json(), env, headers);
    }
    
    // Método no permitido
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers
    });
  } catch (error) {
    console.error('[articles.js] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor',
      success: false
    }), { 
      status: 500, 
      headers 
    });
  }
}

// Verificar autenticación
async function verifyAuthentication(request, env) {
  // En un entorno de desarrollo, permitir acceso sin autenticación
  if (env.ENVIRONMENT === 'development') {
    return true;
  }
  
  // Para solicitudes GET, permitir acceso sin autenticación
  if (request.method === 'GET') {
    return true;
  }
  
  // En producción, verificar cabeceras de Cloudflare Access
  const jwt = request.headers.get('CF-Access-Jwt-Assertion');
  const clientId = request.headers.get('CF-Access-Client-Id');
  
  // Para solicitudes desde el panel de administración en desarrollo
  if (clientId === 'development-client-id') {
    return true;
  }
  
  return !!jwt; // Verificar que existe el token JWT
}

// Obtener todos los artículos con transformación de categorías
async function handleGetArticles(env, headers) {
  try {
    console.log('[articles.js] Obteniendo todos los artículos');
    
    // Query para obtener artículos con la estructura real de la DB
    const query = `
      SELECT a.id, a.slug, a.title, a.description, a.content, a.pub_date, 
             a.featured_image, a.author_id, a.category, a.tags,
             aut.id as author_id, aut.name as author_name, 
             aut.slug as author_slug, aut.avatar as author_avatar
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      ORDER BY a.pub_date DESC
    `;
    
    console.log('[articles.js] Ejecutando query:', query);
    
    const { results } = await env.DB.prepare(query).all();
    
    console.log(`[articles.js] Recuperados ${results.length} artículos de la base de datos`);
    
    // Transformar los resultados para incluir un array de categorías compatible con el frontend
    const transformedResults = results.map(article => {
      // Crear un array con la categoría principal si existe
      const categoryFromDB = article.category || '';
      let categories = [];
      
      if (categoryFromDB && categoryFromDB !== '') {
        categories.push(categoryFromDB);
      }
      
      // Procesar tags para extraer categorías adicionales
      let parsedTags = [];
      try {
        // Los tags están almacenados como JSON string en la DB
        parsedTags = article.tags ? JSON.parse(article.tags) : [];
        
        // Extraer categorías de tags con prefijo "cat:"
        const catTags = parsedTags.filter(tag => tag && typeof tag === 'string' && tag.startsWith('cat:'));
        catTags.forEach(tag => {
          const catName = tag.substring(4).trim();
          if (catName && !categories.includes(catName)) {
            categories.push(catName);
          }
        });
      } catch (e) {
        console.error(`[articles.js] Error procesando tags para artículo ${article.id} (${article.slug}):`, e.message);
        console.error(`[articles.js] Tag value:`, article.tags);
      }
      
      // Solo mostrar logs detallados para los primeros 5 artículos
      if (results.indexOf(article) < 5) {
        console.log('========================================');
        console.log(`Artículo: ${article.title} (${article.id})`);
        console.log(`Categoría original: [${categoryFromDB}]`);
        console.log(`Tags: ${JSON.stringify(parsedTags)}`);
        console.log(`Categorías procesadas: ${JSON.stringify(categories)}`);
        console.log('========================================');
      }
      
      // Devolver objeto con el array de categorías y la estructura compatible con el frontend
      return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        pubDate: article.pub_date,
        featured_image: article.featured_image,
        category: categoryFromDB,          // Mantener la categoría original
        categories: categories,            // Agregar array de categorías 
        tags: parsedTags,
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
    console.error('[articles.js] Error al obtener artículos:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error al obtener artículos',
      success: false
    }), { 
      status: 500, 
      headers 
    });
  }
}

// Crear un nuevo artículo
async function handleCreateArticle(articleData, env, headers) {
  try {
    console.log('[articles.js] Creando nuevo artículo');
    
    // Validar datos requeridos
    if (!articleData.title || !articleData.slug) {
      return new Response(JSON.stringify({ 
        error: 'El título y slug son obligatorios', 
        success: false 
      }), { 
        status: 400, 
        headers 
      });
    }
    
    // Convertir tags a formato JSON si vienen como array
    const tagsJSON = typeof articleData.tags === 'string' 
      ? articleData.tags 
      : JSON.stringify(articleData.tags || []);
    
    // Insertar el artículo en la base de datos
    const result = await env.DB.prepare(`
      INSERT INTO articles (
        slug, title, description, content, pub_date, featured_image, 
        author_id, category, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      articleData.slug,
      articleData.title,
      articleData.description || '',
      articleData.content || '',
      articleData.pubDate || new Date().toISOString(),
      articleData.featured_image || '',
      articleData.author_id || 1,  // ID de autor por defecto
      articleData.category || '',
      tagsJSON
    ).run();
    
    console.log('[articles.js] Artículo creado con éxito:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo creado con éxito',
      slug: articleData.slug
    }), { 
      status: 201, 
      headers 
    });
  } catch (error) {
    console.error('[articles.js] Error al crear artículo:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Error al crear el artículo',
      success: false
    }), { 
      status: 500, 
      headers 
    });
  }
}
