// Función de autenticación para Cloudflare Functions
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/auth', '');

  // Manejar diferentes rutas de autenticación
  switch (path) {
    case '/verify':
      return handleVerify(request, env);
    case '/user':
      return handleGetUser(request, env);
    default:
      return new Response('Not found', { status: 404 });
  }
}

// Verificar autenticación con Cloudflare Access
async function handleVerify(request, env) {
  try {
    // Verificar el token JWT de Cloudflare Access
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    
    if (!jwt) {
      return new Response(JSON.stringify({ 
        authenticated: false,
        error: 'No JWT token found'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // En una implementación real, verificaríamos la validez del JWT
    // Por ahora, simulamos una respuesta exitosa
    
    return new Response(JSON.stringify({
      authenticated: true,
      user: {
        email: 'admin@abyayala.org',
        name: 'Administrador',
        role: 'admin'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      authenticated: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Obtener información del usuario actual
async function handleGetUser(request, env) {
  try {
    // Verificar autenticación
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    
    if (!jwt) {
      return new Response(JSON.stringify({ 
        error: 'No JWT token found'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // En una implementación real, decodificaríamos el JWT para obtener la información del usuario
    // Por ahora, simulamos una respuesta
    
    return new Response(JSON.stringify({
      email: 'admin@abyayala.org',
      name: 'Administrador',
      role: 'admin'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
