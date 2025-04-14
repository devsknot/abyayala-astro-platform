// Script para descargar imágenes de muestra para el CMS de Abya Yala
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lista de imágenes para descargar (Unsplash - imágenes de agricultura y cooperativas)
const images = [
  {
    name: 'cafe-organico.jpg',
    url: 'https://images.unsplash.com/photo-1599639668519-54ea68a98be2?w=800&q=80'
  },
  {
    name: 'riego-sostenible.jpg',
    url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=800&q=80'
  },
  {
    name: 'feria-semillas.jpg',
    url: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?w=800&q=80'
  },
  {
    name: 'cooperativa-reunion.jpg',
    url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80'
  },
  {
    name: 'cultivo-organico.jpg',
    url: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800&q=80'
  },
  {
    name: 'semillas-nativas.jpg',
    url: 'https://images.unsplash.com/photo-1574943320219-5630271f625e?w=800&q=80'
  }
];

// Directorio de destino
const outputDir = path.join(__dirname, '..', 'public', 'sample-images');

// Asegurarse de que el directorio exista
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Función para descargar una imagen
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Descargando ${path.basename(outputPath)}...`);
    
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Descargada: ${path.basename(outputPath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {}); // Eliminar archivo parcial
      console.error(`❌ Error al descargar ${path.basename(outputPath)}: ${err.message}`);
      reject(err);
    });
  });
}

// Descargar todas las imágenes
async function downloadAllImages() {
  console.log(`Descargando ${images.length} imágenes de muestra...`);
  
  for (const image of images) {
    const outputPath = path.join(outputDir, image.name);
    await downloadImage(image.url, outputPath);
  }
  
  console.log('✅ Todas las imágenes han sido descargadas.');
  console.log(`Las imágenes están disponibles en: ${outputDir}`);
}

// Ejecutar la descarga
downloadAllImages().catch(err => {
  console.error('Error al descargar las imágenes:', err);
  process.exit(1);
});
