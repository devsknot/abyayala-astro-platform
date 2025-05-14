// Script para copiar las funciones al directorio de salida
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para copiar un directorio de forma recursiva
function copyDir(src, dest) {
  try {
    // Crear el directorio de destino si no existe
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
      console.log(`Creado directorio: ${dest}`);
    }

    // Leer el contenido del directorio
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      try {
        if (entry.isDirectory()) {
          // Copiar subdirectorios recursivamente
          copyDir(srcPath, destPath);
        } else {
          // Copiar archivos
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copiado: ${srcPath} -> ${destPath}`);
        }
      } catch (e) {
        console.error(`Error copiando ${srcPath} a ${destPath}:`, e.message);
        // Decide if you want to re-throw, or skip and continue
      }
    }
  } catch (e) {
    console.error(`Error procesando directorio ${src}:`, e.message);
    throw e; // Re-throw to stop the script if the main directory processing fails
  }
}

// Directorios de origen y destino
const functionsDir = path.join(__dirname, '..', 'functions');
const distDir = path.join(__dirname, '..', 'dist');
const destFunctionsDir = path.join(distDir, 'functions');

try {
  console.log('Copiando funciones al directorio de salida...');
  copyDir(functionsDir, destFunctionsDir);
  console.log('Funciones copiadas correctamente.');

  // Crear manualmente el archivo dist/_routes.json
  const routesJsonPath = path.join(distDir, '_routes.json');
  const routesJsonContent = {
    version: 1,
    include: [
      "/api/*",  // Incluir explícitamente las rutas API para que sean manejadas por funciones
      "/hello"   // Incluir explícitamente la ruta hello para que sea manejada por funciones
    ],
    exclude: [
      // Archivos estáticos que deben ser servidos directamente
      "/_astro/*",      // Astro's build assets
      "/assets/*",      // Typical user assets folder
      "/images/*",      // Typical user images folder
      "/fonts/*",       // Typical user fonts folder
      "/favicon.ico",
      "/*.png",
      "/*.jpg",
      "/*.jpeg",
      "/*.svg",
      "/*.gif",
      "/*.webp",
      "/*.txt",         // e.g., robots.txt
      "/*.xml",         // e.g., sitemap.xml
      "/*.json"         // e.g., manifest.json
    ]
  };

  try {
    fs.writeFileSync(routesJsonPath, JSON.stringify(routesJsonContent, null, 2));
    console.log(`Archivo ${routesJsonPath} creado/sobrescrito correctamente.`);
  } catch (e) {
    console.error(`Error escribiendo ${routesJsonPath}:`, e.message);
  }
} catch (e) {
  console.error('Fallo el script de copia de funciones:', e.message);
  process.exit(1); // Salir con código de error si la copia falla
}
