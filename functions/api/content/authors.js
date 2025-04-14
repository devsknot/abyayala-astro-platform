// API para gestionar autores
import { corsHeaders } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Manejar solicitudes OPTIONS para CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Verificar autenticación
  const authenticated = await verifyAuthentication(request, env);
  
  // Para solicitudes GET, permitir acceso sin autenticación
  if (!authenticated && request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    console.log(`Solicitud recibida: ${request.method} ${path}`);
    
    // Ruta raíz /api/content/authors
    if (path === '/api/content/authors' || path === '/api/content/authors/') {
      if (request.method === 'GET') {
        return handleGetAuthors(env, corsHeaders);
      } else if (request.method === 'POST' && authenticated) {
        return handleCreateAuthor(await request.json(), env, corsHeaders);
      }
    }
    
    // Ruta para autor específico /api/content/authors/{slug}
    const match = path.match(/^\/api\/content\/authors\/([^\/]+)$/);
    if (match) {
      const slug = match[1];
      console.log(`Solicitud para autor específico: ${slug}`);
      
      if (request.method === 'GET') {
        return handleGetAuthor(slug, env, corsHeaders);
      } else if (request.method === 'PUT' && authenticated) {
        return handleUpdateAuthor(slug, await request.json(), env, corsHeaders);
      } else if (request.method === 'DELETE' && authenticated) {
        return handleDeleteAuthor(slug, env, corsHeaders);
      }
    }
    
    // Si llegamos aquí, la ruta no coincide con ninguna de las esperadas
    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error en API de autores:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Error al procesar la solicitud',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Verificar autenticación (misma lógica que en articles.js y bulk-import.js)
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
  
  // Verificar token de autorización Bearer
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }
  
  return !!jwt; // Verificar que existe el token JWT
}

// Obtener todos los autores
async function handleGetAuthors(env, headers) {
  try {
    const authors = await env.DB.prepare(`
      SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
      FROM authors
      ORDER BY name ASC
    `).all();
    
    return new Response(JSON.stringify(authors.results), {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  } catch (error) {
    console.error('Error al obtener autores:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}

// Obtener un autor específico
async function handleGetAuthor(slug, env, headers) {
  try {
    const author = await env.DB.prepare(`
      SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
      FROM authors
      WHERE slug = ?
    `).bind(slug).first();
    
    if (!author) {
      return new Response(JSON.stringify({ error: 'Autor no encontrado' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Obtener artículos del autor
    const articles = await env.DB.prepare(`
      SELECT slug, title, description, pub_date as pubDate, category, featured_image
      FROM articles
      WHERE author_id = ?
      ORDER BY pub_date DESC
    `).bind(author.id).all();
    
    // Incluir artículos en la respuesta
    const response = {
      ...author,
      articles: articles.results
    };
    
    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  } catch (error) {
    console.error(`Error al obtener autor ${slug}:`, error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}

// Crear un nuevo autor
async function handleCreateAuthor(authorData, env, headers) {
  try {
    // Validar datos
    if (!authorData.name || !authorData.slug) {
      return new Response(JSON.stringify({ error: 'Nombre y slug son obligatorios' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Verificar que el slug no exista
    const existingAuthor = await env.DB.prepare(`
      SELECT slug FROM authors WHERE slug = ?
    `).bind(authorData.slug).first();
    
    if (existingAuthor) {
      return new Response(JSON.stringify({ error: 'Ya existe un autor con ese slug' }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Insertar el autor en D1
    const result = await env.DB.prepare(`
      INSERT INTO authors (
        slug, name, bio, email, avatar, social_media
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      authorData.slug,
      authorData.name,
      authorData.bio || '',
      authorData.email || '',
      authorData.avatar || '',
      authorData.social_media || ''
    ).run();
    
    if (result.success) {
      // Obtener el autor recién creado
      const newAuthor = await env.DB.prepare(`
        SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
        FROM authors
        WHERE slug = ?
      `).bind(authorData.slug).first();
      
      return new Response(JSON.stringify(newAuthor), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    } else {
      throw new Error('Error al crear el autor');
    }
  } catch (error) {
    console.error('Error al crear autor:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}

// Actualizar un autor existente
async function handleUpdateAuthor(slug, authorData, env, headers) {
  try {
    // Verificar que el autor exista
    const existingAuthor = await env.DB.prepare(`
      SELECT id FROM authors WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingAuthor) {
      return new Response(JSON.stringify({ error: 'Autor no encontrado' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Si se está cambiando el slug, verificar que el nuevo no exista
    if (authorData.slug && authorData.slug !== slug) {
      const slugExists = await env.DB.prepare(`
        SELECT slug FROM authors WHERE slug = ? AND id != ?
      `).bind(authorData.slug, existingAuthor.id).first();
      
      if (slugExists) {
        return new Response(JSON.stringify({ error: 'Ya existe un autor con ese slug' }), {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        });
      }
    }
    
    // Actualizar el autor
    const result = await env.DB.prepare(`
      UPDATE authors
      SET 
        slug = ?,
        name = ?,
        bio = ?,
        email = ?,
        avatar = ?,
        social_media = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      authorData.slug || slug,
      authorData.name || '',
      authorData.bio || '',
      authorData.email || '',
      authorData.avatar || '',
      authorData.social_media || '',
      existingAuthor.id
    ).run();
    
    if (result.success) {
      // Obtener el autor actualizado
      const updatedAuthor = await env.DB.prepare(`
        SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
        FROM authors
        WHERE id = ?
      `).bind(existingAuthor.id).first();
      
      return new Response(JSON.stringify(updatedAuthor), {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    } else {
      throw new Error('Error al actualizar el autor');
    }
  } catch (error) {
    console.error(`Error al actualizar autor ${slug}:`, error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}

// Eliminar un autor
async function handleDeleteAuthor(slug, env, headers) {
  try {
    // Verificar que el autor exista
    const existingAuthor = await env.DB.prepare(`
      SELECT id FROM authors WHERE slug = ?
    `).bind(slug).first();
    
    if (!existingAuthor) {
      return new Response(JSON.stringify({ error: 'Autor no encontrado' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Verificar si hay artículos asociados a este autor
    const articlesCount = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM articles WHERE author_id = ?
    `).bind(existingAuthor.id).first();
    
    if (articlesCount && articlesCount.count > 0) {
      return new Response(JSON.stringify({ 
        error: 'No se puede eliminar el autor porque tiene artículos asociados',
        count: articlesCount.count
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Eliminar el autor
    const result = await env.DB.prepare(`
      DELETE FROM authors WHERE id = ?
    `).bind(existingAuthor.id).run();
    
    if (result.success) {
      return new Response(JSON.stringify({ 
        message: 'Autor eliminado correctamente',
        slug: slug
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    } else {
      throw new Error('Error al eliminar el autor');
    }
  } catch (error) {
    console.error(`Error al eliminar autor ${slug}:`, error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}
