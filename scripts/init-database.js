// Script para inicializar la base de datos D1 de Abya Yala CMS
// Ejecutar con: node scripts/init-database.js

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Función para ejecutar comandos
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`${colors.blue}Ejecutando: ${command}${colors.reset}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`${colors.yellow}Advertencia: ${stderr}${colors.reset}`);
      }
      
      console.log(`${colors.green}Resultado: ${stdout}${colors.reset}`);
      resolve(stdout);
    });
  });
}

// Función para preguntar
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset}`, (answer) => {
      resolve(answer);
    });
  });
}

// Función principal
async function main() {
  try {
    console.log(`${colors.green}=== Inicialización de Base de Datos D1 para Abya Yala CMS ===${colors.reset}`);
    
    // Verificar si wrangler está instalado
    try {
      await executeCommand('wrangler --version');
    } catch (error) {
      console.log(`${colors.yellow}Wrangler no está instalado. Instalando...${colors.reset}`);
      await executeCommand('npm install -g wrangler');
    }
    
    // Verificar login
    console.log(`${colors.blue}Verificando inicio de sesión en Cloudflare...${colors.reset}`);
    await executeCommand('wrangler whoami');
    
    // Preguntar si crear una nueva base de datos
    const createNew = await askQuestion('¿Deseas crear una nueva base de datos D1? (s/n): ');
    
    let databaseId = '';
    let databaseName = 'abyayala-cms';
    
    if (createNew.toLowerCase() === 's') {
      // Crear nueva base de datos
      console.log(`${colors.blue}Creando nueva base de datos D1...${colors.reset}`);
      const output = await executeCommand(`wrangler d1 create ${databaseName}`);
      
      // Extraer el ID de la base de datos
      const idMatch = output.match(/database_id\s*=\s*"([^"]+)"/);
      if (idMatch && idMatch[1]) {
        databaseId = idMatch[1];
        console.log(`${colors.green}ID de base de datos: ${databaseId}${colors.reset}`);
      } else {
        throw new Error('No se pudo extraer el ID de la base de datos');
      }
    } else {
      // Usar base de datos existente
      databaseName = await askQuestion('Nombre de la base de datos existente (default: abyayala-cms): ') || databaseName;
      databaseId = await askQuestion('ID de la base de datos D1: ');
      
      if (!databaseId) {
        throw new Error('El ID de la base de datos es obligatorio');
      }
    }
    
    // Actualizar wrangler.toml
    console.log(`${colors.blue}Actualizando wrangler.toml...${colors.reset}`);
    const wranglerPath = path.join(process.cwd(), 'wrangler.toml');
    let wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
    
    // Reemplazar o agregar la configuración de D1
    const d1Config = `
# Configuración de D1 (Base de datos)
[[d1_databases]]
binding = "DB"
database_name = "${databaseName}"
database_id = "${databaseId}"`;
    
    if (wranglerContent.includes('[[d1_databases]]')) {
      // Reemplazar la configuración existente
      wranglerContent = wranglerContent.replace(/# Configuración de D1.*?database_id = "[^"]*"/s, d1Config);
    } else {
      // Agregar nueva configuración
      wranglerContent += d1Config;
    }
    
    fs.writeFileSync(wranglerPath, wranglerContent);
    console.log(`${colors.green}wrangler.toml actualizado${colors.reset}`);
    
    // Actualizar .env
    console.log(`${colors.blue}Actualizando .env...${colors.reset}`);
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Agregar o actualizar variables D1
    if (!envContent.includes('D1_DATABASE_ID')) {
      envContent += `\n# Variables para Cloudflare D1\nD1_DATABASE_ID=${databaseId}\nD1_DATABASE_NAME=${databaseName}\n`;
    } else {
      envContent = envContent.replace(/D1_DATABASE_ID=.*/, `D1_DATABASE_ID=${databaseId}`);
      envContent = envContent.replace(/D1_DATABASE_NAME=.*/, `D1_DATABASE_NAME=${databaseName}`);
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`${colors.green}.env actualizado${colors.reset}`);
    
    // Aplicar esquema
    console.log(`${colors.blue}Aplicando esquema SQL...${colors.reset}`);
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error('No se encontró el archivo schema.sql');
    }
    
    await executeCommand(`wrangler d1 execute ${databaseName} --file=${schemaPath}`);
    console.log(`${colors.green}Esquema aplicado correctamente${colors.reset}`);
    
    // Verificar la base de datos
    console.log(`${colors.blue}Verificando la base de datos...${colors.reset}`);
    await executeCommand(`wrangler d1 execute ${databaseName} --command="SELECT * FROM categories LIMIT 3"`);
    await executeCommand(`wrangler d1 execute ${databaseName} --command="SELECT * FROM articles LIMIT 3"`);
    
    console.log(`${colors.green}¡Base de datos D1 inicializada correctamente!${colors.reset}`);
    console.log(`${colors.cyan}Ahora puedes ejecutar 'npm run dev' para probar la API localmente.${colors.reset}`);
    
    rl.close();
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    rl.close();
    process.exit(1);
  }
}

main();
