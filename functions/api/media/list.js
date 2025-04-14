// API para listar archivos multimedia de Cloudflare R2
export async function onRequest(context) {
  const { request, env } = context;
  
  // Verificar autenticación
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
  
  // Manejar la solicitud de listado
  return handleListMedia(env);
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

// Listar archivos multimedia desde R2
async function handleListMedia(env) {
  try {
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      try {
        const objects = await env.R2_BUCKET.list();
        
        // Transformar los objetos de R2 en un formato consistente
        const mediaFiles = objects.objects.map(object => {
          // Extraer el nombre del archivo de la clave
          const name = object.key.split('/').pop();
          
          // Convertir la ruta con barras a formato con guiones bajos para compatibilidad
          const compatiblePath = object.key.replace(/\//g, '_');
          
          return {
            id: object.key,
            name: name,
            path: `/${compatiblePath}`,
            url: `/api/media/${compatiblePath}`,
            size: object.size,
            type: getFileType(object.key),
            uploaded: object.uploaded
          };
        });
        
        return new Response(JSON.stringify({ 
          success: true,
          files: mediaFiles 
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (r2Error) {
        console.error('Error al acceder a R2:', r2Error);
        
        // Devolver respuesta de error detallada
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Error al acceder al almacenamiento R2',
          message: r2Error.message,
          env: env.ENVIRONMENT || 'unknown'
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
        env: env.ENVIRONMENT || 'unknown'
      }), {
        status: 503,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (error) {
    console.error('Error general en handleListMedia:', error);
    
    // Devolver respuesta de error general
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message,
      env: env.ENVIRONMENT || 'unknown'
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
