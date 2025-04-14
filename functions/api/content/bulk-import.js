// API para importación masiva de artículos
import { getAuthStatus } from '../../../utils/auth.js';
import { corsHeaders } from '../../../utils/cors.js';

export async function onRequest(context) {
  // Manejar solicitudes OPTIONS para CORS
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Verificar autenticación
  const authStatus = await getAuthStatus(context);
  
  if (!authStatus.authenticated) {
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

// Función para procesar los artículos
async function processArticles(db, articles) {
  const results = {
    success: [],
    errors: []
  };

  // Procesar cada artículo
  for (const article of articles) {
    try {
      // Validar datos mínimos requeridos
      if (!article.title || !article.content || !article.category) {
        results.errors.push({
          title: article.title || 'Artículo sin título',
          error: 'Faltan campos obligatorios (título, contenido o categoría)'
        });
        continue;
      }

      // Generar slug si no existe
      if (!article.slug) {
        article.slug = generateSlug(article.title);
      }

      // Verificar si el artículo ya existe
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
      
      // Insertar artículo en la base de datos
      await db
        .prepare(`
          INSERT INTO articles (
            slug, title, description, content, pub_date, 
            category, featured_image, author, tags
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
          article.author || 'Admin',
          JSON.stringify(article.tags || [])
        )
        .run();

      results.success.push({
        title: article.title,
        slug: article.slug
      });
    } catch (error) {
      console.error(`Error al procesar artículo "${article.title}":`, error);
      
      results.errors.push({
        title: article.title || 'Artículo desconocido',
        error: error.message || 'Error desconocido'
      });
    }
  }

  return {
    total: articles.length,
    processed: results.success.length + results.errors.length,
    successful: results.success.length,
    failed: results.errors.length,
    successfulArticles: results.success,
    errors: results.errors
  };
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
