// Función para gestionar artículos individuales a través de Cloudflare Functions
export async function onRequest(context) {
  const { request, env, params } = context;
  const slug = params.slug;
  
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
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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
    console.log(`Solicitud recibida: ${request.method} /api/content/articles/${slug}`);
    
    if (request.method === 'GET') {
      return handleGetArticle(slug, env, headers);
    } else if (request.method === 'PUT') {
      return handleUpdateArticle(slug, await request.json(), env, headers);
    } else if (request.method === 'DELETE') {
      return handleDeleteArticle(slug, env, headers);
    }
    
    // Método no permitido
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
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

// Obtener un artículo específico
async function handleGetArticle(slug, env, headers) {
  try {
    // Usar D1 para obtener el artículo
    const article = await env.DB.prepare(`
      SELECT * FROM articles 
      WHERE slug = ?
    `).bind(slug).first();
    
    if (!article) {
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404,
        headers
      });
    }
    
    return new Response(JSON.stringify(article), { headers });
  } catch (error) {
    console.error('Error al obtener artículo:', error);
    
    // Si hay un error con D1, usar datos de ejemplo como fallback
    if (env.ENVIRONMENT === 'development' || !env.DB) {
      const fallbackArticle = getFallbackArticle(slug);
      if (fallbackArticle) {
        return new Response(JSON.stringify(fallbackArticle), { headers });
      }
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Actualizar un artículo existente
async function handleUpdateArticle(slug, articleData, env, headers) {
  try {
    // Verificar que el artículo exista
    const existingArticle = await env.DB.prepare(`
      SELECT * FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingArticle) {
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404,
        headers
      });
    }
    
    // Formatear fecha correctamente
    let pubDate = articleData.pubDate || existingArticle.pub_date;
    // Asegurarse de que la fecha esté en formato ISO
    if (pubDate && !pubDate.includes('T')) {
      // Si es solo una fecha (YYYY-MM-DD), convertirla a formato ISO
      try {
        pubDate = new Date(pubDate).toISOString();
      } catch (e) {
        console.error('Error al convertir fecha:', e);
        // Mantener la fecha existente si hay error
        pubDate = existingArticle.pub_date;
      }
    }
    
    // Actualizar el artículo
    const result = await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        description = ?,
        content = ?,
        pub_date = ?,
        category = ?,
        hero_image = ?,
        updated_at = datetime('now')
      WHERE slug = ?
    `).bind(
      articleData.title || existingArticle.title,
      articleData.description || existingArticle.description,
      articleData.content || existingArticle.content,
      pubDate,
      articleData.category || existingArticle.category,
      articleData.heroImage || existingArticle.hero_image,
      slug
    ).run();
    
    // Obtener el artículo actualizado
    const updatedArticle = await env.DB.prepare(`
      SELECT * FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo actualizado correctamente',
      article: updatedArticle
    }), {
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
    // Verificar que el artículo exista
    const existingArticle = await env.DB.prepare(`
      SELECT * FROM articles WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingArticle) {
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404,
        headers
      });
    }
    
    // Eliminar el artículo
    const result = await env.DB.prepare(`
      DELETE FROM articles WHERE slug = ?
    `).bind(slug).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo eliminado correctamente'
    }), {
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

// Obtener un artículo de ejemplo específico
function getFallbackArticle(slug) {
  const articles = {
    'record-cafe-organico': {
      slug: 'record-cafe-organico',
      title: 'Récord en producción de café orgánico',
      description: 'Cooperativa local logra récord de producción con prácticas sostenibles',
      content: '# Récord en producción de café orgánico\n\nLa cooperativa agraria Abya Yala ha alcanzado un nuevo récord en la producción de café orgánico, superando las expectativas del mercado nacional e internacional.',
      pubDate: '2025-04-02T00:00:00.000Z',
      category: 'agricultura',
      heroImage: '/uploads/2025/04/cafe-organico.jpg'
    },
    'tecnica-riego-sostenible': {
      slug: 'tecnica-riego-sostenible',
      title: 'Nueva técnica de riego sostenible',
      description: 'Innovadora técnica de riego que ahorra hasta un 60% de agua',
      content: '# Nueva técnica de riego sostenible\n\nUn grupo de agricultores del colectivo Abya Yala ha implementado con éxito un sistema de riego por goteo subterráneo que ha permitido reducir el consumo de agua en un 40%.',
      pubDate: '2025-03-20T00:00:00.000Z',
      category: 'tecnologia-rural',
      heroImage: '/uploads/2025/03/riego-sostenible.jpg'
    },
    'feria-semillas-ancestrales': {
      slug: 'feria-semillas-ancestrales',
      title: 'Feria de semillas ancestrales',
      description: 'La tradicional feria de intercambio de semillas ancestrales organizada por Abya Yala contó con la participación de agricultores de toda la región',
      content: '# Feria de semillas ancestrales\n\nEl pasado fin de semana se celebró con gran éxito la primera feria de intercambio de semillas ancestrales organizada por nuestro colectivo. Más de 500 agricultores de la región participaron en este evento que busca preservar la biodiversidad agrícola local.',
      pubDate: '2025-03-25T00:00:00.000Z',
      category: 'eventos',
      heroImage: '/uploads/2025/03/feria-semillas.jpg'
    }
  };
  
  return articles[slug] || null;
}
