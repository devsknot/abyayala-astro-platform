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
  if (path === '/list' || path === '/list/') {
    return handleListMedia(env);
  } else if (path === '/upload' || path === '/upload/') {
    if (request.method === 'POST') {
      return handleUploadMedia(request, env);
    }
  } else if (path.match(/^\/[a-zA-Z0-9-_]+$/)) {
    const fileId = path.substring(1);
    
    if (request.method === 'DELETE') {
      return handleDeleteMedia(fileId, env);
    } else if (request.method === 'GET') {
      return handleGetMedia(fileId, env);
    }
  }
  
  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
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
      const objects = await env.R2_BUCKET.list();
      
      const mediaFiles = objects.objects.map(object => ({
        id: object.key,
        name: object.key,
        url: `/api/media/${object.key}`,
        size: object.size,
        type: getFileType(object.key),
        lastModified: object.uploaded
      }));
      
      return new Response(JSON.stringify({ files: mediaFiles }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Si no hay R2 configurado, devolver datos de ejemplo
      const mediaFiles = [
        {
          id: 'file1',
          name: 'imagen1.jpg',
          url: '/api/media/file1',
          size: 1024 * 1024,
          type: 'image/jpeg',
          lastModified: new Date().toISOString()
        },
        {
          id: 'file2',
          name: 'documento1.pdf',
          url: '/api/media/file2',
          size: 2048 * 1024,
          type: 'application/pdf',
          lastModified: new Date().toISOString()
        }
      ];
      
      return new Response(JSON.stringify({ files: mediaFiles }), {
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
      const object = await env.R2_BUCKET.get(fileId);
      
      if (!object) {
        return new Response(JSON.stringify({ error: 'Archivo no encontrado' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata.contentType || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    } else {
      // Si no hay R2 configurado, devolver un error
      return new Response(JSON.stringify({ error: 'Servicio no disponible' }), {
        status: 503,
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
