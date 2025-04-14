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
    
    // Transformar los nombres de los campos para que coincidan con lo que espera el frontend
    const transformedArticle = {
      slug: article.slug,
      title: article.title,
      description: article.description,
      content: article.content,
      pubDate: article.pub_date, // Transformar pub_date a pubDate
      category: article.category,
      featured_image: article.featured_image, // Mantener el mismo nombre
      author_id: article.author_id, // Incluir el ID del autor
      tags: article.tags ? JSON.parse(article.tags) : [] // Parsear las etiquetas JSON a array
    };
    
    return new Response(JSON.stringify(transformedArticle), { headers });
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
        featured_image = ?,
        author_id = ?,
        tags = ?,
        updated_at = datetime('now')
      WHERE slug = ?
    `).bind(
      articleData.title || existingArticle.title,
      articleData.description || existingArticle.description,
      articleData.content || existingArticle.content,
      pubDate,
      articleData.category || existingArticle.category,
      articleData.featured_image || existingArticle.featured_image,
      articleData.author_id || existingArticle.author_id,
      articleData.tags ? JSON.stringify(articleData.tags) : existingArticle.tags,
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
    'cooperativa-agricola-lanza-nueva-linea-de-cafe-organico': {
      slug: 'cooperativa-agricola-lanza-nueva-linea-de-cafe-organico',
      title: 'Cooperativa agrícola lanza nueva línea de café orgánico',
      description: 'La cooperativa Abya Yala presenta su nueva línea de café orgánico cultivado en altura y certificado por estándares internacionales.',
      content: '# Récord en producción de café orgánico\n\nLa cooperativa agraria Abya Yala ha alcanzado un nuevo récord en la producción de café orgánico, superando las expectativas del mercado nacional e internacional.',
      pubDate: '2025-04-02T00:00:00.000Z',
      category: 'agricultura',
      featured_image: '/2025/04/cafe-organico.jpg'
    },
    'innovacion-en-riego-sostenible-para-pequenos-productores': {
      slug: 'innovacion-en-riego-sostenible-para-pequenos-productores',
      title: 'Innovación en riego sostenible para pequeños productores',
      description: 'Un grupo de agricultores implementa sistema de riego por goteo que reduce el consumo de agua en un 40%.',
      content: '# Nueva técnica de riego sostenible\n\nUn grupo de agricultores del colectivo Abya Yala ha implementado con éxito un sistema de riego por goteo subterráneo que ha permitido reducir el consumo de agua en un 40%.',
      pubDate: '2025-03-20T00:00:00.000Z',
      category: 'tecnologia-rural',
      featured_image: '/2025/04/riego-sostenible.jpg'
    },
    'feria-de-intercambio-de-semillas-promueve-biodiversidad': {
      slug: 'feria-de-intercambio-de-semillas-promueve-biodiversidad',
      title: 'Feria de intercambio de semillas promueve biodiversidad',
      description: 'Más de 500 agricultores participaron en la primera feria de intercambio de semillas ancestrales.',
      content: '# Feria de semillas ancestrales\n\nEl pasado fin de semana se celebró con gran éxito la primera feria de intercambio de semillas ancestrales organizada por nuestro colectivo. Más de 500 agricultores de la región participaron en este evento que busca preservar la biodiversidad agrícola local.',
      pubDate: '2025-03-25T00:00:00.000Z',
      category: 'eventos',
      featured_image: '/2025/04/feria-semillas.jpg'
    },
    'reunion-anual-de-cooperativas-define-agenda-2025': {
      slug: 'reunion-anual-de-cooperativas-define-agenda-2025',
      title: 'Reunión anual de cooperativas define agenda 2025',
      description: 'Representantes de 12 cooperativas agrarias se reunieron para definir la agenda de trabajo colaborativo para el próximo año.',
      content: '# Cooperativas definen agenda 2025\n\nEn un encuentro histórico, representantes de 12 cooperativas agrarias de la región se reunieron en la sede de Abya Yala para definir una agenda común de trabajo para el año 2025, enfocada en la soberanía alimentaria y la agroecología.',
      pubDate: '2025-04-10T00:00:00.000Z',
      category: 'cooperativismo',
      featured_image: '/2025/04/cooperativa-reunion.jpg'
    }
  };
  
  return articles[slug] || null;
}
