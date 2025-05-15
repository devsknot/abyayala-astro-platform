import type { APIContext } from "astro";

// Common headers for CORS and JSON
const commonHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust in production
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

// Helper para transformar artículo de la DB al formato del frontend
function formatArticleData(article: any) {
  if (!article) return null;
  
  // Procesamiento seguro de tags
  let parsedTags = [];
  if (article.tags) {
    try {
      parsedTags = typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags;
    } catch (e) {
      console.error(`Error parsing tags for article ${article.slug}:`, e);
    }
  }
  
  // Normalizar campos para compatibilidad
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    description: article.description || '',
    content: article.content || '',
    category: article.category || '',
    pubDate: article.pubDate || article.pub_date || article.date || null,
    featured_image: article.featured_image || article.image || '',
    tags: parsedTags,
    author: article.author || ''
  };
}

// Definir una interfaz básica para los artículos
interface Article {
  id: string;
  title: string;
  slug: string;
  description: string;
  content?: string;
  category: string;
  pubDate?: string;
  date?: string;
  pub_date?: string;
  featured_image?: string;
  image?: string;
  tags?: string | string[];
  author?: string;
}

// No prerender este endpoint para permitir búsquedas dinámicas
export const prerender = false;

// Manejar solicitudes GET para búsquedas de artículos
export async function GET(context: APIContext) {
  console.log(`[articles/search.ts] GET invoked.`);
  const url = new URL(context.request.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category') || '';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page') || '1') : 1;
  const pageSize = url.searchParams.get('pageSize') ? parseInt(url.searchParams.get('pageSize') || '10') : 10;

  // Obtener la conexión a la base de datos desde el entorno
  const db = context.locals.runtime.env.DB;
  let articles = [];
  let totalItems = 0;
  
  try {
    // Construir el query SQL con los filtros aplicados
    let sqlQuery = "SELECT * FROM articles WHERE 1=1";
    const params: any[] = [];
    
    if (query) {
      sqlQuery += " AND (title LIKE ? OR description LIKE ? OR content LIKE ?)";
      const likeParam = `%${query}%`;
      params.push(likeParam, likeParam, likeParam);
    }
    
    if (category) {
      sqlQuery += " AND category = ?";
      params.push(category);
    }
    
    if (dateFrom) {
      sqlQuery += " AND (pubDate >= ? OR date >= ? OR pub_date >= ?)";
      params.push(dateFrom, dateFrom, dateFrom);
    }
    
    if (dateTo) {
      sqlQuery += " AND (pubDate <= ? OR date <= ? OR pub_date <= ?)";
      params.push(dateTo, dateTo, dateTo);
    }
    
    // Primero, ejecutar la consulta para contar el total de resultados
    try {
      const countQuery = sqlQuery.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = await db.prepare(countQuery).bind(...params).first();
      totalItems = countResult?.count || 0;
      
      if (totalItems > 0) {
        // Si hay resultados, ejecutar la consulta principal con paginación
        
        // Agregar ordenación y paginación al query
        sqlQuery += ` ORDER BY pubDate DESC, date DESC, pub_date DESC LIMIT ? OFFSET ?`;
        params.push(pageSize, (page - 1) * pageSize);
        
        const result = await db.prepare(sqlQuery).bind(...params).all();
        articles = result.results?.map(formatArticleData) || [];
      }
    } catch (dbError) {
      console.error('Error al ejecutar consulta en la base de datos:', dbError);
      
      // Intento alternativo: usar todos los artículos y filtrar manualmente
      try {
        const allArticles = await db.prepare("SELECT * FROM articles").all();
        const filteredArticles = allArticles.results?.filter((article: Article) => {
          let matchesQuery = true;
          
          if (query) {
            const searchRegex = new RegExp(query, 'i');
            matchesQuery = searchRegex.test(article.title || '') || 
                          searchRegex.test(article.description || '') || 
                          searchRegex.test(article.content || '');
          }
          
          let matchesCategory = true;
          if (category) {
            matchesCategory = article.category === category;
          }
          
          let matchesDateFrom = true;
          if (dateFrom) {
            // Asegurarnos de que tengamos una fecha válida
            const articleDate = new Date(article.pubDate || article.date || article.pub_date || new Date());
            const fromDate = new Date(dateFrom);
            matchesDateFrom = articleDate >= fromDate;
          }
          
          let matchesDateTo = true;
          if (dateTo) {
            // Asegurarnos de que tengamos una fecha válida
            const articleDate = new Date(article.pubDate || article.date || article.pub_date || new Date());
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            matchesDateTo = articleDate <= toDate;
          }
          
          return matchesQuery && matchesCategory && matchesDateFrom && matchesDateTo;
        }) || [];
        
        totalItems = filteredArticles.length;
        
        // Aplicar paginación manualmente
        articles = filteredArticles
          .sort((a: Article, b: Article) => {
            // Usar fallbacks para asegurar que siempre tengamos una fecha válida
            const dateA = new Date(a.pubDate || a.date || a.pub_date || new Date(0));
            const dateB = new Date(b.pubDate || b.date || b.pub_date || new Date(0));
            return dateB.getTime() - dateA.getTime();
          })
          .slice((page - 1) * pageSize, page * pageSize)
          .map(formatArticleData);
      } catch (fallbackError) {
        console.error('Error en el método de respaldo para la búsqueda:', fallbackError);
      }
    }
    
    // Preparar datos para la respuesta con paginación
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Construir respuesta con formato consistente
    const responseData = {
      success: true,
      articles: articles,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
    
    // Devolver la respuesta exitosa con headers estándar
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: commonHeaders
    });
  } catch (error: any) {
    console.error('Error en API de búsqueda de artículos:', error);
    
    // Crear respuesta de error
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Error desconocido',
      articles: [],
      pagination: {
        page, 
        pageSize,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
