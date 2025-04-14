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
    // Usar D1 para obtener los artículos
    const { results } = await env.DB.prepare(`
      SELECT * FROM articles 
      ORDER BY pub_date DESC
    `).all();
    
    // Transformar los nombres de los campos para que coincidan con lo que espera el frontend
    const transformedResults = results.map(article => ({
      slug: article.slug,
      title: article.title,
      description: article.description,
      content: article.content,
      pubDate: article.pub_date, // Transformar pub_date a pubDate
      category: article.category,
      heroImage: article.hero_image // Transformar hero_image a heroImage
    }));
    
    return new Response(JSON.stringify(transformedResults || []), { headers });
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    
    // Si hay un error con D1, usar datos de ejemplo como fallback
    if (env.ENVIRONMENT === 'development' || !env.DB) {
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
        slug, title, description, content, pub_date, category, hero_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      articleData.slug,
      articleData.title,
      articleData.description || '',
      articleData.content || '',
      pubDate,
      articleData.category || '',
      articleData.heroImage || ''
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

// Datos de ejemplo para cuando la API no está disponible
function getFallbackArticles() {
  return [
    {
      slug: 'record-cafe-organico',
      title: 'Récord en producción de café orgánico',
      description: 'Cooperativa local logra récord de producción con prácticas sostenibles',
      pubDate: '2025-04-02T00:00:00.000Z',
      category: 'agricultura',
      heroImage: '/uploads/2025/04/cafe-organico.jpg'
    },
    {
      slug: 'tecnica-riego-sostenible',
      title: 'Nueva técnica de riego sostenible',
      description: 'Innovadora técnica de riego que ahorra hasta un 60% de agua',
      pubDate: '2025-03-20T00:00:00.000Z',
      category: 'tecnologia-rural',
      heroImage: '/uploads/2025/03/riego-sostenible.jpg'
    },
    {
      slug: 'feria-semillas-ancestrales',
      title: 'Feria de semillas ancestrales',
      description: 'La tradicional feria de intercambio de semillas ancestrales organizada por Abya Yala contó con la participación de agricultores de toda la región',
      pubDate: '2025-03-25T00:00:00.000Z',
      category: 'eventos',
      heroImage: '/uploads/2025/03/feria-semillas.jpg'
    }
  ];
}
