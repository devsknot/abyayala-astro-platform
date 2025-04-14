// Módulo para extraer artículos del blog de Blogger
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { generateSlug } = require('./slug-generator');
const { categorizeArticle } = require('./categorizer');

// Configuración
const config = {
  blogUrl: 'https://colectivoagrarioabyayala.blogspot.com/',
  maxPages: 20, // Número máximo de páginas a procesar
  outputDir: './output'
};

/**
 * Extrae todos los artículos del blog
 * @returns {Promise<Object>} Objeto con artículos e imágenes extraídos
 */
async function extractBlog() {
  try {
    console.log('Iniciando extracción del blog...');
    
    // 1. Obtener URLs de todos los artículos
    console.log('Obteniendo URLs de artículos...');
    const articleUrls = await getAllArticleUrls();
    console.log(`Se encontraron ${articleUrls.length} artículos.`);
    
    // 2. Procesar cada artículo
    const articles = [];
    const images = [];
    
    console.log('Procesando artículos...');
    for (let i = 0; i < articleUrls.length; i++) {
      const url = articleUrls[i];
      console.log(`Procesando artículo ${i + 1}/${articleUrls.length}: ${url}`);
      
      try {
        const { article, articleImages } = await processArticle(url);
        articles.push(article);
        images.push(...articleImages);
      } catch (error) {
        console.error(`Error al procesar artículo ${url}:`, error);
      }
    }
    
    // 3. Generar estadísticas
    console.log('Generando estadísticas...');
    const stats = generateStats(articles, images);
    
    // 4. Crear JSON final
    const outputJson = {
      articles,
      images,
      stats
    };
    
    // 5. Guardar JSON
    const outputPath = path.join(config.outputDir, 'blog-content.json');
    await fs.outputJson(outputPath, outputJson, { spaces: 2 });
    console.log(`Datos guardados en ${outputPath}`);
    
    return outputJson;
  } catch (error) {
    console.error('Error durante la extracción del blog:', error);
    throw error;
  }
}

/**
 * Obtiene todas las URLs de artículos del blog
 * @returns {Promise<string[]>} Array con URLs de artículos
 */
async function getAllArticleUrls() {
  const articleUrls = new Set();
  
  // Obtener URLs de la página principal
  await getArticleUrlsFromPage(config.blogUrl, articleUrls);
  
  // Obtener URLs de páginas adicionales
  for (let page = 2; page <= config.maxPages; page++) {
    const pageUrl = `${config.blogUrl}?page=${page}`;
    try {
      const newUrls = await getArticleUrlsFromPage(pageUrl, articleUrls);
      if (newUrls === 0) break; // No hay más páginas
    } catch (error) {
      console.error(`Error al obtener URLs de la página ${page}:`, error);
      break;
    }
  }
  
  // Obtener URLs por categorías
  const categories = [
    'Comunicados', 'Noticias', 'Convocatorias', 'Denuncias', 
    'Pronunciamientos', 'Declaraciones', 'Análisis'
  ];
  
  for (const category of categories) {
    const categoryUrl = `${config.blogUrl}search/label/${encodeURIComponent(category)}`;
    try {
      await getArticleUrlsFromPage(categoryUrl, articleUrls);
    } catch (error) {
      console.error(`Error al obtener URLs de la categoría ${category}:`, error);
    }
  }
  
  return Array.from(articleUrls);
}

/**
 * Obtiene URLs de artículos de una página específica
 * @param {string} pageUrl URL de la página a procesar
 * @param {Set<string>} urlSet Conjunto de URLs ya encontradas
 * @returns {Promise<number>} Número de nuevas URLs encontradas
 */
async function getArticleUrlsFromPage(pageUrl, urlSet) {
  try {
    const response = await axios.get(pageUrl);
    const $ = cheerio.load(response.data);
    
    const initialCount = urlSet.size;
    
    // Buscar enlaces a artículos
    $('.post-title a, .post-title-link').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.includes('blogspot.com') && !href.includes('/search/')) {
        urlSet.add(href);
      }
    });
    
    return urlSet.size - initialCount;
  } catch (error) {
    console.error(`Error al obtener URLs de ${pageUrl}:`, error);
    return 0;
  }
}

/**
 * Procesa un artículo individual
 * @param {string} url URL del artículo
 * @returns {Promise<Object>} Objeto con datos del artículo e imágenes
 */
async function processArticle(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    // Extraer título
    const title = $('.post-title').text().trim();
    
    // Generar slug
    const slug = generateSlug(title);
    
    // Extraer contenido
    const contentElement = $('.post-body');
    const content = contentElement.html();
    
    // Extraer fecha
    const dateStr = $('.date-header').text().trim();
    const pubDate = parseDate(dateStr);
    
    // Extraer etiquetas
    const tags = [];
    $('.post-labels a').each((index, element) => {
      const tag = $(element).text().replace(/^#/, '').trim();
      if (tag) tags.push(tag);
    });
    
    // Extraer imágenes
    const images = [];
    contentElement.find('img').each((index, element) => {
      const src = $(element).attr('src');
      if (src) {
        const fileName = path.basename(src).split('?')[0];
        const newPath = `/img/articulos/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;
        
        images.push({
          original_url: src,
          new_path: newPath,
          article_slug: slug,
          is_featured: index === 0 // La primera imagen es la destacada
        });
        
        // Reemplazar URL en el contenido
        $(element).attr('src', newPath);
      }
    });
    
    // Extraer imagen destacada
    let featuredImage = null;
    if (images.length > 0) {
      featuredImage = images[0].new_path;
    }
    
    // Extraer descripción
    let description = '';
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) {
      description = metaDescription;
    } else {
      // Crear descripción a partir del contenido
      const textContent = contentElement.text().trim();
      description = textContent.substring(0, 160) + (textContent.length > 160 ? '...' : '');
    }
    
    // Determinar categoría
    const category = categorizeArticle({ title, content, tags });
    
    // Crear objeto de artículo
    const article = {
      slug,
      title,
      description,
      content: contentElement.html(), // Contenido con URLs actualizadas
      pubDate: pubDate.toISOString(),
      category,
      featured_image: featuredImage,
      original_url: url,
      tags
    };
    
    return { article, articleImages: images };
  } catch (error) {
    console.error(`Error al procesar artículo ${url}:`, error);
    throw error;
  }
}

/**
 * Parsea una fecha en formato de texto
 * @param {string} dateStr Fecha en formato texto
 * @returns {Date} Objeto Date
 */
function parseDate(dateStr) {
  try {
    // Intentar parsear la fecha
    const date = new Date(dateStr);
    
    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      // Si no es válida, usar la fecha actual
      return new Date();
    }
    
    return date;
  } catch (error) {
    console.error('Error al parsear fecha:', error);
    return new Date();
  }
}

/**
 * Genera estadísticas de los datos extraídos
 * @param {Array} articles Artículos extraídos
 * @param {Array} images Imágenes extraídas
 * @returns {Object} Estadísticas
 */
function generateStats(articles, images) {
  // Contar artículos por categoría
  const categories = {};
  
  for (const article of articles) {
    const category = article.category;
    categories[category] = (categories[category] || 0) + 1;
  }
  
  return {
    total_articles: articles.length,
    total_images: images.length,
    categories
  };
}

module.exports = { extractBlog };
