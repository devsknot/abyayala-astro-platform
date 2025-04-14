/**
 * Cliente para la API de contenido
 * Proporciona métodos para interactuar con la API de artículos
 */

// URL base de la API
// Si no hay una variable de entorno, usamos la URL de producción
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://colectivoabyayala.com';
console.log('API_BASE_URL configurada como:', API_BASE_URL);

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
  console.log('Iniciando getAllCategories()');
  console.log('API_BASE_URL:', API_BASE_URL);
  
  try {
    // Intentar primero con la URL configurada
    const url = `${API_BASE_URL}/api/content/categories`;
    console.log('Intentando obtener categorías desde:', url);
    
    let response = await fetch(url);
    console.log('Respuesta de la API:', response.status, response.statusText);
    
    // Si falla, intentar con la URL de producción directamente
    if (!response.ok && API_BASE_URL !== 'https://colectivoabyayala.com') {
      const productionUrl = 'https://colectivoabyayala.com/api/content/categories';
      console.log('Intentando con URL de producción directamente:', productionUrl);
      response = await fetch(productionUrl);
      console.log('Respuesta de la API de producción:', response.status, response.statusText);
    }
    
    if (!response.ok) {
      throw new Error(`Error al obtener categorías: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Datos de categorías recibidos:', data);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('No se encontraron categorías o el formato es incorrecto');
      console.log('ATENCIÓN: Usando categorías de respaldo debido a que no hay datos');
      // Usar datos de respaldo si no hay categorías
      return getFallbackCategories();
    }
    
    return data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    console.log('ATENCIÓN: Usando categorías de respaldo debido al error');
    // Usar datos de respaldo en caso de error
    return getFallbackCategories();
  }
}

/**
 * Proporciona categorías de respaldo en caso de que la API falle
 * @returns {Array} Lista de categorías de respaldo
 */
function getFallbackCategories() {
  console.log('ATENCIÓN: Devolviendo categorías HARDCODEADAS de respaldo');
  return [
    {
      slug: 'agricultura',
      name: 'Agricultura',
      description: 'Noticias sobre prácticas agrícolas, cultivos y temporadas'
    },
    {
      slug: 'comunidad',
      name: 'Comunidad',
      description: 'Historias de miembros, cooperación y testimonios'
    },
    {
      slug: 'sostenibilidad',
      name: 'Sostenibilidad',
      description: 'Prácticas ecológicas, conservación y biodiversidad'
    },
    {
      slug: 'politica-agraria',
      name: 'Política Agraria',
      description: 'Legislación, derechos y movimientos sociales'
    },
    {
      slug: 'tecnologia-rural',
      name: 'Tecnología Rural',
      description: 'Innovaciones, herramientas y digitalización'
    },
    {
      slug: 'cultura',
      name: 'Cultura',
      description: 'Tradiciones, gastronomía y artesanía'
    },
    {
      slug: 'eventos',
      name: 'Eventos',
      description: 'Ferias, encuentros y capacitaciones'
    }
  ];
}
