/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API - usamos una ruta relativa para que funcione tanto en desarrollo como en producción
const API_BASE_URL = '';
console.log('API_BASE_URL configurada con ruta relativa para compatibilidad con SSR');

/**
 * Obtiene todos los artículos
 * @returns {Promise<Array>} Lista de artículos
 */
export async function getAllArticles() {
  try {
    console.log('Obteniendo todos los artículos desde:', `/api/content/articles`);
    
    const response = await fetch(`/api/content/articles`, {
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
 * @returns {Promise<Object|null>} Artículo o null si no se encuentra
 */
export async function getArticleBySlug(slug) {
  try {
    const response = await fetch(`/api/content/articles/${slug}`, {
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
 * @returns {Promise<Array>} Lista de artículos filtrados
 */
export async function getArticlesByCategory(category) {
  try {
    console.log(`Obteniendo artículos para la categoría: "${category}"`);
    
    // Obtener todos los artículos primero
    const allArticles = await getAllArticles();
    console.log(`Total de artículos obtenidos: ${allArticles.length}`);
    
    // Normalizar la categoría para la comparación (trim y lowercase)
    const normalizedCategory = String(category).trim().toLowerCase();
    console.log(`Categoría normalizada para filtrado: "${normalizedCategory}"`);
    
    // Filtrar los artículos por la categoría especificada
    const filteredArticles = allArticles.filter(article => {
      // Asegurarse de que article.category sea una cadena y normalizarla
      const articleCategory = String(article.category).trim().toLowerCase();
      console.log(`Comparando categoría del artículo "${articleCategory}" con "${normalizedCategory}"`);
      return articleCategory === normalizedCategory;
    });
    
    console.log(`Artículos filtrados para la categoría "${category}": ${filteredArticles.length}`);
    return filteredArticles;
  } catch (error) {
    console.error(`Error al obtener artículos para la categoría "${category}":`, error);
    return [];
  }
}

/**
 * Obtiene todas las categorías
 * @returns {Promise<Array>} Lista de categorías
 */
export async function getAllCategories() {
  try {
    // Usar el mismo enfoque que el CMS para obtener categorías
    const url = `/api/content/categories`;
    console.log('getAllCategories - Intentando obtener categorías desde:', url);
    
    // Usar los mismos headers que el CMS
    const response = await fetch(url, {
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
    
    // Categorías de respaldo en caso de error
    const fallbackCategories = [
      { id: 'general', name: 'General', description: 'Noticias generales del colectivo' },
      { id: 'medio-ambiente', name: 'Medio Ambiente', description: 'Noticias sobre medio ambiente y sostenibilidad' },
      { id: 'politica', name: 'Política', description: 'Noticias sobre política y asuntos públicos' },
      { id: 'derechos-humanos', name: 'Derechos Humanos', description: 'Noticias sobre derechos humanos y justicia social' }
    ];
    
    console.log('getAllCategories - Devolviendo categorías de respaldo:', fallbackCategories.length);
    return fallbackCategories;
  }
}
