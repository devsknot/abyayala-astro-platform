// Script para purgar la caché de Cloudflare
import fetch from 'node-fetch';

// Configuración - Obtener valores de variables de entorno o argumentos de línea de comandos
let ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || ''; // El ID de tu zona (dominio) en Cloudflare
let API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || ''; // Tu token de API de Cloudflare con permisos de purga de caché

// Verificar si se proporcionaron credenciales como argumentos
process.argv.forEach((arg, index) => {
  if (arg === '--zone-id' && process.argv[index + 1]) {
    ZONE_ID = process.argv[index + 1];
  }
  if (arg === '--token' && process.argv[index + 1]) {
    API_TOKEN = process.argv[index + 1];
  }
});

// Verificar que se hayan proporcionado las credenciales
if (!ZONE_ID || !API_TOKEN) {
  console.error('❌ Error: Se requieren ZONE_ID y API_TOKEN para purgar la caché.');
  console.error('Puedes proporcionarlos de las siguientes formas:');
  console.error('1. Como variables de entorno: CLOUDFLARE_ZONE_ID y CLOUDFLARE_API_TOKEN');
  console.error('2. Como argumentos de línea de comandos: --zone-id TU_ZONE_ID --token TU_API_TOKEN');
  console.error('3. Editando directamente este archivo y estableciendo los valores de ZONE_ID y API_TOKEN');
  process.exit(1);
}

// Función para purgar toda la caché
async function purgeEverything() {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        purge_everything: true
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Caché purgada exitosamente');
      console.log(data);
    } else {
      console.error('❌ Error al purgar la caché:');
      console.error(data.errors);
    }
  } catch (error) {
    console.error('❌ Error en la solicitud:', error);
  }
}

// Función para purgar URLs específicas
async function purgeUrls(urls) {
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: urls
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ URLs purgadas exitosamente');
      console.log(data);
    } else {
      console.error('❌ Error al purgar las URLs:');
      console.error(data.errors);
    }
  } catch (error) {
    console.error('❌ Error en la solicitud:', error);
  }
}

// URLs específicas de la API para purgar
const apiUrls = [
  'https://colectivoabyayala.org/api/content/articles',
  'https://colectivoabyayala.org/api/content/articleslist',
  'https://colectivoabyayala.org/api/content/articles-list',
  'https://colectivoabyayala.org/api/content/categories',
  'https://colectivoabyayala.org/api/content/articles/category/agricultura',
  'https://colectivoabyayala.org/api/content/articles/category/tecnologia-rural',
  'https://colectivoabyayala.org/api/content/articles/category/eventos',
  'https://colectivoabyayala.org/api/content/articles/category/comunidad',
  'https://colectivoabyayala.org/api/content/articles/category/sostenibilidad',
  'https://colectivoabyayala.org/api/content/articles/category/politica-agraria',
  'https://colectivoabyayala.org/api/content/articles/category/cultura',
  'https://colectivoabyayala.org/api/content/articles/category/noticias',
  'https://colectivoabyayala.org/api/content/articles/category/analisis',
  'https://colectivoabyayala.org/api/content/articles/category/investigacion',
  'https://colectivoabyayala.org/api/content/articles/category/internacional',
  'https://colectivoabyayala.org/api/content/articles/category/comunicados',
  'https://colectivoabyayala.org/api/content/articles/category/testimonios'
];

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--all') || args.length === 0) {
    console.log('🔄 Purgando toda la caché...');
    await purgeEverything();
  } else if (args.includes('--api')) {
    console.log('🔄 Purgando URLs de la API...');
    await purgeUrls(apiUrls);
  } else {
    console.log('🔄 Purgando URLs específicas...');
    await purgeUrls(args);
  }
}

// Ejecutar la función principal
main().catch(error => {
  console.error('❌ Error en la ejecución:', error);
  process.exit(1);
});
