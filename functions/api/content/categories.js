// Función para gestionar categorías a través de Cloudflare Functions
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
  
  try {
    console.log(`Solicitud recibida: ${request.method} ${path}`);
    
    // Extraer el slug de la categoría si está presente en la URL
    // Formato esperado: /api/content/categories/{slug}
    const slug = path.split('/').pop();
    const isSpecificCategory = path !== '/api/content/categories' && slug !== 'categories';
    
    if (request.method === 'GET') {
      if (isSpecificCategory) {
        return handleGetCategory(slug, env, headers);
      }
      return handleGetCategories(env, headers);
    }
    
    // Verificar autenticación para operaciones de escritura
    const authenticated = await verifyAuthentication(request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers
      });
    }
    
    if (request.method === 'POST') {
      return handleCreateCategory(await request.json(), env, headers);
    }
    
    if (isSpecificCategory && request.method === 'PUT') {
      return handleUpdateCategory(slug, await request.json(), env, headers);
    }
    
    if (isSpecificCategory && request.method === 'DELETE') {
      return handleDeleteCategory(slug, env, headers);
    }
    
    // Método no permitido
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers
    });
  } catch (error) {
    console.error('Error en la API de categorías:', error);
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

// Obtener todas las categorías
async function handleGetCategories(env, headers) {
  try {
    // Usar D1 para obtener las categorías
    const { results } = await env.DB.prepare(`
      SELECT * FROM categories 
      ORDER BY name ASC
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

// Crear una nueva categoría
async function handleCreateCategory(categoryData, env, headers) {
  try {
    // Validar datos
    if (!categoryData.slug || !categoryData.name) {
      return new Response(JSON.stringify({ error: 'Slug y nombre son obligatorios' }), {
        status: 400,
        headers
      });
    }
    
    // Verificar que el slug no exista
    const existingCategory = await env.DB.prepare(`
      SELECT slug FROM categories WHERE slug = ?
    `).bind(categoryData.slug).first();
    
    if (existingCategory) {
      return new Response(JSON.stringify({ error: 'Ya existe una categoría con ese slug' }), {
        status: 409,
        headers
      });
    }
    
    // Insertar la categoría en D1
    const result = await env.DB.prepare(`
      INSERT INTO categories (
        slug, name, description
      ) VALUES (?, ?, ?)
    `).bind(
      categoryData.slug,
      categoryData.name,
      categoryData.description || ''
    ).run();
    
    // Obtener la categoría recién creada
    const category = await env.DB.prepare(`
      SELECT * FROM categories WHERE slug = ?
    `).bind(categoryData.slug).first();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Categoría creada correctamente',
      category
    }), {
      status: 201,
      headers
    });
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Obtener una categoría específica por slug
async function handleGetCategory(slug, env, headers) {
  try {
    // Usar D1 para obtener la categoría
    const category = await env.DB.prepare(`
      SELECT * FROM categories 
      WHERE slug = ?
    `).bind(slug).first();
    
    if (!category) {
      return new Response(JSON.stringify({ error: 'Categoría no encontrada' }), {
        status: 404,
        headers
      });
    }
    
    return new Response(JSON.stringify(category), { headers });
  } catch (error) {
    console.error('Error al obtener categoría:', error);
    
    // Si hay un error con D1, usar datos de ejemplo como fallback
    if (env.ENVIRONMENT === 'development' || !env.DB) {
      const fallbackCategories = getFallbackCategories();
      const category = fallbackCategories.find(c => c.slug === slug);
      
      if (category) {
        return new Response(JSON.stringify(category), { headers });
      }
      
      return new Response(JSON.stringify({ error: 'Categoría no encontrada' }), {
        status: 404,
        headers
      });
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Actualizar una categoría existente
async function handleUpdateCategory(slug, categoryData, env, headers) {
  try {
    // Validar datos
    if (!categoryData.name) {
      return new Response(JSON.stringify({ error: 'El nombre es obligatorio' }), {
        status: 400,
        headers
      });
    }
    
    // Verificar que la categoría existe
    const existingCategory = await env.DB.prepare(`
      SELECT * FROM categories WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingCategory) {
      return new Response(JSON.stringify({ error: 'Categoría no encontrada' }), {
        status: 404,
        headers
      });
    }
    
    // Si se está cambiando el slug, verificar que el nuevo slug no exista
    if (categoryData.slug && categoryData.slug !== slug) {
      const slugExists = await env.DB.prepare(`
        SELECT slug FROM categories WHERE slug = ?
      `).bind(categoryData.slug).first();
      
      if (slugExists) {
        return new Response(JSON.stringify({ error: 'Ya existe una categoría con ese slug' }), {
          status: 409,
          headers
        });
      }
    }
    
    // Actualizar la categoría en D1
    const newSlug = categoryData.slug || slug;
    const result = await env.DB.prepare(`
      UPDATE categories 
      SET name = ?, description = ?, slug = ?
      WHERE slug = ?
    `).bind(
      categoryData.name,
      categoryData.description || existingCategory.description || '',
      newSlug,
      slug
    ).run();
    
    // Obtener la categoría actualizada
    const updatedCategory = await env.DB.prepare(`
      SELECT * FROM categories WHERE slug = ?
    `).bind(newSlug).first();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Categoría actualizada correctamente',
      category: updatedCategory
    }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Eliminar una categoría
async function handleDeleteCategory(slug, env, headers) {
  try {
    // Verificar que la categoría existe
    const existingCategory = await env.DB.prepare(`
      SELECT * FROM categories WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingCategory) {
      return new Response(JSON.stringify({ error: 'Categoría no encontrada' }), {
        status: 404,
        headers
      });
    }
    
    // Verificar si la categoría está en uso en algún artículo
    const articlesUsingCategory = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM articles WHERE category = ?
    `).bind(slug).first();
    
    if (articlesUsingCategory && articlesUsingCategory.count > 0) {
      return new Response(JSON.stringify({ 
        error: 'No se puede eliminar la categoría porque está siendo utilizada en artículos',
        articlesCount: articlesUsingCategory.count
      }), {
        status: 409,
        headers
      });
    }
    
    // Eliminar la categoría
    const result = await env.DB.prepare(`
      DELETE FROM categories WHERE slug = ?
    `).bind(slug).run();
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Categoría eliminada correctamente'
    }), {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers
    });
  }
}

// Datos de ejemplo para cuando la API no está disponible
function getFallbackCategories() {
  return [
    {
      slug: 'agricultura',
      name: 'Agricultura',
      description: 'Noticias sobre prácticas agrícolas, cultivos y producción'
    },
    {
      slug: 'comunidad',
      name: 'Comunidad',
      description: 'Información sobre actividades comunitarias y desarrollo local'
    },
    {
      slug: 'sostenibilidad',
      name: 'Sostenibilidad',
      description: 'Prácticas sostenibles y conservación del medio ambiente'
    },
    {
      slug: 'politica-agraria',
      name: 'Política Agraria',
      description: 'Análisis de políticas públicas relacionadas con el sector agrario'
    },
    {
      slug: 'tecnologia-rural',
      name: 'Tecnología Rural',
      description: 'Innovaciones tecnológicas aplicadas al entorno rural'
    },
    {
      slug: 'cultura',
      name: 'Cultura',
      description: 'Expresiones culturales y tradiciones del mundo rural'
    },
    {
      slug: 'eventos',
      name: 'Eventos',
      description: 'Ferias, encuentros y actividades organizadas por el colectivo'
    }
  ];
}
