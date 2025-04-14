// Módulo para procesar y descargar imágenes
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// Configuración
const config = {
  outputDir: './output/images',
  maxWidth: 1200,
  quality: 80,
  formats: ['webp', 'jpg']
};

/**
 * Procesa todas las imágenes de los artículos
 * @param {Array} images Lista de imágenes a procesar
 * @returns {Promise<Array>} Lista de imágenes procesadas
 */
async function processImages(images) {
  try {
    console.log(`Procesando ${images.length} imágenes...`);
    
    // Crear directorio de salida si no existe
    await fs.ensureDir(config.outputDir);
    
    const processedImages = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`Procesando imagen ${i + 1}/${images.length}: ${image.original_url}`);
      
      try {
        // 1. Descargar imagen
        const imageBuffer = await downloadImage(image.original_url);
        
        // 2. Procesar imagen (redimensionar, optimizar)
        const processedBuffer = await optimizeImage(imageBuffer);
        
        // 3. Generar nombre de archivo
        const fileName = generateFileName(image);
        
        // 4. Guardar imagen localmente
        const localPath = path.join(config.outputDir, fileName);
        await fs.outputFile(localPath, processedBuffer);
        
        // 5. Actualizar información de la imagen
        const processedImage = {
          ...image,
          local_path: localPath,
          file_name: fileName,
          size: processedBuffer.length
        };
        
        processedImages.push(processedImage);
        console.log(`  ✓ Imagen guardada en ${localPath}`);
      } catch (error) {
        console.error(`  ✗ Error al procesar imagen ${image.original_url}:`, error.message);
      }
    }
    
    console.log(`Procesamiento de imágenes completado. ${processedImages.length}/${images.length} imágenes procesadas.`);
    return processedImages;
  } catch (error) {
    console.error('Error en el procesamiento de imágenes:', error);
    throw error;
  }
}

/**
 * Descarga una imagen desde una URL
 * @param {string} url URL de la imagen
 * @returns {Promise<Buffer>} Buffer con los datos de la imagen
 */
async function downloadImage(url) {
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 30000, // 30 segundos de timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    return Buffer.from(response.data, 'binary');
  } catch (error) {
    console.error(`Error al descargar imagen ${url}:`, error.message);
    throw new Error(`Error al descargar imagen: ${error.message}`);
  }
}

/**
 * Optimiza una imagen (redimensiona y comprime)
 * @param {Buffer} buffer Buffer con los datos de la imagen
 * @returns {Promise<Buffer>} Buffer con la imagen optimizada
 */
async function optimizeImage(buffer) {
  try {
    // Crear instancia de sharp
    const image = sharp(buffer);
    
    // Obtener metadatos
    const metadata = await image.metadata();
    
    // Redimensionar si es necesario
    if (metadata.width > config.maxWidth) {
      image.resize(config.maxWidth);
    }
    
    // Optimizar y devolver como JPEG
    return await image
      .jpeg({ quality: config.quality })
      .toBuffer();
  } catch (error) {
    console.error('Error al optimizar imagen:', error);
    // Devolver el buffer original si hay error
    return buffer;
  }
}

/**
 * Genera un nombre de archivo único para una imagen
 * @param {Object} image Información de la imagen
 * @returns {string} Nombre de archivo generado
 */
function generateFileName(image) {
  // Extraer extensión del archivo original
  const originalExt = path.extname(image.original_url.split('?')[0]).toLowerCase() || '.jpg';
  
  // Generar hash basado en la URL original para evitar duplicados
  const hash = crypto.createHash('md5').update(image.original_url).digest('hex').substring(0, 8);
  
  // Crear nombre de archivo
  let fileName = '';
  
  if (image.article_slug) {
    // Usar slug del artículo como base
    fileName = `${image.article_slug}-${hash}${originalExt}`;
  } else {
    // Usar solo el hash si no hay slug
    fileName = `image-${hash}${originalExt}`;
  }
  
  return fileName;
}

/**
 * Convierte una imagen a diferentes formatos
 * @param {Buffer} buffer Buffer con los datos de la imagen
 * @returns {Promise<Object>} Objeto con buffers en diferentes formatos
 */
async function convertToFormats(buffer) {
  const result = {};
  
  try {
    // Convertir a WebP
    if (config.formats.includes('webp')) {
      result.webp = await sharp(buffer)
        .webp({ quality: config.quality })
        .toBuffer();
    }
    
    // Convertir a JPEG
    if (config.formats.includes('jpg')) {
      result.jpg = await sharp(buffer)
        .jpeg({ quality: config.quality })
        .toBuffer();
    }
    
    // Convertir a PNG
    if (config.formats.includes('png')) {
      result.png = await sharp(buffer)
        .png({ quality: config.quality })
        .toBuffer();
    }
    
    return result;
  } catch (error) {
    console.error('Error al convertir imagen a diferentes formatos:', error);
    // Devolver solo el formato original
    return { original: buffer };
  }
}

module.exports = { processImages };
