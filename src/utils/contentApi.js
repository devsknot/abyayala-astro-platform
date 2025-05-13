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
  try {
    console.log(`Obteniendo artículos para la categoría: "${category}" (Origin: ${origin || 'N/A'})`);
    
    // Usar el método que sabemos que funciona: obtener todos los artículos y filtrar
    console.log(`Usando método de filtrado para obtener artículos de la categoría "${category}"...`);
    
    const allArticles = await getAllArticles(origin);
    console.log(`Obtenidos ${allArticles.length} artículos en total, filtrando por categoría "${category}"...`);
    
    const filteredArticles = allArticles.filter(article => article.category === category);
    console.log(`Recuperados ${filteredArticles.length} artículos para la categoría "${category}" mediante filtrado`);
    
    // Mostrar información sobre los artículos encontrados (para depuración)
    if (filteredArticles.length > 0) {
      console.log(`Primer artículo encontrado: ${filteredArticles[0].title} (Categoría: ${filteredArticles[0].category})`);
    } else {
      console.log(`No se encontraron artículos para la categoría "${category}"`);
    }
    
    return filteredArticles;
  } catch (error) {
    console.error(`Error al obtener artículos por categoría: ${error.message}`);
    return [];
  }
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
    
    // Normalizar la categoría para la comparación
    const normalizedCategory = String(category).trim().toLowerCase();
    
    // Filtrar los artículos por la categoría especificada
    const filteredArticles = allArticles.filter(article => {
      if (!article.category) return false;
      const articleCategory = String(article.category).trim().toLowerCase();
      return articleCategory === normalizedCategory;
    });
    
    console.log(`[RESPALDO] Artículos filtrados para la categoría "${category}": ${filteredArticles.length}`);
    
    if (filteredArticles.length === 0) {
      // Mostrar todas las categorías disponibles en los artículos para ayudar a depurar
      const availableCategories = [...new Set(allArticles.map(a => a.category).filter(Boolean))];
      console.log(`[RESPALDO] Categorías disponibles en los artículos: ${JSON.stringify(availableCategories)}`);
    }
    
    return filteredArticles;
  } catch (error) {
    console.error(`[RESPALDO] Error al filtrar artículos por categoría:`, error);
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
