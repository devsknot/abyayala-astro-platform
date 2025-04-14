/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API - en producción, usamos el mismo dominio
const API_BASE_URL = '';
console.log('API_BASE_URL configurada para producción (relativa al dominio actual)');

/**
 * Obtiene todos los artículos
 * @returns {Promise<Array>} Lista de artículos
 */
export async function getAllArticles() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/content/articles`);
    if (!response.ok) {
      throw new Error(`Error al obtener artículos: ${response.status}`);
    }
    return await response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/content/articles/${slug}`);
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
 * @param {string} category - Categoría para filtrar
 * @returns {Promise<Array>} Lista de artículos filtrados
 */
export async function getArticlesByCategory(category) {
  try {
    const articles = await getAllArticles();
    return articles.filter(article => article.category === category);
  } catch (error) {
    console.error(`Error al obtener artículos por categoría ${category}:`, error);
    return [];
  }
}

/**
 * Obtiene todas las categorías
 * @returns {Promise<Array>} Lista de categorías
 */
export async function getAllCategories() {
  try {
    const url = `${API_BASE_URL}/api/content/categories`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error al obtener categorías: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No se encontraron categorías o el formato es incorrecto');
      // En producción, no usamos datos de respaldo
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    // En producción, no usamos datos de respaldo
    return [];
  }
}
