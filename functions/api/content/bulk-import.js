// API para importación masiva de artículos
import { corsHeaders } from '../../utils/cors.js';

export async function onRequest(context) {
  // Manejar solicitudes OPTIONS para CORS
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Verificar autenticación directamente aquí, similar a articles.js
  const authenticated = await verifyAuthentication(context.request, context.env);
  
  if (!authenticated) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  // Solo permitir POST para importación
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    // Obtener datos del cuerpo de la solicitud
    const requestData = await context.request.json();
    
    // Validar estructura de datos
    if (!requestData.articles || !Array.isArray(requestData.articles) || requestData.articles.length === 0) {
      return new Response(JSON.stringify({ error: 'Formato de datos inválido' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Procesar artículos
    const results = await processArticles(context.env.DB, requestData.articles);

    return new Response(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error en importación masiva:', error);
    
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

// Verificar autenticación (misma lógica que en articles.js)
async function verifyAuthentication(request, env) {
  // En un entorno de desarrollo, permitir acceso sin autenticación
  if (env.ENVIRONMENT === 'development') {
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
  
  // Registrar información de depuración
  console.log('Headers de autenticación recibidos:', {
    'CF-Access-Client-Id': clientId ? 'presente' : 'ausente',
    'CF-Access-Jwt-Assertion': jwt ? 'presente' : 'ausente',
    'Authorization': authHeader ? 'presente' : 'ausente'
  });
  
  return !!jwt; // Verificar que existe el token JWT
}

// Función para procesar los artículos
async function processArticles(db, articles) {
  const results = {
    total: articles.length,
    success: [],
    errors: [],
    authors: {
      created: [],
      linked: []
    }
  };

  for (const article of articles) {
    try {
      // Validar datos mínimos requeridos
      if (!article.title) {
        results.errors.push({
          title: article.title || 'Artículo sin título',
          error: 'El título es obligatorio'
        });
        continue;
      }

      // Generar slug si no existe
      if (!article.slug) {
        article.slug = generateSlug(article.title);
      }

      // Verificar si ya existe un artículo con el mismo slug
      const existingArticle = await db
        .prepare('SELECT slug FROM articles WHERE slug = ?')
        .bind(article.slug)
        .first();

      if (existingArticle) {
        results.errors.push({
          title: article.title,
          error: `Ya existe un artículo con el slug "${article.slug}"`
        });
        continue;
      }

      // Preparar fecha de publicación
      const pubDate = article.pubDate ? new Date(article.pubDate) : new Date();
      
      // Procesar autor
      let authorId = null;
      
      if (article.author) {
        // Buscar si el autor ya existe (por nombre o slug)
        let authorSlug = generateSlug(article.author);
        
        const existingAuthor = await db
          .prepare('SELECT id FROM authors WHERE slug = ? OR name = ?')
          .bind(authorSlug, article.author)
          .first();
        
        if (existingAuthor) {
          // Usar el autor existente
          authorId = existingAuthor.id;
          results.authors.linked.push({
            name: article.author,
            slug: authorSlug
          });
        } else {
          // Crear nuevo autor
          const authorResult = await db
            .prepare(`
              INSERT INTO authors (slug, name, bio)
              VALUES (?, ?, ?)
            `)
            .bind(
              authorSlug,
              article.author,
              article.authorBio || `Autor de "${article.title}"`
            )
            .run();
          
          if (authorResult.success) {
            // Obtener el ID del autor recién creado
            authorId = authorResult.lastInsertRowid;
            results.authors.created.push({
              name: article.author,
              slug: authorSlug
            });
          }
        }
      }
      
      // Insertar artículo en la base de datos
      await db
        .prepare(`
          INSERT INTO articles (
            slug, title, description, content, pub_date, 
            category, featured_image, tags, author_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          article.slug,
          article.title,
          article.description || '',
          article.content,
          pubDate.toISOString(),
          article.category,
          article.featured_image || null,
          JSON.stringify(article.tags || []),
          authorId
        )
        .run();

      results.success.push({
        title: article.title,
        slug: article.slug,
        authorId: authorId
      });
    } catch (error) {
      console.error(`Error al procesar artículo "${article.title}":`, error);
      
      results.errors.push({
        title: article.title || 'Artículo desconocido',
        error: error.message || 'Error desconocido'
      });
    }
  }

  return results;
}

// Función para generar slug a partir del título
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Eliminar guiones duplicados
    .trim();
}
