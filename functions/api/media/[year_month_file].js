// API para manejar rutas anidadas de archivos multimedia (año/mes/archivo.jpg)
export async function onRequest(context) {
  const { request, env, params } = context;
  
  // Obtener la ruta completa del archivo
  const yearMonthFile = params.year_month_file || '';
  
  console.log('Parámetro original recibido:', yearMonthFile);
  
  // Reconstruir la ruta del archivo
  let fileId = yearMonthFile;
  
  // Si la ruta contiene guiones bajos, convertirlos a barras para R2
  if (yearMonthFile.includes('_')) {
    // Convertir formato con guiones bajos a formato con barras
    fileId = yearMonthFile.replace(/_/g, '/');
    console.log('Ruta convertida de guiones bajos a barras:', fileId);
  }
  
  // Asegurarse de que no hay dobles barras
  fileId = fileId.replace(/\/\//g, '/');
  
  console.log('Solicitando archivo con ruta final:', fileId);
  
  // Manejar diferentes métodos
  if (request.method === 'GET') {
    return handleGetMedia(fileId, env);
  } else if (request.method === 'DELETE') {
    // Verificar autenticación para operaciones de eliminación
    const authenticated = await verifyAuthentication(request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'No autorizado' 
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return handleDeleteMedia(fileId, env);
  } else if (request.method === 'OPTIONS') {
    // Manejar solicitudes CORS preflight
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, CF-Access-Jwt-Assertion, CF-Access-Client-Id',
        'Access-Control-Max-Age': '86400'
      }
    });
  } else {
    // Método no permitido
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Método no permitido',
      method: request.method
    }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'GET, DELETE, OPTIONS'
      }
    });
  }
}

// Verificar autenticación
async function verifyAuthentication(request, env) {
  // En una implementación real, verificaríamos el token JWT de Cloudflare Access
  const jwt = request.headers.get('CF-Access-Jwt-Assertion');
  const clientId = request.headers.get('CF-Access-Client-Id');
  
  // En un entorno de desarrollo, permitir cabeceras simuladas
  const isDevelopment = env.ENVIRONMENT === 'development' || 
                       clientId === 'development-client-id';
  
  return !!jwt || isDevelopment;
}

// Obtener un archivo multimedia de R2
async function handleGetMedia(fileId, env) {
  try {
    console.log('handleGetMedia - Intentando obtener archivo:', fileId);
    console.log('Información del entorno:', {
      hasBucket: !!env.R2_BUCKET,
      environment: env.ENVIRONMENT || 'no definido'
    });
    
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      try {
        console.log('R2 configurado, intentando obtener archivo:', fileId);
        
        // Listar todos los objetos en el bucket para depuración
        try {
          const objects = await env.R2_BUCKET.list();
          console.log('Objetos en R2:', objects.objects.map(o => o.key));
          
          // Intentar encontrar el objeto exacto primero
          let object = await env.R2_BUCKET.get(fileId);
          
          // Si no se encuentra, intentar con variaciones de la ruta
          if (object === null) {
            console.log('Objeto no encontrado con la ruta exacta, intentando variaciones...');
            
            // Variación 1: Convertir guiones bajos a barras (si aún quedan)
            if (fileId.includes('_')) {
              const altPath1 = fileId.replace(/_/g, '/');
              console.log('Intentando con ruta alternativa 1:', altPath1);
              object = await env.R2_BUCKET.get(altPath1);
            }
            
            // Variación 2: Buscar por nombre de archivo sin la estructura de carpetas
            if (object === null) {
              const fileName = fileId.split('/').pop();
              console.log('Intentando buscar solo por nombre de archivo:', fileName);
              
              // Buscar objetos que contengan el nombre del archivo
              const similarObjects = objects.objects.filter(o => 
                o.key.endsWith(fileName)
              );
              
              if (similarObjects.length > 0) {
                console.log('Objetos encontrados con nombre similar:', similarObjects.map(o => o.key));
                
                // Usar el primer objeto encontrado
                object = await env.R2_BUCKET.get(similarObjects[0].key);
                if (object) {
                  console.log('Usando objeto encontrado por nombre:', similarObjects[0].key);
                }
              }
            }
          }
          
          // Si todavía no se encuentra, buscar objetos similares
          if (object === null) {
            // Buscar si existe un objeto con una clave similar
            const similarObjects = objects.objects.filter(o => 
              o.key.includes(fileId.split('/').pop()) || 
              fileId.includes(o.key.split('/').pop())
            );
            
            if (similarObjects.length > 0) {
              console.log('Objetos similares encontrados:', similarObjects.map(o => o.key));
              
              // Si no encontramos el objeto exacto pero hay uno similar, usarlo
              if (similarObjects.length >= 1) {
                const similarObject = await env.R2_BUCKET.get(similarObjects[0].key);
                if (similarObject) {
                  console.log('Usando objeto similar:', similarObjects[0].key);
                  object = similarObject;
                }
              }
            }
          }
          
          // Si finalmente encontramos un objeto, devolverlo
          if (object !== null) {
            // Determinar el tipo de contenido
            const contentType = object.httpMetadata?.contentType || getFileType(fileId);
            
            console.log('Archivo encontrado, devolviendo con tipo:', contentType);
            
            // Devolver el archivo
            return new Response(object.body, {
              headers: { 
                'Content-Type': contentType,
                'Content-Length': object.size,
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*'
              }
            });
          } else {
            console.error('Archivo no encontrado después de intentar todas las variaciones:', fileId);
          }
        } catch (listError) {
          console.error('Error al listar objetos de R2:', listError);
        }
        
        // Si llegamos aquí, no se encontró el objeto
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Archivo no encontrado',
          fileId: fileId
        }), {
          status: 404,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (r2Error) {
        console.error('Error al acceder a R2:', r2Error);
        
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Error al acceder al archivo',
          message: r2Error.message,
          fileId: fileId
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    } else {
      // Si no hay R2 configurado, devolver un error claro
      return new Response(JSON.stringify({ 
        success: false,
        error: 'R2 no está configurado',
        message: 'El bucket de R2 no está disponible en este entorno',
        fileId: fileId
      }), {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    console.error('Error general en handleGetMedia:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message,
      fileId: fileId
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Eliminar un archivo multimedia de R2
async function handleDeleteMedia(fileId, env) {
  try {
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.delete(fileId);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Archivo eliminado correctamente',
        fileId: fileId
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      // Si no hay R2 configurado, devolver un error claro
      return new Response(JSON.stringify({ 
        success: false,
        error: 'R2 no está configurado',
        message: 'El bucket de R2 no está disponible en este entorno',
        fileId: fileId
      }), {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    console.error('Error general en handleDeleteMedia:', error);
    
    // Devolver respuesta de error general
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message,
      fileId: fileId
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Funciones auxiliares
function getFileType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wav': 'audio/wav'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}
