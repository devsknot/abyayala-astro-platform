// Utilidades de autenticación para las funciones de Cloudflare

/**
 * Verifica el estado de autenticación de una solicitud
 * @param {Object} context Contexto de la solicitud
 * @returns {Promise<Object>} Estado de autenticación
 */
export async function getAuthStatus(context) {
  // Registrar cabeceras para depuración (solo en desarrollo)
  const isDev = context.request.headers.get('host')?.includes('localhost') || 
                context.request.headers.get('host')?.includes('127.0.0.1');
  
  if (isDev) {
    console.log('Headers de autenticación recibidos:', {
      'CF-Access-Client-Id': context.request.headers.get('CF-Access-Client-Id'),
      'CF-Access-Jwt-Assertion': context.request.headers.get('CF-Access-Jwt-Assertion')?.substring(0, 10) + '...',
      'Authorization': context.request.headers.get('Authorization')?.substring(0, 10) + '...'
    });
  }
  
  // En desarrollo, permitir autenticación simulada
  if (context.request.headers.get('CF-Access-Client-Id') === 'development-client-id' &&
      context.request.headers.get('CF-Access-Jwt-Assertion') === 'development-token') {
    return {
      authenticated: true,
      user: {
        name: 'Desarrollo',
        email: 'dev@abyayala.org',
        role: 'admin'
      }
    };
  }
  
  // Verificar token de autorización Bearer
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // En una implementación real, aquí se verificaría el JWT
    // Por ahora, simplemente aceptamos cualquier token Bearer para pruebas
    return {
      authenticated: true,
      user: {
        name: 'Administrador',
        email: 'admin@abyayala.org',
        role: 'admin'
      }
    };
  }
  
  // En producción, verificar tokens de Cloudflare Access
  const clientId = context.request.headers.get('CF-Access-Client-Id');
  const jwtAssertion = context.request.headers.get('CF-Access-Jwt-Assertion');
  
  if (!clientId || !jwtAssertion) {
    return {
      authenticated: false,
      error: 'No se proporcionaron credenciales de autenticación'
    };
  }
  
  // En una implementación real, aquí se verificaría el JWT
  // Por ahora, simplemente aceptamos cualquier token en producción para pruebas
  return {
    authenticated: true,
    user: {
      name: 'Administrador',
      email: 'admin@abyayala.org',
      role: 'admin'
    }
  };
}
