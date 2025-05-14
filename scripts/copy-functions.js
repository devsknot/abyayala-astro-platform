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

      // Si el archivo es _routes.json o _middleware.js en el directorio raíz de functions, no lo copies.
      if (entry.isFile() && 
         ( (entry.name === '_routes.json' && src === functionsDir) || 
           (entry.name === '_middleware.js' && src === functionsDir) ) 
         ) {
        console.log(`Omitiendo copia de: ${srcPath}`);
        continue;
      }

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
      "/*" // Default to Astro SSR
    ],
    exclude: [
      // Routes handled by Cloudflare Functions
      "/api/*",
      "/hello"
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
