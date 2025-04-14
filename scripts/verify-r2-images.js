// Script para verificar la existencia de imágenes en R2 y probar las rutas
const { execSync } = require('child_process');

// Lista de imágenes que estamos intentando acceder
const imagesToCheck = [
  '2025/04/cafe-organico.jpg',
  '2025/04/cultivo-organico.jpg',
  '2025/04/feria-semillas.jpg',
  '2025/04/cooperativa-reunion.jpg',
  '2025/04/riego-sostenible.jpg',
  '2025/04/semillas-nativas.jpg'
];

// Función para verificar las imágenes en R2
async function verifyR2Images() {
  console.log('Verificando imágenes en R2...');
  
  try {
    // Listar todos los objetos en el bucket R2
    console.log('Listando objetos en R2...');
    const listResult = execSync('npx wrangler r2 object list abyayala-media').toString();
    console.log('Resultado del listado:');
    console.log(listResult);
    
    // Verificar cada imagen
    for (const image of imagesToCheck) {
      try {
        console.log(`\nVerificando imagen: ${image}`);
        
        // Comprobar si la imagen existe
        const checkResult = execSync(`npx wrangler r2 object get abyayala-media "${image}" --no-download`).toString();
        console.log('Resultado de la verificación:');
        console.log(checkResult);
        
        // Generar URLs para acceder a la imagen
        const urlOriginal = `/api/media/${image}`;
        const urlCompatible = `/api/media/${image.replace(/\//g, '_')}`;
        
        console.log('URLs para acceder a la imagen:');
        console.log(`- URL original: ${urlOriginal}`);
        console.log(`- URL compatible: ${urlCompatible}`);
      } catch (error) {
        console.error(`Error al verificar la imagen ${image}:`, error.message);
      }
    }
  } catch (error) {
    console.error('Error al listar objetos en R2:', error.message);
  }
}

// Ejecutar la verificación
verifyR2Images().catch(error => {
  console.error('Error general:', error);
});
