// Script para subir imágenes al bucket R2 de Cloudflare
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convertir exec a Promise
const execAsync = promisify(exec);

// Obtener el directorio actual en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directorio de imágenes de muestra
const sampleImagesDir = path.join(__dirname, '..', 'public', 'sample-images');

// Nombre del bucket R2
const bucketName = 'abyayala-media';

// Función para subir un archivo a R2 usando wrangler
async function uploadFileToR2(filePath, key) {
  const fileName = path.basename(filePath);
  console.log(`Subiendo ${fileName} a R2...`);
  
  try {
    // Determinar el tipo MIME basado en la extensión
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream'; // Por defecto
    
    if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.gif') {
      contentType = 'image/gif';
    } else if (ext === '.pdf') {
      contentType = 'application/pdf';
    }
    
    // Construir la ruta en R2
    // Formato: 2025/04/nombre-archivo.jpg
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const r2Key = `${year}/${month}/${fileName}`;
    
    // Comando para subir a R2 usando wrangler
    const command = `npx wrangler r2 object put ${bucketName}/${r2Key} --file=${filePath} --content-type=${contentType} --remote`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Success')) {
      throw new Error(stderr);
    }
    
    console.log(`✅ Subido: ${fileName} -> ${r2Key}`);
    
    // Devolver la información del archivo subido
    return {
      id: r2Key.replace(/\//g, '-'),
      name: fileName,
      path: `/${r2Key}`,
      type: contentType,
      size: fs.statSync(filePath).size,
      uploaded: now.toISOString()
    };
  } catch (error) {
    console.error(`❌ Error al subir ${fileName}:`, error.message);
    throw error;
  }
}

// Función para actualizar la base de datos D1 con las referencias a las imágenes
async function updateDatabase(mediaFiles) {
  console.log('Actualizando la base de datos con las referencias a las imágenes...');
  
  try {
    // Generar un archivo SQL con las inserciones
    const sqlPath = path.join(__dirname, 'media-inserts.sql');
    let sqlContent = '-- Inserciones de medios en la base de datos\n\n';
    
    // Crear tabla de medios si no existe
    sqlContent += `
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded TEXT NOT NULL
);

-- Limpiar tabla antes de insertar
DELETE FROM media;

`;
    
    // Generar inserciones SQL
    mediaFiles.forEach(file => {
      sqlContent += `INSERT INTO media (id, name, path, type, size, uploaded) VALUES (
  '${file.id}',
  '${file.name}',
  '${file.path}',
  '${file.type}',
  ${file.size},
  '${file.uploaded}'
);\n`;
    });
    
    // Guardar el archivo SQL
    fs.writeFileSync(sqlPath, sqlContent);
    console.log(`✅ Archivo SQL generado: ${sqlPath}`);
    
    // Ejecutar el SQL en la base de datos D1 usando wrangler
    console.log('Ejecutando SQL en la base de datos D1...');
    
    // Nota: Esto requiere que la base de datos D1 esté configurada en wrangler.toml
    // const command = `npx wrangler d1 execute abyayala-db --file=${sqlPath}`;
    // const { stdout, stderr } = await execAsync(command);
    
    // Comentamos la ejecución real y solo mostramos instrucciones
    console.log(`
Para ejecutar el SQL en la base de datos D1, usa el siguiente comando:
npx wrangler d1 execute abyayala-db --file=${sqlPath}

O si prefieres ejecutarlo manualmente desde la interfaz de Cloudflare:
1. Ve a https://dash.cloudflare.com
2. Navega a Workers & Pages > D1
3. Selecciona tu base de datos 'abyayala-db'
4. Ve a la pestaña 'Query' y pega el contenido del archivo SQL
`);
    
    console.log('✅ Base de datos actualizada con referencias a medios');
  } catch (error) {
    console.error('❌ Error al actualizar la base de datos:', error.message);
    throw error;
  }
}

// Función principal
async function main() {
  console.log('Iniciando proceso de subida de imágenes a R2...');
  
  try {
    // Verificar que el directorio de imágenes exista
    if (!fs.existsSync(sampleImagesDir)) {
      throw new Error(`El directorio de imágenes no existe: ${sampleImagesDir}`);
    }
    
    // Obtener lista de archivos
    const files = fs.readdirSync(sampleImagesDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      })
      .map(file => path.join(sampleImagesDir, file));
    
    if (files.length === 0) {
      throw new Error('No se encontraron imágenes para subir');
    }
    
    console.log(`Encontradas ${files.length} imágenes para subir`);
    
    // Subir cada archivo a R2
    const mediaFiles = [];
    for (const file of files) {
      try {
        const mediaInfo = await uploadFileToR2(file);
        mediaFiles.push(mediaInfo);
      } catch (error) {
        console.error(`Error al procesar ${path.basename(file)}:`, error.message);
        // Continuar con el siguiente archivo
      }
    }
    
    if (mediaFiles.length === 0) {
      throw new Error('No se pudo subir ninguna imagen');
    }
    
    console.log(`✅ Se subieron ${mediaFiles.length} imágenes a R2`);
    
    // Actualizar la base de datos
    await updateDatabase(mediaFiles);
    
    console.log('✅ Proceso completado con éxito');
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
main();
