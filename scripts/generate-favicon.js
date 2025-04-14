// Script para generar un favicon a partir del logo
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de archivos
const logoPath = path.join(__dirname, '../public/images/CAAY Logo sin fondo.png');
const faviconOutputPath = path.join(__dirname, '../public/favicon.png');
const faviconIcoOutputPath = path.join(__dirname, '../public/favicon.ico');

async function generateFavicon() {
  try {
    console.log('Generando favicon a partir del logo...');
    
    // Crear favicon PNG (32x32)
    await sharp(logoPath)
      .resize(32, 32)
      .png()
      .toFile(faviconOutputPath);
    
    console.log(`Favicon PNG generado en: ${faviconOutputPath}`);
    
    // También crear versión ICO (16x16)
    await sharp(logoPath)
      .resize(16, 16)
      .png()
      .toFile(faviconIcoOutputPath);
    
    console.log(`Favicon ICO generado en: ${faviconIcoOutputPath}`);
    
    console.log('Proceso completado con éxito.');
  } catch (error) {
    console.error('Error al generar el favicon:', error);
  }
}

generateFavicon();
