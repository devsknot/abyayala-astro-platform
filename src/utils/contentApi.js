/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API - usamos la URL completa para asegurar que funcione
const API_BASE_URL = 'https://colectivoabyayala.org';
console.log('API_BASE_URL configurada con URL completa:', API_BASE_URL);

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
 * @param {string} category - Categoría para filtrar (id de la categoría)
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
    // Usar el mismo enfoque que el CMS para obtener categorías
    const url = `${API_BASE_URL}/api/content/categories`;
    console.log('getAllCategories - Intentando obtener categorías desde:', url);
    
    // Usar los mismos headers que el CMS
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('getAllCategories - Respuesta de la API:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error(`getAllCategories - Error al obtener categorías: ${response.status}`);
      return [];
    }
    
    // Obtener el texto de la respuesta para depuración
    const responseText = await response.text();
    console.log('getAllCategories - Respuesta en texto:', responseText);
    
    // Intentar parsear el texto como JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('getAllCategories - Datos parseados correctamente');
    } catch (parseError) {
      console.error('getAllCategories - Error al parsear JSON:', parseError);
      return [];
    }
    
    console.log('getAllCategories - Datos de categorías recibidos:', data);
    console.log('getAllCategories - Tipo de datos:', typeof data);
    console.log('getAllCategories - Es array:', Array.isArray(data));
    console.log('getAllCategories - Longitud:', data.length);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('getAllCategories - No se encontraron categorías o el formato es incorrecto');
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('getAllCategories - Error general:', error);
    return [];
  }
}
