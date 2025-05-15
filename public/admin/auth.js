// Módulo de autenticación para integración con Cloudflare Access
export async function checkCloudflareAuth() {
  try {
    // Verificar si estamos en un entorno de desarrollo local
    const isLocalDev = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    if (isLocalDev) {
      // En desarrollo local, simulamos una autenticación exitosa
      console.log('Entorno de desarrollo detectado. Simulando autenticación exitosa.');
      return {
        authenticated: true,
        user: {
          name: 'Administrador de Desarrollo',
          email: 'admin@abyayala.org',
          role: 'admin'
        }
      };
    }
    
    // En producción, verificamos el token JWT de Cloudflare Access
    // Usar URL absoluta para la API de autenticación
    const baseUrl = window.location.origin;
    const response = await fetch(`${baseUrl}/api/auth/verify`, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    
    if (!response.ok) {
      throw new Error('No autenticado');
    }
    
    const data = await response.json();
    return {
      authenticated: true,
      user: data.user
    };
  } catch (error) {
    console.error('Error de autenticación:', error);
    return {
      authenticated: false,
      error: error.message
    };
  }
}

// Función para cerrar sesión
export async function logout() {
  // Verificar si estamos en un entorno de desarrollo local
  const isLocalDev = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  if (isLocalDev) {
    // En desarrollo local, simplemente recargamos la página
    window.location.reload();
    return;
  }
  
  // En producción, redirigimos a la URL de cierre de sesión de Cloudflare Access
  // Limpiar localStorage primero para asegurar que no queden datos de sesión
  localStorage.removeItem('abyayala_cms_auth');
  
  // Redirigir a la página de logout de Cloudflare Access con URL absoluta
  const baseUrl = window.location.origin;
  window.location.href = `${baseUrl}/cdn-cgi/access/logout`;
}

// Función para obtener información del usuario actual
export async function getCurrentUser() {
  try {
    const authStatus = await checkCloudflareAuth();
    if (authStatus.authenticated) {
      return authStatus.user;
    }
    return null;
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return null;
  }
}
