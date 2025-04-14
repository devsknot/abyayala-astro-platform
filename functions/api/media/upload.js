// API para subir archivos multimedia a Cloudflare R2
export async function onRequest(context) {
  const { request, env } = context;
  
  // Verificar método
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Método no permitido',
      method: request.method
    }), {
      status: 405,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Allow': 'POST'
      }
    });
  }
  
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
  
  // Manejar la solicitud de carga
  return handleUploadMedia(request, env);
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

// Subir un archivo multimedia a R2
async function handleUploadMedia(request, env) {
  try {
    // Si estamos en un entorno con R2 configurado
    if (env.R2_BUCKET) {
      const formData = await request.formData();
      const file = formData.get('file');
      
      if (!file) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'No se proporcionó ningún archivo' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      // Generar un ID único para el archivo
      const fileName = formData.get('fileName') || file.name;
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const fileId = `${year}/${month}/${fileName}`;
      
      // Subir el archivo a R2
      await env.R2_BUCKET.put(fileId, file, {
        httpMetadata: {
          contentType: file.type
        }
      });
      
      return new Response(JSON.stringify({
        success: true,
        file: {
          id: fileId,
          name: fileName,
          path: `/${fileId}`,
          url: `/api/media/${fileId}`,
          size: file.size,
          type: file.type,
          uploaded: now.toISOString()
        }
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
    console.error('Error general en handleUploadMedia:', error);
    
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
