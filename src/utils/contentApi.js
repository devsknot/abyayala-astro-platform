/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API - ya no se usa, el origin se pasará como parámetro
// const API_BASE_URL = ''; 
// console.log('API_BASE_URL configurada con ruta relativa para compatibilidad con SSR');

/**
 * Obtiene todos los artículos con soporte para paginación
 * @param {string} [origin=''] - El origen de la URL para llamadas SSR.
 * @param {number} [page=1] - Número de página a recuperar.
 * @param {number} [pageSize=10] - Número de artículos por página.
 * @returns {Promise<Object>} Objeto con artículos y datos de paginación
 */
export async function getAllArticles(origin = '', page = 1, pageSize = 10) {
  // Construir URL con parámetros de paginación
  const path = `/api/content/articles?page=${page}&pageSize=${pageSize}`;
  const fetchUrl = origin ? `${origin}${path}` : path;
  
  try {
    console.log(`Obteniendo artículos (página ${page}, tamaño ${pageSize}) desde: ${fetchUrl}`);
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('Respuesta de la API de artículos:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Error al obtener artículos: ${response.status}`);
    }
    
    // Obtener el texto de la respuesta para depuración
    const responseText = await response.text();
    
    // Intentar parsear el texto como JSON
    let data;
    try {
      data = JSON.parse(responseText);
      
      // Formato nuevo con paginación
      if (data && data.success === true && Array.isArray(data.articles)) {
        console.log(`Artículos obtenidos: ${data.articles.length}, página ${data.pagination?.page || 1} de ${data.pagination?.totalPages || 1}`);
        
        // Devolver tanto los artículos como la información de paginación
        return {
          articles: data.articles,
          pagination: data.pagination || {
            page: 1,
            pageSize,
            totalItems: data.articles.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        };
      }
      
      // Formato antiguo: directamente un array (sin paginación)
      if (Array.isArray(data)) {
        console.log(`Artículos obtenidos (formato antiguo sin paginación): ${data.length}`);
        // Crear estructura compatible con el nuevo formato
        return {
          articles: data,
          pagination: {
            page: 1,
            pageSize: data.length,
            totalItems: data.length,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false
          }
        };
      }
      
      console.error('Formato de respuesta inesperado:', data);
      // Devolver estructura vacía pero consistente
      return {
        articles: [],
        pagination: {
          page: 1,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
      
    } catch (jsonError) {
      console.error('Error al parsear la respuesta JSON:', jsonError);
      console.log('Respuesta no válida:', responseText);
      // Devolver estructura vacía pero consistente
      return {
        articles: [],
        pagination: {
          page: 1,
          pageSize,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    }
    
  } catch (error) {
    console.error('Error en getAllArticles:', error);
    // En caso de error, devolver objeto vacío pero con estructura consistente
    return {
      articles: [],
      pagination: {
        page: 1,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

/**
 * Obtiene un artículo específico por su slug
 * @param {string} slug - Slug del artículo
 * @param {string} [origin=''] - El origen de la URL para llamadas SSR.
 * @returns {Promise<Object|null>} Artículo o null si no se encuentra
 */
export async function getArticleBySlug(slug, origin = '') {
  const path = `/api/content/articles/${slug}`;
  const fetchUrl = origin ? `${origin}${path}` : path;
  try {
    console.log(`Obteniendo artículo ${slug} desde: ${fetchUrl}`);
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error al obtener artículo: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Verificar el formato de respuesta (nuevo formato con success y article)
    if (data && data.success === true && data.article) {
      console.log(`Artículo obtenido (nuevo formato): ${data.article.title || slug}`);
      return data.article;
    }
    
    // Formato antiguo: directamente el objeto artículo
    if (data && data.title) {
      console.log(`Artículo obtenido (formato antiguo): ${data.title}`);
      return data;
    }
    
    console.warn('Formato de respuesta inesperado:', data);
    return null;
  } catch (error) {
    console.error(`Error al obtener artículo ${slug}:`, error);
    return null;
  }
}

/**
 * Obtiene artículos filtrados por categoría con soporte para paginación
 * @param {string} category - Categoría para filtrar (id de la categoría)
 * @param {string} [origin=''] - El origen de la URL para llamadas SSR.
 * @param {number} [page=1] - Número de página a recuperar.
 * @param {number} [pageSize=10] - Número de artículos por página.
 * @returns {Promise<Object>} Objeto con artículos y datos de paginación
 */
export async function getArticlesByCategory(category, origin = '', page = 1, pageSize = 10) {
  console.log(`Obteniendo artículos para la categoría: "${category}" (Origin: ${origin || 'N/A'}, Página: ${page}, Tamaño: ${pageSize})`);
  console.log('Usando método de filtrado en el cliente con paginación');
  
  // Siempre usar el método de filtrado en el cliente con parámetros de paginación
  return getArticlesByCategoryFallback(category, origin, page, pageSize);
}

/**
 * Método de respaldo para obtener artículos por categoría con soporte para paginación
 * @param {string} category - Categoría para filtrar
 * @param {string} [origin=''] - El origen de la URL
 * @param {number} [page=1] - Número de página a recuperar.
 * @param {number} [pageSize=10] - Número de artículos por página.
 * @returns {Promise<Object>} Objeto con artículos y datos de paginación
 */
async function getArticlesByCategoryFallback(category, origin = '', page = 1, pageSize = 10) {
  try {
    console.log(`[RESPALDO] Obteniendo todos los artículos para filtrar por categoría "${category}"...`);
    
    // Obtener todos los artículos (sin paginación para hacer el filtrado del lado del cliente)
    const response = await getAllArticles(origin);
    const allArticles = response.articles || [];
    
    console.log(`[RESPALDO] Total de artículos obtenidos: ${allArticles.length}`);
    
    // Convertir la categoría a minúsculas y recortar espacios para comparación
    const normCategory = String(category).trim().toLowerCase();
    console.log(`[RESPALDO] Buscando artículos con categoría normalizada: "${normCategory}"`);
    
    // Filtrar artículos por categoría (normalizada para comparación)
    const filteredArticles = allArticles.filter(article => {
      // Verificar en el campo category (principal)
      const articleCategory = String(article.category || '').trim().toLowerCase();
      if (articleCategory === normCategory) {
        return true;
      }
      
      // Como respaldo, verificar también en el campo categories si existe
      if (article.categories) {
        // Si es un array, verificar si alguna categoría coincide
        if (Array.isArray(article.categories)) {
          return article.categories.some(cat => 
            String(cat).trim().toLowerCase() === normCategory
          );
        }
        // Si es un string, verificar si coincide
        if (typeof article.categories === 'string') {
          return String(article.categories).trim().toLowerCase() === normCategory;
        }
      }
      
      return false;
    });
    
    console.log(`[RESPALDO] Artículos filtrados por categoría "${category}": ${filteredArticles.length}`);
    
    // Aplicar paginación manualmente
    const validPage = page > 0 ? page : 1;
    const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 10;
    const startIndex = (validPage - 1) * validPageSize;
    const endIndex = startIndex + validPageSize;
    
    // Obtener los artículos para la página actual
    const paginatedArticles = filteredArticles.slice(startIndex, endIndex);
    
    // Calcular la información de paginación
    const totalItems = filteredArticles.length;
    const totalPages = Math.ceil(totalItems / validPageSize);
    
    console.log(`[RESPALDO] Artículos paginados: ${paginatedArticles.length} (página ${validPage} de ${totalPages})`);
    
    // Devolver formato consistente con getAllArticles
    return {
      articles: paginatedArticles,
      pagination: {
        page: validPage,
        pageSize: validPageSize,
        totalItems,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPrevPage: validPage > 1
      }
    };
    
  } catch (error) {
    console.error(`[RESPALDO] Error al obtener artículos por categoría:`, error);
    // En caso de error, devolver objeto vacío pero con estructura consistente
    return {
      articles: [],
      pagination: {
        page,
        pageSize,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      }
    };
  }
}

/**
 * Obtiene todas las categorías
 * @param {string} [origin=''] - El origen de la URL para llamadas SSR.
 * @returns {Promise<Array>} Lista de categorías
 */
export async function getAllCategories(origin = '') {
  const path = `/api/content/categories`;
  const fetchUrl = origin ? `${origin}${path}` : path;
  try {
    // Usar el mismo enfoque que el CMS para obtener categorías
    console.log(`getAllCategories - Intentando obtener categorías desde: ${fetchUrl}`);
    
    // Usar los mismos headers que el CMS
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    console.log('getAllCategories - Respuesta de la API:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Error al obtener categorías: ${response.status}`);
    }
    
    // Intentar parsear la respuesta como JSON
    try {
      const data = await response.json();
      
      // Verificar formato nuevo (con success y categories)
      if (data && data.success === true && Array.isArray(data.categories)) {
        console.log(`getAllCategories - Categorías obtenidas (nuevo formato): ${data.categories.length}`);
        return data.categories;
      }
      
      // Verificar formato antiguo (array directo)
      if (Array.isArray(data)) {
        console.log(`getAllCategories - Categorías obtenidas (formato antiguo): ${data.length}`);
        return data;
      }
      
      console.warn('getAllCategories - Formato de respuesta inesperado:', data);
      return [];
      
    } catch (parseError) {
      console.error('getAllCategories - Error al parsear JSON de categorías:', parseError);
      
      // Intentar obtener el texto de la respuesta para diagnóstico
      const text = await response.text();
      console.error('getAllCategories - Contenido de la respuesta:', text.substring(0, 200) + '...');
      
      throw new Error(`Error al parsear datos de categorías: ${parseError.message}`);
    }
  } catch (error) {
    console.error('getAllCategories - Error general:', error);
    
    // En caso de error, devolver un array vacío en lugar de datos hardcodeados
    return [];
  }
}
