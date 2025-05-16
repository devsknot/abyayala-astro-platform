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
    const cfAccessClientId = localStorage.getItem('cf_access_client_id');
    
    // Obtener cookies por si los tokens están ahí (caso común con Cloudflare Access)
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    console.log('MediaManager: Verificando autenticación...');
    
    // Intentar obtener los tokens de diferentes fuentes
    if (cfAccessToken && cfAccessClientId) {
      console.log('MediaManager: Usando tokens de localStorage');
      headers['CF-Access-Client-Id'] = cfAccessClientId;
      headers['CF-Access-Jwt-Assertion'] = cfAccessToken;
    } else if (cookies['CF_Authorization']) {
      // Cloudflare a veces almacena el token JWT en una cookie llamada CF_Authorization
      console.log('MediaManager: Usando token de cookie CF_Authorization');
      headers['CF-Access-Jwt-Assertion'] = cookies['CF_Authorization'];
      
      // Si también hay un client-id en las cookies
      if (cookies['CF_Access_Client_Id']) {
        headers['CF-Access-Client-Id'] = cookies['CF_Access_Client_Id'];
      } else {
        // Usar un ID genérico para producción
        headers['CF-Access-Client-Id'] = 'browser-client'; 
      }
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // En desarrollo local, usar cabeceras simuladas
      console.log('MediaManager: Usando tokens simulados para desarrollo local');
      headers['CF-Access-Client-Id'] = 'development-client-id';
      headers['CF-Access-Jwt-Assertion'] = 'development-token';
    } else {
      // En entorno de producción sin tokens, intentar una estrategia alternativa
      console.log('MediaManager: No se encontraron tokens de autenticación. Usando estrategia de fallback');
      
      // Usar el token de autenticación de la sesión actual si existe
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('cf_access_token');
      
      if (tokenParam) {
        console.log('MediaManager: Usando token de parámetro URL');
        headers['CF-Access-Jwt-Assertion'] = tokenParam;
        headers['CF-Access-Client-Id'] = 'browser-client';
        
        // Guardar para futuros usos
        localStorage.setItem('cf_access_token', tokenParam);
        localStorage.setItem('cf_access_client_id', 'browser-client');
      } else {
        // En última instancia, indicar que se requiere autenticación
        console.warn('MediaManager: No se encontraron tokens de autenticación válidos');
      }
    }
    
    // Comprobar si tenemos los headers necesarios
    if (headers['CF-Access-Jwt-Assertion']) {
      console.log('MediaManager: Headers de autenticación configurados correctamente');
    } else {
      console.warn('MediaManager: No se pudieron configurar headers de autenticación');
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
      console.log('MediaManager: Solicitando lista de archivos multimedia...');
      
      // Intentar primero con el endpoint principal
      let response = await fetch(`${this.apiBase}/list`, {
        headers: this.getAuthHeaders()
      });
      
      // Si la respuesta es exitosa, procesar los datos
      if (response.ok) {
        const data = await response.json();
        const files = data.files || [];
        console.log('MediaManager: Archivos multimedia cargados correctamente:', files.length);
        
        // Guardar en cache para uso futuro
        if (files.length > 0) {
          this.saveMediaFilesToCache(files);
        }
        
        return files;
      }
      
      // En caso de error 401 (No autorizado), intentar refrescar los tokens si es posible
      if (response.status === 401) {
        console.warn('MediaManager: Error de autenticación (401). Intentando refrescar tokens...');
        
        // Intentar obtener tokens de la sesión actual
        const sessionInfo = this.attemptToRefreshTokens();
        
        // Si se obtuvieron nuevos tokens, intentar de nuevo
        if (sessionInfo && sessionInfo.token) {
          console.log('MediaManager: Tokens refrescados. Reintentando solicitud...');
          
          // Guardar los nuevos tokens
          localStorage.setItem('cf_access_token', sessionInfo.token);
          if (sessionInfo.clientId) {
            localStorage.setItem('cf_access_client_id', sessionInfo.clientId);
          }
          
          // Reintentar la solicitud con los nuevos tokens
          response = await fetch(`${this.apiBase}/list`, {
            headers: this.getAuthHeaders()
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('MediaManager: Archivos multimedia cargados correctamente después de refrescar tokens:', data.files?.length || 0);
            return data.files || [];
          }
        }
      }
      
      // Si llegamos aquí, no se pudieron cargar los archivos
      console.warn(`MediaManager: API no disponible (${response.status}). No se pueden cargar los archivos multimedia.`);
      
      // Intentar cargar desde storage local en última instancia
      const cachedFiles = this.getCachedMediaFiles();
      if (cachedFiles && cachedFiles.length > 0) {
        console.log('MediaManager: Usando archivos en caché:', cachedFiles.length);
        return cachedFiles;
      }
      
      return [];
    } catch (apiError) {
      console.error('MediaManager: Error al conectar con la API:', apiError);
      
      // En caso de error de red, intentar usar el cache local
      const cachedFiles = this.getCachedMediaFiles();
      if (cachedFiles && cachedFiles.length > 0) {
        console.log('MediaManager: Usando archivos en caché debido a error de red:', cachedFiles.length);
        return cachedFiles;
      }
      
      return [];
    }
  }
  
  // Intentar refrescar los tokens de autenticación
  attemptToRefreshTokens() {
    try {
      // Comprobar si tenemos tokens en cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      if (cookies['CF_Authorization']) {
        return {
          token: cookies['CF_Authorization'],
          clientId: cookies['CF_Access_Client_Id'] || 'browser-client',
          source: 'cookie'
        };
      }
      
      // Comprobar si hay un token en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('cf_access_token');
      if (tokenParam) {
        return {
          token: tokenParam,
          clientId: 'browser-client',
          source: 'url'
        };
      }
      
      // No se encontraron tokens válidos
      return null;
    } catch (error) {
      console.error('MediaManager: Error al intentar refrescar tokens:', error);
      return null;
    }
  }
  
  // Obtener archivos multimedia en caché si existen
  getCachedMediaFiles() {
    try {
      const cachedFilesJson = localStorage.getItem('media_files_cache');
      if (!cachedFilesJson) return null;
      
      const cachedData = JSON.parse(cachedFilesJson);
      
      // Verificar si el caché está expirado (más de 24 horas)
      const cacheTime = new Date(cachedData.timestamp);
      const now = new Date();
      const diffHours = Math.abs(now - cacheTime) / 36e5; // Convertir a horas
      
      if (diffHours > 24) {
        console.log('MediaManager: Cache expirado, eliminando...');
        localStorage.removeItem('media_files_cache');
        return null;
      }
      
      return cachedData.files;
    } catch (error) {
      console.error('MediaManager: Error al leer cache:', error);
      // En caso de error, eliminar el cache corrupto
      localStorage.removeItem('media_files_cache');
      return null;
    }
  }
  
  // Guardar archivos multimedia en cache
  saveMediaFilesToCache(files) {
    try {
      if (!files || !Array.isArray(files)) return;
      
      const cacheData = {
        files: files,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('media_files_cache', JSON.stringify(cacheData));
      console.log('MediaManager: Archivos guardados en cache:', files.length);
    } catch (error) {
      console.error('MediaManager: Error al guardar en cache:', error);
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
    
    // Verificar si la ruta es una ruta de API o una ruta de archivo
    // Las rutas de API suelen tener 'api/media' en ellas
    if (cleanFileId.includes('api/media')) {
      console.log('getPublicUrl - Ruta de API detectada, usando directamente');
      return `/${cleanFileId}`;
    }
    
    // En desarrollo local, usar la ruta completa a través de la API
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('getPublicUrl - Entorno local detectado');
      // Usar la API para acceder al archivo
      return `/api/media/${cleanFileId}`;
    }
    
    // En producción, intentar primero con la API y luego con R2
    console.log('getPublicUrl - Entorno de producción');
    
    // Usar la API para acceder al archivo
    return `/api/media/${cleanFileId}`;
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
   * Renderiza una lista de archivos multimedia en el grid
   * @param {Array} files - Lista de archivos a renderizar
   * @param {HTMLElement} mediaGrid - Elemento donde renderizar los archivos
   * @param {Object} options - Opciones de configuración
   */
  renderMediaItems(files, mediaGrid, options = {}) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      mediaGrid.innerHTML = '<p class="no-media">No hay archivos multimedia disponibles.</p>';
      return;
    }
    
    // Agregar cada archivo al grid
    files.forEach(file => {
      const isImg = file.type && file.type.startsWith('image');
      
      // Generar URL para la miniatura con manejo de errores
      let thumbnail;
      try {
        thumbnail = isImg ? this.generateThumbnailUrl(file.path) : '/admin/assets/document-icon.png';
        console.log('MediaBrowser - Miniatura generada para:', file.name, thumbnail);
      } catch (error) {
        console.error('Error al generar miniatura:', error);
        thumbnail = '/admin/assets/document-icon.png';
      }
      
      const mediaItem = document.createElement('div');
      mediaItem.className = 'media-item';
      mediaItem.dataset.path = file.path || '';
      mediaItem.dataset.name = file.name || 'Sin nombre';
      
      // Crear elemento de miniatura con manejo de errores
      const thumbnailContainer = document.createElement('div');
      thumbnailContainer.className = 'media-thumbnail';
      
      // Crear un div con el nombre del archivo como alternativa a la imagen
      const fallbackDiv = document.createElement('div');
      fallbackDiv.className = 'media-fallback';
      fallbackDiv.style.width = '100%';
      fallbackDiv.style.height = '100%';
      fallbackDiv.style.display = 'flex';
      fallbackDiv.style.alignItems = 'center';
      fallbackDiv.style.justifyContent = 'center';
      fallbackDiv.style.backgroundColor = '#f0f4f8';
      fallbackDiv.style.color = '#4a5568';
      fallbackDiv.style.fontSize = '0.8rem';
      fallbackDiv.style.padding = '8px';
      fallbackDiv.style.textAlign = 'center';
      fallbackDiv.style.wordBreak = 'break-word';
      
      // Determinar el tipo de archivo para mostrar un icono adecuado
      let fileType = 'archivo';
      if (file.path) {
        if (file.path.endsWith('.jpg') || file.path.endsWith('.jpeg') || file.path.endsWith('.png') || file.path.endsWith('.gif')) {
          fileType = 'imagen';
        } else if (file.path.endsWith('.pdf')) {
          fileType = 'PDF';
        } else if (file.path.endsWith('.doc') || file.path.endsWith('.docx')) {
          fileType = 'documento';
        }
      }
      
      fallbackDiv.innerHTML = `
        <div>
          <div style="font-size: 1.5rem; margin-bottom: 5px;">📄</div>
          <div>${fileType}</div>
          <div style="font-size: 0.7rem; margin-top: 5px;">${file.name || 'Sin nombre'}</div>
        </div>
      `;
      
      // Primero agregar el fallback
      thumbnailContainer.appendChild(fallbackDiv);
      
      // Luego intentar cargar la imagen
      if (isImg) {
        const img = document.createElement('img');
        img.alt = file.name || 'Archivo';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.position = 'absolute';
        img.style.top = '0';
        img.style.left = '0';
        img.style.backgroundColor = '#fff';
        
        // Manejar errores de carga de imagen
        img.onerror = () => {
          console.warn('Error al cargar miniatura:', thumbnail);
          // No hacer nada más, ya tenemos el fallback visible
          img.style.display = 'none';
        };
        
        // Si la imagen carga correctamente, ocultar el fallback
        img.onload = () => {
          fallbackDiv.style.display = 'none';
        };
        
        // Establecer el src después de configurar los handlers
        img.src = thumbnail;
        thumbnailContainer.appendChild(img);
      }
      
      mediaItem.appendChild(thumbnailContainer);
      
      // Agregar información del archivo
      const infoContainer = document.createElement('div');
      infoContainer.className = 'media-info';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'media-name';
      nameSpan.textContent = file.name || 'Sin nombre';
      infoContainer.appendChild(nameSpan);
      
      mediaItem.appendChild(infoContainer);
      
      // Agregar evento para seleccionar el archivo
      mediaItem.addEventListener('click', () => {
        try {
          console.log('MediaBrowser - Archivo seleccionado:', file);
          
          // Llamar al callback de selección si existe
          if (options.onSelect && typeof options.onSelect === 'function') {
            // Generar URL pública para el archivo
            const fileUrl = this.getPublicUrl(file.path);
            console.log('MediaBrowser - URL generada para selección:', fileUrl);
            
            // Crear objeto con información completa
            const mediaInfo = {
              ...file,
              url: fileUrl,
              // Asegurarse de que la URL sea absoluta
              absoluteUrl: fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`
            };
            
            // Mostrar información completa en consola para depuración
            console.log('MediaBrowser - Información completa del archivo seleccionado:', mediaInfo);
            
            // Llamar al callback con la información
            options.onSelect(mediaInfo);
          }
          
          // Cerrar el modal
          const mediaBrowser = document.getElementById('media-browser-modal');
          if (mediaBrowser) {
            mediaBrowser.style.display = 'none';
          }
        } catch (error) {
          console.error('Error al seleccionar archivo:', error);
          
          // Intentar recuperarse del error
          if (options.onSelect && typeof options.onSelect === 'function') {
            // Crear un objeto con la información mínima necesaria
            options.onSelect({
              name: file.name || 'archivo',
              path: file.path || '',
              url: file.path ? `/api/media/${file.path.replace(/^\//, '')}` : ''
            });
          }
          
          // Cerrar el modal
          const mediaBrowser = document.getElementById('media-browser-modal');
          if (mediaBrowser) {
            mediaBrowser.style.display = 'none';
          }
        }
      });
      
      mediaGrid.appendChild(mediaItem);
    });
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
              <div class="search-container">
                <input type="text" class="search-input" placeholder="Buscar imágenes...">
              </div>
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
      const searchInput = mediaBrowser.querySelector('.search-input');
      
      // Limpiar el grid
      mediaGrid.innerHTML = '';
      mediaGrid.style.display = 'none';
      loadingElement.style.display = 'block';
      
      // Almacenar los archivos para la búsqueda
      let allMediaFiles = [];
      
      // Función para renderizar los archivos filtrados
      const renderFilteredFiles = (query = '') => {
        // Filtrar archivos por nombre
        const filteredFiles = allMediaFiles.filter(file => {
          if (!query) return true;
          
          const searchTerms = query.toLowerCase().split(' ');
          const fileName = (file.name || '').toLowerCase();
          const filePath = (file.path || '').toLowerCase();
          
          // Comprobar si todos los términos de búsqueda están en el nombre o ruta
          return searchTerms.every(term => 
            fileName.includes(term) || filePath.includes(term)
          );
        });
        
        // Limpiar el grid
        mediaGrid.innerHTML = '';
        
        // Mostrar mensaje si no hay resultados
        if (filteredFiles.length === 0) {
          mediaGrid.innerHTML = `<p class="no-media">No se encontraron archivos${query ? ' para "' + query + '"' : ''}.</p>`;
          return;
        }
        
        // Renderizar los archivos filtrados
        this.renderMediaItems(filteredFiles, mediaGrid, options);
      };
      
      // Agregar evento de búsqueda al input
      if (searchInput) {
        // Limpiar eventos anteriores
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);
        
        // Agregar nuevo evento de búsqueda
        newSearchInput.addEventListener('input', (e) => {
          const query = e.target.value.trim();
          renderFilteredFiles(query);
        });
      }
      
      // Cargar los archivos multimedia
      this.getMediaFiles().then(files => {
        // Guardar todos los archivos para la búsqueda
        allMediaFiles = files || [];
        loadingElement.style.display = 'none';
        mediaGrid.style.display = 'grid';
        
        if (!files || files.length === 0) {
          mediaGrid.innerHTML = '<p class="no-media">No hay archivos multimedia disponibles.</p>';
          return;
        }
        
        // Usar el método renderMediaItems para renderizar los archivos
        this.renderMediaItems(files, mediaGrid, options);
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
