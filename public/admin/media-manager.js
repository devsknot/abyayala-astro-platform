// Gestor de medios para el CMS
export class MediaManager {
  constructor() {
    this.apiBase = '/api/media';
    // Agregar una opción para usar datos de prueba cuando la API no está disponible
    this.useFallbackData = true;
  }

  // Método para obtener las cabeceras de autenticación
  getAuthHeaders(isFormData = false) {
    // Obtener el token de autenticación del localStorage
    const authData = localStorage.getItem('abyayala_cms_auth');
    let headers = {};
    
    // Si no es FormData, añadir Content-Type
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        // En un entorno real de Cloudflare Access, el token JWT sería proporcionado por Cloudflare
        // Aquí simulamos una cabecera de autenticación para el entorno de desarrollo
        headers['CF-Access-Client-Id'] = 'development-client-id';
        headers['CF-Access-Client-Secret'] = 'development-client-secret';
      } catch (error) {
        console.error('Error al procesar datos de autenticación:', error);
      }
    }
    
    return headers;
  }

  // Obtener todos los archivos multimedia
  async getMediaFiles() {
    try {
      // Intentar obtener datos de la API
      try {
        const response = await fetch(`${this.apiBase}/list`, {
          headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.files || [];
        }
        
        console.warn(`API no disponible (${response.status}). Usando datos de prueba.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Usando datos de prueba para archivos multimedia');
        return this.getFallbackMediaFiles();
      }
      
      throw new Error('Error al obtener archivos multimedia');
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Subir un nuevo archivo
  async uploadFile(file, fileName = null) {
    try {
      // Intentar usar la API
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        if (fileName) {
          formData.append('fileName', fileName);
        }
        
        const response = await fetch(`${this.apiBase}/upload`, {
          method: 'POST',
          headers: this.getAuthHeaders(true),
          body: formData
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Usando modo de prueba.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Usando modo de prueba para subir archivo');
        return this.simulateFileUpload(file, fileName);
      }
      
      throw new Error('Error al subir el archivo');
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Eliminar un archivo
  async deleteFile(fileId) {
    try {
      // Intentar usar la API
      try {
        const response = await fetch(`${this.apiBase}/${fileId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Usando modo de prueba.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Usando modo de prueba para eliminar archivo');
        return { success: true, message: 'Archivo eliminado (simulado)' };
      }
      
      throw new Error('Error al eliminar el archivo');
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Generar URL de miniatura
  generateThumbnailUrl(path) {
    // En un entorno de producción, esto podría apuntar a Cloudflare Images o un servicio similar
    // para generar miniaturas optimizadas
    
    // Si estamos en desarrollo local, usar la ruta tal cual
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return path;
    }
    
    // En producción, construir la URL completa al bucket R2
    // Nota: Esto asume que las imágenes son accesibles públicamente a través de un dominio configurado
    // Si se usa la API de medios para servir las imágenes, usar la ruta de la API en su lugar
    if (path.startsWith('/')) {
      // Usar la ruta de la API para acceder a las imágenes
      return `/api/media${path}`;
    }
    
    return path;
  }
  
  // Obtener URL pública para un archivo
  getPublicUrl(fileId) {
    // Si el fileId ya es una ruta completa (comienza con /)
    if (fileId.startsWith('/')) {
      // En desarrollo local, usar la ruta tal cual
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return fileId;
      }
      
      // En producción, usar la ruta de la API
      return `/api/media${fileId}`;
    }
    
    // Si es un ID simple, construir la ruta de la API
    return `${this.apiBase}/${fileId}`;
  }
  
  // Determinar si un archivo es una imagen
  isImage(file) {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return imageTypes.includes(file.type);
  }
  
  // Determinar si un archivo es un documento
  isDocument(file) {
    const docTypes = [
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return docTypes.includes(file.type);
  }

  // Datos de ejemplo para cuando la API no está disponible
  getFallbackMediaFiles() {
    console.log('Usando datos de prueba para archivos multimedia');
    
    // Crear rutas relativas para las imágenes de ejemplo
    // Estas rutas deben ser compatibles con la estructura de R2
    const imagePaths = [
      {
        id: 'img1',
        name: 'cafe-organico.jpg',
        path: '/2025/04/cafe-organico.jpg',
        type: 'image/jpeg',
        size: 245000,
        uploaded: '2025-04-05T10:30:00.000Z'
      },
      {
        id: 'img2',
        name: 'riego-sostenible.jpg',
        path: '/2025/04/riego-sostenible.jpg',
        type: 'image/jpeg',
        size: 320000,
        uploaded: '2025-04-01T14:15:00.000Z'
      },
      {
        id: 'img3',
        name: 'feria-semillas.jpg',
        path: '/2025/04/feria-semillas.jpg',
        type: 'image/jpeg',
        size: 180000,
        uploaded: '2025-04-02T09:45:00.000Z'
      },
      {
        id: 'img4',
        name: 'semillas-nativas.jpg',
        path: '/2025/04/semillas-nativas.jpg',
        type: 'image/jpeg',
        size: 210000,
        uploaded: '2025-04-03T16:20:00.000Z'
      },
      {
        id: 'img5',
        name: 'cultivo-organico.jpg',
        path: '/2025/04/cultivo-organico.jpg',
        type: 'image/jpeg',
        size: 275000,
        uploaded: '2025-04-04T11:10:00.000Z'
      },
      {
        id: 'img6',
        name: 'cooperativa-reunion.jpg',
        path: '/2025/04/cooperativa-reunion.jpg',
        type: 'image/jpeg',
        size: 195000,
        uploaded: '2025-04-05T13:30:00.000Z'
      }
    ];
    
    // En desarrollo local, usar rutas relativas
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return imagePaths;
    }
    
    // En producción, asegurarnos de que las rutas sean accesibles
    // Añadir archivos locales en la carpeta /img/sample/ para desarrollo
    return imagePaths.map(file => ({
      ...file,
      // Usar rutas locales para desarrollo que funcionan sin R2
      path: `/img/sample/${file.name}`
    }));
  }
  
  // Simular la subida de un archivo
  simulateFileUpload(file, fileName = null) {
    return new Promise((resolve) => {
      // Simular un retraso de red
      setTimeout(() => {
        const name = fileName || file.name;
        const id = 'img' + Math.floor(Math.random() * 1000);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        // Crear un objeto URL para la vista previa
        const objectUrl = URL.createObjectURL(file);
        
        // En una implementación real, aquí se subiría el archivo a un servidor
        // y se devolvería la URL real. Para la simulación, usamos un path ficticio.
        const path = `/${year}/${month}/${name}`;
        
        resolve({
          success: true,
          file: {
            id,
            name,
            path,
            type: file.type,
            size: file.size,
            uploaded: now.toISOString(),
            url: objectUrl
          }
        });
      }, 1500); // Simular un retraso de 1.5 segundos
    });
  }
}
