// API para manejar rutas anidadas de archivos multimedia (año/mes/archivo.jpg)
export async function onRequest(context) {
  const { request, env, params } = context;
  
  // Obtener la ruta completa del archivo
  const yearMonthFile = params.year_month_file || '';
  
  // Convertir guiones bajos a barras (formato estándar en R2)
  const fileId = yearMonthFile.replace(/_/g, '/');
  
  console.log('Solicitando archivo:', fileId);
  
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
    console.log('Intentando obtener archivo:', fileId);
    
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      try {
        // Obtener el objeto de R2
        const object = await env.R2_BUCKET.get(fileId);
        
        if (object === null) {
          console.error('Archivo no encontrado en R2:', fileId);
          
          // Listar objetos para depuración
          try {
            const objects = await env.R2_BUCKET.list();
            console.log('Archivos disponibles en R2:', objects.objects.map(o => o.key));
          } catch (listError) {
            console.error('Error al listar archivos:', listError);
          }
          
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
        }
        
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
