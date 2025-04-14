// Script para actualizar las rutas de imágenes en los artículos
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

// Mapeo de imágenes para los artículos
const articleImageMapping = [
  { 
    slug: 'cooperativa-agricola-lanza-nueva-linea-de-cafe-organico', 
    image: '2025/04/cafe-organico.jpg' 
  },
  { 
    slug: 'innovacion-en-riego-sostenible-para-pequenos-productores', 
    image: '2025/04/riego-sostenible.jpg' 
  },
  { 
    slug: 'feria-de-intercambio-de-semillas-promueve-biodiversidad', 
    image: '2025/04/feria-semillas.jpg' 
  },
  { 
    slug: 'reunion-anual-de-cooperativas-define-agenda-2025', 
    image: '2025/04/cooperativa-reunion.jpg' 
  }
];

// Función para obtener los artículos actuales
async function getArticles() {
  console.log('Obteniendo artículos de la base de datos...');
  
  try {
    // Consulta SQL para obtener todos los artículos
    const command = `npx wrangler d1 execute abyayala-db --command="SELECT * FROM articles" --json --remote`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('Success')) {
      throw new Error(stderr);
    }
    
    const result = JSON.parse(stdout);
    console.log(`✅ Se encontraron ${result.results.length} artículos`);
    
    return result.results;
  } catch (error) {
    console.error('❌ Error al obtener artículos:', error.message);
    
    // Devolver artículos de ejemplo si no podemos acceder a la base de datos
    console.log('Usando datos de ejemplo para los artículos...');
    return articleImageMapping.map(item => ({
      slug: item.slug,
      featured_image: 'ruta-antigua/' + path.basename(item.image)
    }));
  }
}

// Función para generar el SQL para actualizar las imágenes de los artículos
async function generateUpdateSQL(articles) {
  console.log('Generando SQL para actualizar las imágenes de los artículos...');
  
  // Crear archivo SQL
  const sqlPath = path.join(__dirname, 'update-article-images.sql');
  let sqlContent = '-- Actualización de imágenes en artículos\n\n';
  
  // Generar sentencias UPDATE para cada artículo
  let updatesGenerated = 0;
  
  for (const mapping of articleImageMapping) {
    const article = articles.find(a => a.slug === mapping.slug);
    
    if (article) {
      // Verificar si la imagen ya está actualizada
      if (article.featured_image && article.featured_image.includes(mapping.image)) {
        console.log(`El artículo "${mapping.slug}" ya tiene la imagen correcta`);
        continue;
      }
      
      sqlContent += `-- Actualizar imagen para "${mapping.slug}"\n`;
      sqlContent += `UPDATE articles SET featured_image = '/${mapping.image}' WHERE slug = '${mapping.slug}';\n\n`;
      updatesGenerated++;
    } else {
      console.log(`⚠️ No se encontró el artículo con slug "${mapping.slug}"`);
    }
  }
  
  if (updatesGenerated === 0) {
    console.log('No se necesitan actualizaciones, todos los artículos tienen las imágenes correctas');
    return null;
  }
  
  // Guardar el archivo SQL
  fs.writeFileSync(sqlPath, sqlContent);
  console.log(`✅ Archivo SQL generado: ${sqlPath}`);
  
  return {
    sqlPath,
    updatesGenerated
  };
}

// Función para ejecutar el SQL de actualización
async function executeUpdateSQL(sqlInfo) {
  if (!sqlInfo) {
    return;
  }
  
  console.log(`Preparado para actualizar ${sqlInfo.updatesGenerated} artículos...`);
  
  console.log(`
Para ejecutar el SQL en la base de datos D1, usa el siguiente comando:
npx wrangler d1 execute abyayala-db --file=${sqlInfo.sqlPath} --remote

O si prefieres ejecutarlo manualmente desde la interfaz de Cloudflare:
1. Ve a https://dash.cloudflare.com
2. Navega a Workers & Pages > D1
3. Selecciona tu base de datos 'abyayala-db'
4. Ve a la pestaña 'Query' y pega el contenido del archivo SQL
`);
}

// Función principal
async function main() {
  console.log('Iniciando proceso de actualización de imágenes en artículos...');
  
  try {
    // Obtener artículos actuales
    const articles = await getArticles();
    
    // Generar SQL para actualizar imágenes
    const sqlInfo = await generateUpdateSQL(articles);
    
    // Ejecutar SQL de actualización
    await executeUpdateSQL(sqlInfo);
    
    console.log('✅ Proceso completado');
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
    process.exit(1);
  }
}

// Ejecutar el script
main();
