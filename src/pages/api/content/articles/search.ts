import type { APIContext } from "astro";
// Utilizamos solo la base de datos D1 en Cloudflare
import { db as sqliteDb } from "../../../../utils/db";
import { getUserInfo } from "../../../../utils/auth";
import { formatArticleData } from "../../../../utils/content";

// Definir una interfaz básica para los artículos
interface Article {
  id?: number;
  slug?: string;
  title: string;
  description?: string;
  content?: string;
  category?: string;
  pubDate?: string | Date;
  date?: string | Date;
  pub_date?: string | Date;
  featured_image?: string;
  image?: string;
  [key: string]: any; // Para campos adicionales
}

// Configuración para SSR
export const prerender = false;

// Manejar solicitudes GET para búsquedas de artículos
export async function GET({ request }: APIContext) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const category = url.searchParams.get('category') || '';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1;
  const pageSize = url.searchParams.get('pageSize') ? parseInt(url.searchParams.get('pageSize')!) : 10;

  // Determinar qué base de datos usar
  let articles = [];
  let totalItems = 0;
  let headers = new Headers();
  
  try {
    // Intentar obtener el usuario para verificar autenticación (opcional)
    const userInfo = await getUserInfo(request.headers);

    // Se asume que estamos usando SQLite - ajusta según tu base de datos real
    if (sqliteDb) {
      // Construir la consulta base
      let sqlQuery = `SELECT * FROM articles WHERE 1=1`;
      let params: any[] = [];
      
      // Añadir condiciones de filtrado
      if (query) {
        sqlQuery += ` AND (title LIKE ? OR description LIKE ? OR content LIKE ?)`;
        const queryPattern = `%${query}%`;
        params.push(queryPattern, queryPattern, queryPattern);
      }
      
      if (category) {
        sqlQuery += ` AND category = ?`;
        params.push(category);
      }
      
      if (dateFrom) {
        sqlQuery += ` AND (pubDate >= ? OR date >= ? OR pub_date >= ?)`;
        params.push(dateFrom, dateFrom, dateFrom);
      }
      
      if (dateTo) {
        // Ajustar la fecha final para incluir todo el día
        const adjustedDateTo = new Date(dateTo);
        adjustedDateTo.setHours(23, 59, 59, 999);
        const adjustedDateToStr = adjustedDateTo.toISOString();
        
        sqlQuery += ` AND (pubDate <= ? OR date <= ? OR pub_date <= ?)`;
        params.push(adjustedDateToStr, adjustedDateToStr, adjustedDateToStr);
      }
      
      // Contar total de resultados para paginación
      const countQuery = sqlQuery.replace('SELECT *', 'SELECT COUNT(*) as count');
      
      try {
        const countResult = await sqliteDb.prepare(countQuery).bind(...params).all();
        totalItems = countResult.length > 0 ? countResult[0].count : 0;
        
        // Agregar ordenación y paginación al query
        sqlQuery += ` ORDER BY pubDate DESC, date DESC, pub_date DESC LIMIT ? OFFSET ?`;
        params.push(pageSize, (page - 1) * pageSize);
        
        const result = await sqliteDb.prepare(sqlQuery).bind(...params).all();
        articles = result.map(formatArticleData);
      } catch (dbError) {
        console.error('Error al ejecutar consulta en la base de datos:', dbError);
        // Intento alternativo: usar todos los artículos y filtrar manualmente
        const allArticles = await sqliteDb.prepare("SELECT * FROM articles").all();
        const filteredArticles = allArticles.filter((article: Article) => {
          let matchesQuery = true;
          
          if (query) {
            const searchRegex = new RegExp(query, 'i');
            matchesQuery = searchRegex.test(article.title) || 
                          searchRegex.test(article.description) || 
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
        });
        
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
      }
    } else {
      // Fallback si no hay base de datos
      return new Response(
        JSON.stringify({
          error: "No database connection available"
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store, max-age=0"
          }
        }
      );
    }
    
    // Calcular datos de paginación
    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Configurar headers para prevenir caché
    headers.append("Content-Type", "application/json");
    headers.append("Cache-Control", "no-store, max-age=0");
    
    // Responder con los resultados y metadatos de paginación
    return new Response(JSON.stringify({
      articles,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    }), {
      headers
    });
  } catch (error) {
    console.error("Error en el endpoint de búsqueda:", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  }
}
