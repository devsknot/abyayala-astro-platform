/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '';

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
