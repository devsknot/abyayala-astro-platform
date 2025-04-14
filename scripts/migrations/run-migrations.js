// Script para ejecutar todas las migraciones de base de datos
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Directorio de migraciones
const MIGRATIONS_DIR = path.join(__dirname);

// Función para ejecutar una migración SQL
function executeMigration(filePath, isRemote = true) {
  console.log(`Ejecutando migración: ${path.basename(filePath)}`);
  
  try {
    const command = `npx wrangler d1 execute DB ${isRemote ? '--remote' : '--local'} --file="${filePath}"`;
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return true;
  } catch (error) {
    console.error(`Error al ejecutar migración ${path.basename(filePath)}:`, error.message);
    return false;
  }
}

// Función principal
async function runMigrations() {
  console.log('Iniciando proceso de migración de base de datos...');
  
  // Obtener todos los archivos SQL en el directorio de migraciones
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .map(file => path.join(MIGRATIONS_DIR, file));
  
  console.log(`Se encontraron ${files.length} archivos de migración.`);
  
  // Determinar si estamos en producción o desarrollo
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`Entorno: ${isProduction ? 'Producción' : 'Desarrollo'}`);
  
  // Ejecutar migraciones en orden
  let successCount = 0;
  let failCount = 0;
  
  for (const file of files) {
    const success = executeMigration(file, isProduction);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\nResumen de migraciones:');
  console.log(`- Total: ${files.length}`);
  console.log(`- Exitosas: ${successCount}`);
  console.log(`- Fallidas: ${failCount}`);
  
  if (failCount > 0) {
    console.error('¡ADVERTENCIA! Algunas migraciones fallaron. Revisar los logs para más detalles.');
    process.exit(1);
  } else {
    console.log('Todas las migraciones se ejecutaron correctamente.');
    process.exit(0);
  }
}

// Ejecutar el script
runMigrations().catch(error => {
  console.error('Error fatal durante la migración:', error);
  process.exit(1);
});
