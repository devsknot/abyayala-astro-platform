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
          categories: article.categories,
          categoriesType: typeof article.categories,
          keys: Object.keys(article)
        });
      }
    }
    
    // Normalizar la categoría para la comparación
    const normalizedCategory = String(category).trim().toLowerCase();
    console.log(`[RESPALDO] Categoría normalizada para búsqueda: "${normalizedCategory}"`);
    
    // Extraer y mostrar todas las categorías disponibles en los artículos
    // Verificamos tanto el campo 'category' (singular) como 'categories' (plural)
    const availableCategories = [];
    allArticles.forEach(article => {
      // Verificar campo 'categories' (puede ser un array o string)
      if (article.categories) {
        if (Array.isArray(article.categories)) {
          article.categories.forEach(cat => {
            if (cat) availableCategories.push(String(cat));
          });
        } else {
          availableCategories.push(String(article.categories));
        }
      }
      // También verificar el campo 'category' por compatibilidad
      else if (article.category) {
        availableCategories.push(String(article.category));
      }
    });
    
    // Eliminar duplicados
    const uniqueCategories = [...new Set(availableCategories)];
    console.log(`[RESPALDO] Categorías disponibles en los artículos: ${JSON.stringify(uniqueCategories)}`);
    
    // Mostrar las categorías normalizadas para comparación
    const normalizedCategories = uniqueCategories.map(c => ({ 
      original: c, 
      normalized: String(c).trim().toLowerCase() 
    }));
    console.log(`[RESPALDO] Categorías normalizadas: ${JSON.stringify(normalizedCategories)}`);
    
    // Contar cuántos artículos tienen cada categoría
    const categoryCounts = {};
    allArticles.forEach(article => {
      // Verificar campo 'categories' (puede ser un array o string)
      if (article.categories) {
        if (Array.isArray(article.categories)) {
          article.categories.forEach(cat => {
            if (cat) {
              const normalizedCat = String(cat).trim().toLowerCase();
              categoryCounts[normalizedCat] = (categoryCounts[normalizedCat] || 0) + 1;
            }
          });
        } else {
          const normalizedCat = String(article.categories).trim().toLowerCase();
          categoryCounts[normalizedCat] = (categoryCounts[normalizedCat] || 0) + 1;
        }
      }
      // También verificar el campo 'category' por compatibilidad
      else if (article.category) {
        const normalizedCat = String(article.category).trim().toLowerCase();
        categoryCounts[normalizedCat] = (categoryCounts[normalizedCat] || 0) + 1;
      }
    });
    console.log(`[RESPALDO] Conteo de artículos por categoría: ${JSON.stringify(categoryCounts)}`);
    
    // Filtrar artículos por la categoría solicitada
    const filteredArticles = allArticles.filter(article => {
      // Verificar en el campo 'categories' (puede ser array o string)
      if (article.categories) {
        if (Array.isArray(article.categories)) {
          return article.categories.some(cat => 
            cat && String(cat).trim().toLowerCase() === normalizedCategory
          );
        } else {
          return String(article.categories).trim().toLowerCase() === normalizedCategory;
        }
      }
      // También verificar en el campo 'category' por compatibilidad
      else if (article.category) {
        return String(article.category).trim().toLowerCase() === normalizedCategory;
      }
      
      return false;
    });
    
    console.log(`[RESPALDO] Artículos filtrados para la categoría "${category}": ${filteredArticles.length}`);
    
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
