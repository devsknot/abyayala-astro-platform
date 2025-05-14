/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API - ya no se usa, el origin se pasará como parámetro
// const API_BASE_URL = ''; 
// console.log('API_BASE_URL configurada con ruta relativa para compatibilidad con SSR');

/**
 * Obtiene todos los artículos
 * @param {string} [origin=''] - El origen de la URL para llamadas SSR.
 * @returns {Promise<Array>} Lista de artículos
 */
export async function getAllArticles(origin = '') {
  const path = '/api/content/articles';
  const fetchUrl = origin ? `${origin}${path}` : path;
  try {
    console.log(`Obteniendo todos los artículos desde: ${fetchUrl}`);
    
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
    let articles;
    try {
      articles = JSON.parse(responseText);
      console.log(`Artículos obtenidos: ${articles.length}`);
    } catch (parseError) {
      console.error('Error al parsear JSON de artículos:', parseError);
      console.log('Texto de respuesta:', responseText.substring(0, 200) + '...');
      return [];
    }
    
    return articles;
  } catch (error) {
    console.error('Error al obtener artículos:', error);
    return [];
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
    return await response.json();
  } catch (error) {
    console.error(`Error al obtener artículo ${slug}:`, error);
    return null;
  }
}

/**
 * Obtiene artículos filtrados por categoría
 * @param {string} category - Categoría para filtrar (id de la categoría)
 * @param {string} [origin=''] - El origen de la URL para llamadas SSR.
 * @returns {Promise<Array>} Lista de artículos filtrados
 */
export async function getArticlesByCategory(category, origin = '') {
  console.log(`Obteniendo artículos para la categoría: "${category}" (Origin: ${origin || 'N/A'})`);
  console.log('Usando método de filtrado en el cliente');
  
  // Siempre usar el método de filtrado en el cliente
  return getArticlesByCategoryFallback(category, origin);
}

/**
 * Método de respaldo para obtener artículos por categoría cuando el endpoint dedicado falla
 * @param {string} category - Categoría para filtrar
 * @param {string} [origin=''] - El origen de la URL
 * @returns {Promise<Array>} Lista de artículos filtrados
 */
async function getArticlesByCategoryFallback(category, origin = '') {
  try {
    console.log(`[RESPALDO] Obteniendo todos los artículos para filtrar por categoría "${category}"...`);
    
    // Obtener todos los artículos
    const allArticles = await getAllArticles(origin);
    console.log(`[RESPALDO] Total de artículos obtenidos: ${allArticles.length}`);
    
    // Imprimir los primeros 3 artículos para depuración
    if (allArticles.length > 0) {
      console.log('[RESPALDO] Muestra de los primeros 3 artículos:');
      for (let i = 0; i < Math.min(3, allArticles.length); i++) {
        const article = allArticles[i];
        console.log(`[RESPALDO] Artículo ${i+1}:`, {
          title: article.title,
          category: article.category,
          categoryType: typeof article.category,
          keys: Object.keys(article)
        });
      }
    }
    
    // Normalizar la categoría para la comparación
    const normalizedCategory = String(category).trim().toLowerCase();
    console.log(`[RESPALDO] Categoría normalizada para búsqueda: "${normalizedCategory}"`);
    
    // Filtrar artículos por la categoría solicitada
    const filteredArticles = allArticles.filter(article => {
      // Verificar si el artículo tiene categoría
      if (!article.category && !article.categories) {
        return false;
      }
      
      // Verificar en el campo category (principal)
      if (article.category) {
        const articleCategory = String(article.category).trim().toLowerCase();
        const matches = articleCategory === normalizedCategory;
        
        if (matches) {
          console.log(`[RESPALDO] Coincidencia encontrada en campo 'category': Artículo "${article.title}" con categoría "${article.category}"`);
          return true;
        }
      }
      
      // Como respaldo, verificar también en el campo categories si existe
      if (article.categories) {
        // Si es un array
        if (Array.isArray(article.categories) && article.categories.length > 0) {
          const found = article.categories.some(cat => {
            if (!cat) return false;
            return String(cat).trim().toLowerCase() === normalizedCategory;
          });
          
          if (found) {
            console.log(`[RESPALDO] Coincidencia encontrada en campo 'categories': Artículo "${article.title}"`);
            return true;
          }
        }
        // Si es un string
        else if (typeof article.categories === 'string' && article.categories) {
          const catValue = String(article.categories).trim().toLowerCase();
          if (catValue === normalizedCategory) {
            console.log(`[RESPALDO] Coincidencia encontrada en campo 'categories' (string): Artículo "${article.title}"`);
            return true;
          }
        }
      }
      
      return false;
    });
    
    console.log(`[RESPALDO] Artículos filtrados para la categoría "${category}": ${filteredArticles.length}`);
    
    // Mostrar los títulos de los artículos encontrados para depuración
    if (filteredArticles.length > 0) {
      console.log('[RESPALDO] Artículos encontrados:');
      filteredArticles.forEach((article, index) => {
        console.log(`[RESPALDO] ${index + 1}. ${article.title} (categoría: ${article.category})`);
      });
    } else {
      console.log('[RESPALDO] No se encontraron artículos para esta categoría');
    }
    
    return filteredArticles;
  } catch (error) {
    console.error(`Error al obtener artículos por categoría (fallback): ${error.message}`);
    return [];
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
      console.log('getAllCategories - Datos de categorías obtenidos:', data.length || 'No es un array');
      return data;
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
