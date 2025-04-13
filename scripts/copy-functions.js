// Script para copiar las funciones al directorio de salida
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para copiar un directorio de forma recursiva
function copyDir(src, dest) {
  // Crear el directorio de destino si no existe
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Leer el contenido del directorio
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Copiar subdirectorios recursivamente
      copyDir(srcPath, destPath);
    } else {
      // Copiar archivos
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copiado: ${srcPath} -> ${destPath}`);
    }
  }
}

// Directorios de origen y destino
const srcDir = path.join(__dirname, '..', 'functions');
const destDir = path.join(__dirname, '..', 'dist', 'functions');

console.log('Copiando funciones al directorio de salida...');
copyDir(srcDir, destDir);
console.log('Funciones copiadas correctamente.');
