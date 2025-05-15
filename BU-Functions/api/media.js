// Función para gestionar archivos multimedia a través de Cloudflare Functions
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/media', '');
  
  // Verificar autenticación
  const authenticated = await verifyAuthentication(request, env);
  if (!authenticated) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Manejar diferentes rutas y métodos
  if (path === '/list' || path === '/list/' || path === '') {
    return handleListMedia(env);
  } else if (path === '/upload' || path === '/upload/') {
    if (request.method === 'POST') {
      return handleUploadMedia(request, env);
    }
  } else if (path.match(/^\/[a-zA-Z0-9-_]+$/) || path.startsWith('/2025/')) {
    // Extraer el fileId del path, eliminando la barra inicial
    const fileId = path.substring(1);
    
    if (request.method === 'DELETE') {
      return handleDeleteMedia(fileId, env);
    } else if (request.method === 'GET') {
      return handleGetMedia(fileId, env);
    }
  }
  
  // Si llegamos aquí, la ruta no fue encontrada
  return new Response(JSON.stringify({ 
    error: 'Ruta no encontrada',
    path: path,
    url: url.toString()
  }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
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
          
          return {
            id: object.key,
            name: name,
            path: `/${object.key}`,
            url: `/api/media/${object.key}`,
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

// Subir un archivo multimedia a R2
async function handleUploadMedia(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No se proporcionó ningún archivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const fileName = formData.get('fileName') || file.name;
    const fileId = generateFileId(fileName);
    
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.put(fileId, file, {
        httpMetadata: {
          contentType: file.type
        }
      });
      
      return new Response(JSON.stringify({
        id: fileId,
        name: fileName,
        url: `/api/media/${fileId}`,
        size: file.size,
        type: file.type,
        lastModified: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Si no hay R2 configurado, simular subida exitosa
      return new Response(JSON.stringify({
        id: fileId,
        name: fileName,
        url: `/api/media/${fileId}`,
        size: file.size,
        type: file.type,
        lastModified: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Eliminar un archivo multimedia de R2
async function handleDeleteMedia(fileId, env) {
  try {
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      await env.R2_BUCKET.delete(fileId);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Obtener un archivo multimedia de R2
async function handleGetMedia(fileId, env) {
  try {
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      try {
        // Obtener el objeto de R2
        const object = await env.R2_BUCKET.get(fileId);
        
        if (object === null) {
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

// Funciones auxiliares
function getFileType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    zip: 'application/zip'
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

function generateFileId(fileName) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
  
  return `${timestamp}-${randomString}${extension ? '.' + extension : ''}`;
}
