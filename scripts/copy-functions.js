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
const srcDir = path.join(__dirname, '..', 'functions');
const destDir = path.join(__dirname, '..', 'dist', 'functions');

try {
  console.log('Copiando funciones al directorio de salida...');
  copyDir(srcDir, destDir);
  console.log('Funciones copiadas correctamente.');
} catch (e) {
  console.error('Fallo el script de copia de funciones:', e.message);
  process.exit(1); // Salir con código de error si la copia falla
}
