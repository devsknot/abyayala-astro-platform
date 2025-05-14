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
    
    // La ruta para artículos por categoría ahora se maneja en un archivo separado
    

    
    // Excluir rutas de categoría para que el endpoint anidado las maneje
    if (path.startsWith('/api/content/articles/category/')) {
      // Deja que el sistema de archivos maneje esta ruta
      return;
    }

    // Ruta para artículo específico /api/content/articles/{slug}
    const match = path.match(/^\/api\/content\/articles\/([^\/]+)$/);
    if (match) {
      const slug = match[1];
      
      // Verificar que el slug no sea "category" o comience con "category/"
      if (slug === 'category' || slug.startsWith('category/')) {
        console.log(`Solicitud para ruta de categoría detectada: ${slug}. Esta ruta se maneja en un archivo separado.`);
        return new Response(JSON.stringify({ error: 'Esta ruta debe ser manejada por el archivo de categorías' }), {
          status: 404,
          headers
        });
      }
      
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
    
    // Usar D1 para obtener todos los artículos con información de autor
    const { results } = await env.DB.prepare(`
      SELECT a.*, 
             aut.id as author_id, 
             aut.name as author_name, 
             aut.slug as author_slug, 
             aut.avatar as author_avatar
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      ORDER BY a.pub_date DESC
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
        category: article.category, // Campo de categoría singular
        featured_image: article.featured_image, // Usar solo featured_image
        author: article.author, // Campo de texto original
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
    
    console.log('Artículos transformados para el frontend');
    
    return new Response(JSON.stringify(transformedResults), { headers });
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    
    // En caso de error, devolver un array vacío en lugar de datos hardcodeados
    console.log('Devolviendo array vacío debido al error');
    return new Response(JSON.stringify([]), { headers });
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
        slug, title, description, content, pub_date, category, featured_image, author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      articleData.slug,
      articleData.title,
      articleData.description || '',
      articleData.content || '',
      pubDate,
      articleData.category || '',
      articleData.featured_image || '',
      articleData.author || null
    ).run();
    
    // Obtener el artículo recién creado
    const article = await env.DB.prepare(`
      SELECT a.*, 
             aut.id as author_id, 
             aut.name as author_name, 
             aut.slug as author_slug, 
             aut.bio as author_bio,
             aut.avatar as author_avatar,
             aut.social_media as author_social_media
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      WHERE a.slug = ?
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
    
    // Usar D1 para obtener el artículo con información de autor
    const article = await env.DB.prepare(`
      SELECT a.*, 
             aut.id as author_id, 
             aut.name as author_name, 
             aut.slug as author_slug, 
             aut.bio as author_bio,
             aut.avatar as author_avatar,
             aut.social_media as author_social_media
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      WHERE a.slug = ?
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
      featured_image: article.featured_image, // Usar solo featured_image
      author: article.author, // Campo de texto original
      tags: article.tags ? JSON.parse(article.tags) : [],
      author_info: article.author_id ? {
        id: article.author_id,
        name: article.author_name,
        slug: article.author_slug,
        bio: article.author_bio,
        avatar: article.author_avatar,
        social_media: article.author_social_media
      } : null
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
    
    console.log('Datos recibidos para actualizar artículo:', JSON.stringify(articleData, null, 2));
    console.log('Autor recibido:', articleData.author);
    
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
    
    // Convertir author_id a número si es una cadena
    let authorId = null;
    if (articleData.author) {
      // Intentar convertir a número si es una cadena
      authorId = parseInt(articleData.author, 10);
      // Si no es un número válido, usar el valor original
      if (isNaN(authorId)) {
        authorId = articleData.author;
      }
    }
    
    console.log('Autor procesado para la base de datos:', authorId);
    
    // Actualizar el artículo en D1
    const result = await env.DB.prepare(`
      UPDATE articles SET
        title = ?,
        description = ?,
        content = ?,
        pub_date = ?,
        category = ?,
        featured_image = ?,
        author_id = ?
      WHERE slug = ?
    `).bind(
      articleData.title,
      articleData.description || '',
      articleData.content || '',
      pubDate,
      articleData.category || '',
      articleData.featured_image || '',
      authorId,
      slug
    ).run();
    
    console.log('Resultado de la actualización:', result);
    
    // Obtener el artículo actualizado
    const article = await env.DB.prepare(`
      SELECT a.*, 
             aut.id as author_id, 
             aut.name as author_name, 
             aut.slug as author_slug, 
             aut.bio as author_bio,
             aut.avatar as author_avatar,
             aut.social_media as author_social_media
      FROM articles a
      LEFT JOIN authors aut ON a.author_id = aut.id
      WHERE a.slug = ?
    `).bind(slug).first();
    
    console.log('Artículo recuperado después de actualizar:', article);
    
    // Transformar el artículo para incluir información del autor en un formato más accesible
    const transformedArticle = {
      ...article,
      author_info: article.author_id ? {
        id: article.author_id,
        name: article.author_name,
        slug: article.author_slug,
        bio: article.author_bio,
        avatar: article.author_avatar,
        social_media: article.author_social_media
      } : null
    };
    
    console.log('Artículo transformado para respuesta:', transformedArticle);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo actualizado correctamente',
      article: transformedArticle
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

// La función para obtener artículos por categoría ahora se encuentra en el archivo
// /api/content/articles/category/[categoryId].js
