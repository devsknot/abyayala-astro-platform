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
  
  /**
   * Sube un archivo multimedia y devuelve la información del archivo subido
   * @param {File} file - Archivo a subir
   * @returns {Promise<Object>} - Objeto con la URL y otra información del archivo
   */
  async uploadMedia(file) {
    try {
      console.log('MediaManager: Subiendo archivo multimedia', file.name);
      
      // Validar el archivo
      if (!file) {
        throw new Error('No se proporcionó ningún archivo');
      }
      
      // Verificar si es un tipo de archivo permitido
      if (!this.isImage(file) && !this.isDocument(file)) {
        throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes y documentos.');
      }
      
      // Usar el método existente para subir archivos
      const result = await this.uploadFile(file);
      console.log('MediaManager: Resultado de la subida:', result);
      
      // Formatear la respuesta para ser compatible con el selector de imágenes
      return {
        url: result.url || this.getPublicUrl(result.path),
        path: result.path,
        name: file.name,
        type: file.type,
        size: file.size
      };
    } catch (error) {
      console.error('MediaManager: Error al subir archivo multimedia:', error);
      throw error;
    }
  }
  
  /**
   * Abre el navegador de medios
   * @param {Object} options - Opciones de configuración
   * @param {Function} options.onSelect - Función de callback para la selección
   */
  openMediaBrowser(options = {}) {
    try {
      console.log('MediaManager: Abriendo navegador de medios');
      
      // Crear el modal de selección de medios si no existe
      let mediaBrowser = document.getElementById('media-browser-modal');
      
      if (!mediaBrowser) {
        mediaBrowser = document.createElement('div');
        mediaBrowser.id = 'media-browser-modal';
        mediaBrowser.className = 'modal';
        mediaBrowser.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h3>Seleccionar archivo multimedia</h3>
              <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="media-browser-loading">Cargando archivos...</div>
              <div class="media-browser-grid"></div>
            </div>
          </div>
        `;
        document.body.appendChild(mediaBrowser);
        
        // Agregar evento para cerrar el modal
        mediaBrowser.querySelector('.close-modal').addEventListener('click', () => {
          mediaBrowser.style.display = 'none';
        });
      }
      
      // Mostrar el modal
      mediaBrowser.style.display = 'block';
      
      // Obtener el grid donde se mostrarán los archivos
      const mediaGrid = mediaBrowser.querySelector('.media-browser-grid');
      const loadingElement = mediaBrowser.querySelector('.media-browser-loading');
      
      // Limpiar el grid
      mediaGrid.innerHTML = '';
      mediaGrid.style.display = 'none';
      loadingElement.style.display = 'block';
      
      // Cargar los archivos multimedia
      this.getMediaFiles().then(files => {
        loadingElement.style.display = 'none';
        mediaGrid.style.display = 'grid';
        
        if (!files || files.length === 0) {
          mediaGrid.innerHTML = '<p class="no-media">No hay archivos multimedia disponibles.</p>';
          return;
        }
        
        // Agregar cada archivo al grid
        files.forEach(file => {
          const isImg = file.type && file.type.startsWith('image');
          const thumbnail = isImg ? this.generateThumbnailUrl(file.path) : '/admin/assets/document-icon.png';
          
          const mediaItem = document.createElement('div');
          mediaItem.className = 'media-item';
          mediaItem.innerHTML = `
            <div class="media-thumbnail">
              <img src="${thumbnail}" alt="${file.name || 'Archivo'}" />
            </div>
            <div class="media-info">
              <span class="media-name">${file.name || 'Sin nombre'}</span>
            </div>
          `;
          
          // Agregar evento para seleccionar el archivo
          mediaItem.addEventListener('click', () => {
            // Llamar al callback de selección si existe
            if (options.onSelect && typeof options.onSelect === 'function') {
              const fileUrl = this.getPublicUrl(file.path);
              options.onSelect({
                ...file,
                url: fileUrl
              });
            }
            
            // Cerrar el modal
            mediaBrowser.style.display = 'none';
          });
          
          mediaGrid.appendChild(mediaItem);
        });
      }).catch(error => {
        console.error('Error al cargar archivos multimedia:', error);
        loadingElement.style.display = 'none';
        mediaGrid.innerHTML = '<p class="error-message">Error al cargar los archivos multimedia.</p>';
      });
    } catch (error) {
      console.error('MediaManager: Error al abrir navegador de medios:', error);
    }
  }
}
