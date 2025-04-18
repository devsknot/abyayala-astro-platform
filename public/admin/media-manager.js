// Gestor de medios para el CMS
export class MediaManager {
  constructor() {
    this.apiBase = '/api/media';
    // Nunca usar datos de prueba, siempre conectar con la API real
    this.useFallbackData = false;
    // Usar ruta relativa para compatibilidad con SSR
    this.r2PublicUrl = '/media';
    
    console.log('MediaManager: Usando rutas relativas para compatibilidad con SSR');
  }

  // Método para obtener las cabeceras de autenticación
  getAuthHeaders(isFormData = false) {
    const headers = {};
    
    // Si estamos en un entorno con Cloudflare Access
    const cfAccessToken = localStorage.getItem('cf_access_token');
    if (cfAccessToken) {
      headers['CF-Access-Client-Id'] = localStorage.getItem('cf_access_client_id');
      headers['CF-Access-Jwt-Assertion'] = cfAccessToken;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // En desarrollo local, usar cabeceras simuladas
      headers['CF-Access-Client-Id'] = 'development-client-id';
      headers['CF-Access-Jwt-Assertion'] = 'development-token';
    }
    
    // Si no es FormData, añadir Content-Type
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
    
    return headers;
  }

  // Obtener todos los archivos multimedia
  async getMediaFiles() {
    try {
      const response = await fetch(`${this.apiBase}/list`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.files || [];
      }
      
      console.warn(`API no disponible (${response.status}). No se pueden cargar los archivos multimedia.`);
      return [];
    } catch (apiError) {
      console.error('Error al conectar con la API:', apiError);
      return [];
    }
  }

  // Subir un nuevo archivo
  async uploadFile(file, fileName = null) {
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
      
      throw new Error(`Error al subir archivo: ${response.status}`);
    } catch (error) {
      console.error('Error al subir archivo:', error);
      throw error;
    }
  }

  // Eliminar un archivo
  async deleteFile(fileId) {
    try {
      const response = await fetch(`${this.apiBase}/${fileId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      throw new Error(`Error al eliminar archivo: ${response.status}`);
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      throw error;
    }
  }

  // Obtener la URL para un archivo multimedia específico
  getMediaUrl(fileId) {
    if (!fileId) return '';
    
    console.log('getMediaUrl - fileId original:', fileId);
    
    // Si la ruta contiene barras (formato año/mes), reemplazarlas por guiones bajos
    // para que sea compatible con Cloudflare Pages Functions
    if (fileId && fileId.includes('/')) {
      const compatibleId = fileId.replace(/\//g, '_');
      console.log('getMediaUrl - fileId convertido:', compatibleId);
      return `${this.apiBase}/${compatibleId}`;
    }
    
    // Para rutas simples, usar el formato normal
    return `${this.apiBase}/${fileId}`;
  }

  // Generar URL de miniatura
  generateThumbnailUrl(path) {
    // Usar la misma lógica que getPublicUrl para mantener consistencia
    return this.getPublicUrl(path);
  }

  // Obtener URL pública para un archivo
  getPublicUrl(fileId) {
    // Si no hay fileId, devolver una cadena vacía
    if (!fileId) return '';
    
    console.log('getPublicUrl - fileId original:', fileId);
    
    // Si ya es una URL completa, devolverla tal cual
    if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
      console.log('getPublicUrl - URL completa detectada, devolviendo tal cual');
      return fileId;
    }
    
    // Eliminar barras iniciales para evitar dobles barras
    const cleanFileId = fileId.startsWith('/') ? fileId.substring(1) : fileId;
    console.log('getPublicUrl - cleanFileId:', cleanFileId);
    
    // En desarrollo local, usar la ruta tal cual
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('getPublicUrl - Entorno local detectado');
      return `/${cleanFileId}`;
    }
    
    // En producción, usar el dominio personalizado de R2
    console.log('getPublicUrl - Entorno de producción, usando R2PublicUrl');
    return `${this.r2PublicUrl}/${cleanFileId}`;
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
}
