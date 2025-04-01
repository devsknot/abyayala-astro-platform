// Gestor de medios para el CMS
export class MediaManager {
  constructor() {
    this.apiBase = '/api/media';
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
      const response = await fetch(`${this.apiBase}/list`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener archivos multimedia');
      }
      
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error('Error:', error);
      throw error;
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
      
      if (!response.ok) {
        throw new Error('Error al subir el archivo');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
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
      
      if (!response.ok) {
        throw new Error('Error al eliminar el archivo');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Generar URL de miniatura
  generateThumbnailUrl(path) {
    // En una implementación real, podríamos usar un servicio de transformación de imágenes
    // Por ahora, simplemente devolvemos la ruta original
    return path;
  }
  
  // Obtener URL pública para un archivo
  getPublicUrl(fileId) {
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
}
