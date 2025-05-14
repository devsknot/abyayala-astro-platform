// Función para gestionar el contenido (artículos y categorías) a través de Cloudflare Functions
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
    
    // Manejar diferentes rutas y métodos
    if (path === '/api/content/articles' || path === '/api/content/articles/') {
      if (request.method === 'GET') {
        return handleGetArticles(env, headers);
      } else if (request.method === 'POST') {
        return handleCreateArticle(await request.json(), env, headers);
      }
    } else if (path.startsWith('/api/content/articles/')) {
      const slug = path.replace('/api/content/articles/', '');
      
      if (request.method === 'GET') {
        return handleGetArticle(slug, env, headers);
      } else if (request.method === 'PUT') {
        return handleUpdateArticle(slug, await request.json(), env, headers);
      } else if (request.method === 'DELETE') {
        return handleDeleteArticle(slug, env, headers);
      }
    } else if (path === '/api/content/categories' || path === '/api/content/categories/') {
      return handleGetCategories(env, headers);
    } else if (path === '/api/content') {
      // Redirigir a /api/content/articles para compatibilidad
      return new Response(JSON.stringify({ message: 'API de contenido. Usa /api/content/articles o /api/content/categories' }), {
        headers
      });
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

// Obtener todos los artículos con sus categorías
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
    
    // Configurar cabeceras para evitar problemas de caché
    const responseHeaders = {
      ...headers,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
    
    return new Response(JSON.stringify(transformedResults), { headers: responseHeaders });
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
      articleData.pubDate || new Date().toISOString(),
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
    
    // Actualizar el artículo
    const result = await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        description = ?,
        content = ?,
        pub_date = ?,
        category = ?,
        featured_image = ?,
        updated_at = datetime('now')
      WHERE slug = ?
    `).bind(
      articleData.title || existingArticle.title,
      articleData.description || existingArticle.description,
      articleData.content || existingArticle.content,
      articleData.pubDate || existingArticle.pub_date,
      articleData.category || existingArticle.category,
      articleData.featured_image || existingArticle.featured_image,
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

// Obtener todas las categorías
async function handleGetCategories(env, headers) {
  try {
    // Usar D1 para obtener las categorías
    const { results } = await env.DB.prepare(`
      SELECT * FROM categories 
      ORDER BY name
    `).all();
    
    return new Response(JSON.stringify(results || []), { headers });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    
    // Si hay un error con D1, usar datos de ejemplo como fallback
    if (env.ENVIRONMENT === 'development' || !env.DB) {
      const fallbackCategories = getFallbackCategories();
      return new Response(JSON.stringify(fallbackCategories), { headers });
    }
    
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
      pubDate: '2025-04-02',
      category: 'agricultura',
      featured_image: '/uploads/2025/04/cafe-organico.jpg'
    },
    {
      slug: 'tecnica-riego-sostenible',
      title: 'Nueva técnica de riego sostenible',
      description: 'Innovadora técnica de riego que ahorra hasta un 60% de agua',
      pubDate: '2025-03-20',
      category: 'tecnologia-rural',
      featured_image: '/uploads/2025/03/riego-sostenible.jpg'
    },
    {
      slug: 'feria-semillas-ancestrales',
      title: 'Feria de semillas ancestrales',
      description: 'La tradicional feria de intercambio de semillas ancestrales organizada por Abya Yala contó con la participación de agricultores de toda la región',
      pubDate: '2025-03-25',
      category: 'eventos',
      featured_image: '/uploads/2025/03/feria-semillas.jpg'
    }
  ];
}

// Obtener un artículo de ejemplo específico
function getFallbackArticle(slug) {
  const articles = getFallbackArticles();
  const article = articles.find(a => a.slug === slug);
  
  if (article) {
    return {
      ...article,
      content: `# ${article.title}\n\nEste es un contenido de ejemplo para el artículo "${article.title}". En un entorno de producción, este contenido vendría de la API.`
    };
  }
  
  return null;
}

// Obtener categorías de ejemplo
function getFallbackCategories() {
  return [
    {
      id: 'agricultura',
      name: 'Agricultura',
      description: 'Noticias sobre prácticas agrícolas, cultivos y temporadas'
    },
    {
      id: 'comunidad',
      name: 'Comunidad',
      description: 'Historias de miembros, cooperación y testimonios'
    },
    {
      id: 'sostenibilidad',
      name: 'Sostenibilidad',
      description: 'Prácticas ecológicas, conservación y biodiversidad'
    },
    {
      id: 'politica-agraria',
      name: 'Política Agraria',
      description: 'Legislación, derechos y movimientos sociales'
    },
    {
      id: 'tecnologia-rural',
      name: 'Tecnología Rural',
      description: 'Innovaciones, herramientas y digitalización'
    },
    {
      id: 'cultura',
      name: 'Cultura',
      description: 'Tradiciones, gastronomía y artesanía'
    },
    {
      id: 'eventos',
      name: 'Eventos',
      description: 'Ferias, encuentros y capacitaciones'
    }
  ];
}
