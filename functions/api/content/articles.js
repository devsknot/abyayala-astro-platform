// Función para gestionar artículos a través de Cloudflare Functions
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // Verificar autenticación
  const authenticated = await verifyAuthentication(request, env);
  if (!authenticated && request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers
    });
  }
  
  try {
    console.log(`Solicitud recibida: ${request.method} ${path}`);
    
    // Ruta raíz /api/content/articles
    if (path === '/api/content/articles' || path === '/api/content/articles/') {
      if (request.method === 'GET') {
        return handleGetArticles(env, headers);
      } else if (request.method === 'POST') {
        return handleCreateArticle(await request.json(), env, headers);
      }
    }
    
    // Ruta para artículo específico /api/content/articles/{slug}
    const match = path.match(/^\/api\/content\/articles\/([^\/]+)$/);
    if (match) {
      const slug = match[1];
      console.log(`Solicitud para artículo específico: ${slug}`);
      
      if (request.method === 'GET') {
        return handleGetArticle(slug, env, headers);
      } else if (request.method === 'PUT') {
        return handleUpdateArticle(slug, await request.json(), env, headers);
      } else if (request.method === 'DELETE') {
        return handleDeleteArticle(slug, env, headers);
      }
    }
    
    // Ruta no encontrada
    console.error(`Ruta no encontrada: ${path}`);
    return new Response(JSON.stringify({ error: 'Ruta no encontrada', path }), {
      status: 404,
      headers
    });
  } catch (error) {
    console.error('Error en la API:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error del servidor' }), {
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

// Obtener todos los artículos
async function handleGetArticles(env, headers) {
  try {
    console.log('Obteniendo todos los artículos');
    
    // Usar D1 para obtener todos los artículos
    const { results } = await env.DB.prepare(`
      SELECT * FROM articles ORDER BY pub_date DESC
    `).all();
    
    console.log(`Recuperados ${results.length} artículos de la base de datos`);
    
    // Transformar los nombres de los campos para que coincidan con lo que espera el frontend
    const transformedResults = results.map(article => {
      const transformed = {
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        pubDate: article.pub_date, // Transformar pub_date a pubDate
        category: article.category,
        featured_image: article.featured_image // Usar solo featured_image
      };
      
      return transformed;
    });
    
    console.log('Artículos transformados para el frontend');
    
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    
    // Si hay un error con D1, usar datos de ejemplo como fallback
    if (env.ENVIRONMENT === 'development' || !env.DB) {
      console.log('Usando datos de fallback para artículos');
      const fallbackArticles = getFallbackArticles();
      return new Response(JSON.stringify(fallbackArticles), { headers });
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Crear un nuevo artículo
async function handleCreateArticle(articleData, env, headers) {
  try {
    // Validar datos
    if (!articleData.title || !articleData.slug) {
      return new Response(JSON.stringify({ error: 'Título y slug son obligatorios' }), {
        status: 400,
        headers
      });
    }
    
    // Verificar que el slug no exista
    const existingArticle = await env.DB.prepare(`
      SELECT slug FROM articles WHERE slug = ?
    `).bind(articleData.slug).first();
    
    if (existingArticle) {
      return new Response(JSON.stringify({ error: 'Ya existe un artículo con ese slug' }), {
        status: 409,
        headers
      });
    }
    
    // Formatear fecha correctamente
    let pubDate = articleData.pubDate || new Date().toISOString();
    // Asegurarse de que la fecha esté en formato ISO
    if (pubDate && !pubDate.includes('T')) {
      // Si es solo una fecha (YYYY-MM-DD), convertirla a formato ISO
      pubDate = new Date(pubDate).toISOString();
    }
    
    // Insertar el artículo en D1
    const result = await env.DB.prepare(`
      INSERT INTO articles (
        slug, title, description, content, pub_date, category, featured_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      articleData.slug,
      articleData.title,
      articleData.description || '',
      articleData.content || '',
      pubDate,
      articleData.category || '',
      articleData.featured_image || ''
    ).run();
    
    // Obtener el artículo recién creado
    const article = await env.DB.prepare(`
      SELECT * FROM articles WHERE slug = ?
    `).bind(articleData.slug).first();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo creado correctamente',
      article
    }), {
      status: 201,
      headers
    });
  } catch (error) {
    console.error('Error al crear artículo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Obtener un artículo específico
async function handleGetArticle(slug, env, headers) {
  try {
    console.log(`Obteniendo artículo con slug: ${slug}`);
    
    // Usar D1 para obtener el artículo
    const article = await env.DB.prepare(`
      SELECT * FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    console.log('Artículo recuperado de la base de datos:', article);
    
    if (!article) {
      console.log(`Artículo no encontrado con slug: ${slug}`);
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404,
        headers
      });
    }
    
    // Transformar los nombres de los campos para que coincidan con lo que espera el frontend
    const transformedArticle = {
      slug: article.slug,
      title: article.title,
      description: article.description,
      content: article.content,
      pubDate: article.pub_date, // Transformar pub_date a pubDate
      category: article.category,
      featured_image: article.featured_image // Usar solo featured_image
    };
    
    console.log('Artículo transformado para el frontend:', transformedArticle);
    
    return new Response(JSON.stringify(transformedArticle), { headers });
  } catch (error) {
    console.error('Error al obtener artículo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Actualizar un artículo
async function handleUpdateArticle(slug, articleData, env, headers) {
  try {
    // Validar datos
    if (!articleData.title || !articleData.slug) {
      return new Response(JSON.stringify({ error: 'Título y slug son obligatorios' }), {
        status: 400,
        headers
      });
    }
    
    // Verificar que el slug exista
    const existingArticle = await env.DB.prepare(`
      SELECT slug FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingArticle) {
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404,
        headers
      });
    }
    
    // Formatear fecha correctamente
    let pubDate = articleData.pubDate || new Date().toISOString();
    // Asegurarse de que la fecha esté en formato ISO
    if (pubDate && !pubDate.includes('T')) {
      // Si es solo una fecha (YYYY-MM-DD), convertirla a formato ISO
      pubDate = new Date(pubDate).toISOString();
    }
    
    // Actualizar el artículo en D1
    const result = await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        description = ?,
        content = ?,
        pub_date = ?,
        category = ?,
        featured_image = ?
      WHERE slug = ?
    `).bind(
      articleData.title,
      articleData.description || '',
      articleData.content || '',
      pubDate,
      articleData.category || '',
      articleData.featured_image || '',
      slug
    ).run();
    
    // Obtener el artículo actualizado
    const article = await env.DB.prepare(`
      SELECT * FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo actualizado correctamente',
      article
    }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error al actualizar artículo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Eliminar un artículo
async function handleDeleteArticle(slug, env, headers) {
  try {
    // Verificar que el slug exista
    const existingArticle = await env.DB.prepare(`
      SELECT slug FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingArticle) {
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404,
        headers
      });
    }
    
    // Eliminar el artículo en D1
    const result = await env.DB.prepare(`
      DELETE FROM articles WHERE slug = ?
    `).bind(slug).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo eliminado correctamente'
    }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error al eliminar artículo:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Datos de ejemplo para cuando la API no está disponible
function getFallbackArticles() {
  return [
    {
      slug: 'cooperativa-agricola-lanza-nueva-linea-de-cafe-organico',
      title: 'Cooperativa agrícola lanza nueva línea de café orgánico',
      description: 'La cooperativa Abya Yala presenta su nueva línea de café orgánico cultivado en altura y certificado por estándares internacionales.',
      pubDate: '2025-04-02T00:00:00.000Z',
      category: 'agricultura',
      featured_image: '/2025/04/cafe-organico.jpg'
    },
    {
      slug: 'innovacion-en-riego-sostenible-para-pequenos-productores',
      title: 'Innovación en riego sostenible para pequeños productores',
      description: 'Un grupo de agricultores implementa sistema de riego por goteo que reduce el consumo de agua en un 40%.',
      pubDate: '2025-03-20T00:00:00.000Z',
      category: 'tecnologia-rural',
      featured_image: '/2025/04/riego-sostenible.jpg'
    },
    {
      slug: 'feria-de-intercambio-de-semillas-promueve-biodiversidad',
      title: 'Feria de intercambio de semillas promueve biodiversidad',
      description: 'Más de 500 agricultores participaron en la primera feria de intercambio de semillas ancestrales.',
      pubDate: '2025-03-25T00:00:00.000Z',
      category: 'eventos',
      featured_image: '/2025/04/feria-semillas.jpg'
    },
    {
      slug: 'reunion-anual-de-cooperativas-define-agenda-2025',
      title: 'Reunión anual de cooperativas define agenda 2025',
      description: 'Representantes de 12 cooperativas agrarias se reunieron para definir la agenda de trabajo colaborativo para el próximo año.',
      pubDate: '2025-04-10T00:00:00.000Z',
      category: 'cooperativismo',
      featured_image: '/2025/04/cooperativa-reunion.jpg'
    }
  ];
}
