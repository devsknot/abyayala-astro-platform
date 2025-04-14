// Script principal para la extracción de contenido del blog
const { extractBlog } = require('./blog-extractor');
const { processImages } = require('./image-processor');
const fs = require('fs-extra');
const path = require('path');

// Configuración
const config = {
  outputDir: './output',
  imagesDir: './output/images',
  jsonOutputPath: './output/blog-content.json',
  finalJsonPath: './output/final-content.json'
};

/**
 * Función principal
 */
async function main() {
  try {
    console.log('=== EXTRACTOR DE CONTENIDO DEL BLOG ABYA YALA ===');
    console.log('Iniciando proceso de extracción...');
    
    // Crear directorios de salida
    await fs.ensureDir(config.outputDir);
    await fs.ensureDir(config.imagesDir);
    
    // 1. Extraer contenido del blog
    console.log('\n=== EXTRACCIÓN DE ARTÍCULOS ===');
    const blogContent = await extractBlog();
    
    // 2. Procesar imágenes
    console.log('\n=== PROCESAMIENTO DE IMÁGENES ===');
    const processedImages = await processImages(blogContent.images);
    
    // 3. Actualizar referencias a imágenes en los artículos
    console.log('\n=== ACTUALIZACIÓN DE REFERENCIAS ===');
    const processedArticles = updateImageReferences(blogContent.articles, processedImages);
    
    // 4. Generar JSON final
    const finalContent = {
      articles: processedArticles,
      images: processedImages,
      stats: {
        total_articles: processedArticles.length,
        total_images: processedImages.length,
        categories: processedArticles.reduce((acc, article) => {
          acc[article.category] = (acc[article.category] || 0) + 1;
          return acc;
        }, {})
      }
    };
    
    // 5. Guardar JSON final
    await fs.outputJson(
      config.finalJsonPath,
      finalContent,
      { spaces: 2 }
    );
    
    console.log(`\n=== PROCESO COMPLETADO ===`);
    console.log(`JSON guardado en ${config.finalJsonPath}`);
    console.log(`Total de artículos: ${finalContent.stats.total_articles}`);
    console.log(`Total de imágenes: ${finalContent.stats.total_images}`);
    console.log('Categorías:');
    
    Object.entries(finalContent.stats.categories).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} artículos`);
    });
    
  } catch (error) {
    console.error('Error en el proceso de extracción:', error);
    process.exit(1);
  }
}

/**
 * Actualiza las referencias a imágenes en los artículos
 * @param {Array} articles Lista de artículos
 * @param {Array} images Lista de imágenes procesadas
 * @returns {Array} Artículos con referencias actualizadas
 */
function updateImageReferences(articles, images) {
  console.log(`Actualizando referencias en ${articles.length} artículos...`);
  
  return articles.map(article => {
    let updatedContent = article.content;
    
    // Actualizar referencias a imágenes en el contenido
    images.forEach(image => {
      if (image.article_slug === article.slug) {
        // Reemplazar URL original por la nueva ruta
        const regex = new RegExp(escapeRegExp(image.original_url), 'g');
        updatedContent = updatedContent.replace(regex, image.new_path);
      }
    });
    
    // Actualizar imagen destacada
    const featuredImage = images.find(img => 
      img.article_slug === article.slug && img.is_featured
    );
    
    return {
      ...article,
      content: updatedContent,
      featured_image: featuredImage ? featuredImage.new_path : article.featured_image
    };
  });
}

/**
 * Escapa caracteres especiales para uso en expresiones regulares
 * @param {string} string Cadena a escapar
 * @returns {string} Cadena escapada
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Ejecutar script
main();
