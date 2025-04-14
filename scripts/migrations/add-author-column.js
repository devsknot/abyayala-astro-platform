// Script para añadir la columna 'author' a la tabla 'articles'
const wrangler = require('wrangler');

async function main() {
  console.log('Iniciando migración para añadir columna author a la tabla articles...');
  
  try {
    // Ejecutar la migración en D1
    const result = await wrangler.d1('execute', 'DB', {
      command: 'ALTER TABLE articles ADD COLUMN author TEXT;'
    });
    
    console.log('Migración completada exitosamente:', result);
  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
    process.exit(1);
  }
}

main();
