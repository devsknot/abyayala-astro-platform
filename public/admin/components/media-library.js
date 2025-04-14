// Biblioteca de medios para el CMS
import { MediaManager } from '../media-manager.js';
import { notifications } from './notification.js';

export class MediaLibrary {
  constructor(container, onSelect = null) {
    this.container = container;
    this.onSelect = onSelect;
    this.mediaManager = new MediaManager();
    this.mediaFiles = [];
    this.selectedFile = null;
    this.init();
  }
  
  async init() {
    // Crear la estructura de la biblioteca de medios
    this.container.innerHTML = `
      <div class="media-library">
        <div class="media-header flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Biblioteca de medios</h3>
          <div class="media-actions">
            <label for="file-upload" class="btn-primary cursor-pointer">
              Subir archivo
              <input id="file-upload" type="file" class="hidden" accept="image/*,application/pdf">
            </label>
          </div>
        </div>
        
        <div class="media-filter mb-4">
          <input id="media-search" type="text" placeholder="Buscar archivos..." class="form-input">
        </div>
        
        <div class="media-grid">
          <div class="loading">Cargando archivos...</div>
        </div>
      </div>
    `;
    
    // Obtener referencias a los elementos
    this.mediaGrid = this.container.querySelector('.media-grid');
    this.fileUpload = this.container.querySelector('#file-upload');
    this.searchInput = this.container.querySelector('#media-search');
    
    // Configurar eventos
    this.setupEvents();
    
    // Cargar archivos
    await this.loadMediaFiles();
  }
  
  setupEvents() {
    // Evento para subir archivos
    this.fileUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        // Mostrar indicador de carga
        this.container.querySelector('.media-actions').innerHTML += `
          <span class="ml-2 text-sm text-gray-600 flex items-center">
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Subiendo...
          </span>
        `;
        
        // Mostrar notificación de carga
        const loadingNotification = notifications.info('Subiendo archivo...', 0);
        
        // Subir archivo
        const result = await this.mediaManager.uploadFile(file);
        
        // Cerrar notificación de carga
        notifications.close(loadingNotification);
        
        // Mostrar notificación de éxito
        notifications.success(`Archivo "${file.name}" subido correctamente`);
        
        // Recargar archivos
        await this.loadMediaFiles();
        
        // Restablecer el input de archivo
        this.fileUpload.value = '';
        
        // Actualizar la interfaz
        this.container.querySelector('.media-actions').innerHTML = `
          <label for="file-upload" class="btn-primary cursor-pointer">
            Subir archivo
            <input id="file-upload" type="file" class="hidden" accept="image/*,application/pdf">
          </label>
        `;
      } catch (error) {
        console.error('Error al subir archivo:', error);
        notifications.error(`Error al subir el archivo "${file.name}". Por favor, intenta de nuevo.`);
        
        // Actualizar la interfaz
        this.container.querySelector('.media-actions').innerHTML = `
          <label for="file-upload" class="btn-primary cursor-pointer">
            Subir archivo
            <input id="file-upload" type="file" class="hidden" accept="image/*,application/pdf">
          </label>
        `;
      }
    });
    
    // Evento para buscar archivos
    this.searchInput.addEventListener('input', () => {
      this.filterMediaFiles();
    });
    
    // Evento para seleccionar archivos
    this.mediaGrid.addEventListener('click', (e) => {
      const mediaItem = e.target.closest('.media-item');
      if (!mediaItem) return;
      
      // Obtener el ID del archivo
      const fileId = mediaItem.dataset.id;
      
      // Encontrar el archivo en la lista
      const file = this.mediaFiles.find(f => f.id === fileId);
      if (!file) return;
      
      // Marcar como seleccionado
      this.selectFile(file);
      
      // Llamar al callback de selección si existe
      if (this.onSelect) {
        this.onSelect(file);
      }
    });
  }
  
  async loadMediaFiles() {
    try {
      // Mostrar indicador de carga
      this.mediaGrid.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8">
          <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mb-2"></div>
          <span class="text-gray-500">Cargando archivos...</span>
        </div>
      `;
      
      // Obtener archivos
      this.mediaFiles = await this.mediaManager.getMediaFiles();
      
      // Renderizar archivos
      this.renderMediaFiles();
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      this.mediaGrid.innerHTML = `
        <div class="error p-8 text-center">
          <div class="text-red-500 mb-2">Error al cargar archivos</div>
          <button class="btn-secondary">Reintentar</button>
        </div>
      `;
      
      // Mostrar notificación de error
      notifications.error('Error al cargar los archivos. Por favor, intenta de nuevo.');
      
      // Configurar evento para reintentar
      this.mediaGrid.querySelector('button').addEventListener('click', () => {
        this.loadMediaFiles();
      });
    }
  }
  
  renderMediaFiles() {
    if (this.mediaFiles.length === 0) {
      this.mediaGrid.innerHTML = `<div class="empty-state">No hay archivos. Sube algunos para comenzar.</div>`;
      return;
    }
    
    // Crear elementos para cada archivo
    const mediaItems = this.mediaFiles.map(file => {
      // Verificar si el archivo tiene mimeType o type (compatibilidad con datos de prueba)
      const fileType = file.mimeType || file.type || '';
      const isImage = fileType.startsWith('image/');
      
      // Obtener el ID del archivo para generar la URL de la miniatura
      const fileId = file.id || file.path;
      
      // Crear una instancia del gestor de medios para obtener la URL correcta
      const mediaManager = new MediaManager();
      
      // Generar la URL de la miniatura usando el ID del archivo
      const thumbnailUrl = isImage ? mediaManager.getPublicUrl(fileId) : '';
      
      // Verificar si el archivo está seleccionado
      const isSelected = this.selectedFile && (this.selectedFile.id === file.id || this.selectedFile.path === file.path);
      
      return `
        <div class="media-item ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : ''}" 
             data-id="${file.id || ''}" 
             data-path="${file.path || ''}"
             data-filename="${file.filename || file.name || ''}">
          <div class="media-preview">
            ${isImage 
              ? `<img src="${thumbnailUrl}" alt="${file.filename || file.name}" loading="lazy" onerror="this.onerror=null; this.src='/img/placeholder-image.svg';">` 
              : `<div class="flex items-center justify-center h-full bg-gray-100">
                  <span class="text-3xl">📄</span>
                </div>`
            }
          </div>
          <div class="media-info">
            <div class="truncate text-sm font-medium">${file.filename || file.name}</div>
            <div class="text-xs text-gray-500">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
      `;
    }).join('');
    
    this.mediaGrid.innerHTML = mediaItems;
    
    // Agregar eventos a los elementos de la galería
    this.mediaGrid.querySelectorAll('.media-item').forEach(item => {
      item.addEventListener('click', () => {
        // Encontrar el archivo correspondiente
        const fileId = item.dataset.id;
        const filePath = item.dataset.path;
        
        // Buscar el archivo en la lista por id o path
        const file = this.mediaFiles.find(f => 
          (fileId && f.id === fileId) || (filePath && f.path === filePath)
        );
        
        if (file) {
          // Quitar selección anterior
          this.mediaGrid.querySelectorAll('.media-item').forEach(i => 
            i.classList.remove('border-blue-500', 'ring-2', 'ring-blue-300')
          );
          
          // Agregar selección al elemento actual
          item.classList.add('border-blue-500', 'ring-2', 'ring-blue-300');
          
          // Actualizar archivo seleccionado
          this.selectFile(file);
        }
      });
    });
  }
  
  selectFile(file) {
    this.selectedFile = file;
    
    // Asegurarse de que el archivo tenga las propiedades necesarias
    if (!file.publicUrl) {
      const mediaManager = new MediaManager();
      file.publicUrl = mediaManager.getPublicUrl(file.id || file.path);
    }
    
    // Llamar al callback de selección si existe
    if (this.onSelect) {
      this.onSelect(file);
    }
  }
  
  filterMediaFiles() {
    const searchInput = this.container.querySelector('#media-search');
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
      // Si no hay término de búsqueda, restaurar los archivos originales
      this.renderMediaFiles();
      return;
    }
    
    // Filtrar archivos por nombre
    const filteredFiles = this.mediaFiles.filter(file => 
      (file.filename || file.name).toLowerCase().includes(searchTerm)
    );
    
    // Guardar los archivos originales
    const originalFiles = this.mediaFiles;
    
    // Establecer temporalmente los archivos filtrados
    this.mediaFiles = filteredFiles;
    
    // Renderizar los archivos filtrados
    this.renderMediaFiles();
    
    // Restaurar los archivos originales
    this.mediaFiles = originalFiles;
  }
  
  // Utilidad para formatear el tamaño de archivo
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  
  // Método para eliminar un archivo
  async deleteFile(fileId) {
    try {
      // Pedir confirmación
      const confirmed = await notifications.confirm('¿Estás seguro de que deseas eliminar este archivo? Esta acción no se puede deshacer.');
      if (!confirmed) return;
      
      // Mostrar notificación de carga
      const loadingNotification = notifications.info('Eliminando archivo...', 0);
      
      // Eliminar el archivo
      await this.mediaManager.deleteFile(fileId);
      
      // Cerrar notificación de carga
      notifications.close(loadingNotification);
      
      // Mostrar notificación de éxito
      notifications.success('Archivo eliminado correctamente');
      
      // Recargar archivos
      await this.loadMediaFiles();
      
      return true;
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      notifications.error('Error al eliminar el archivo. Por favor, intenta de nuevo.');
      return false;
    }
  }
  
  // Método estático para abrir un modal con la biblioteca de medios
  static openModal(onSelect) {
    // Crear el modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform scale-95 transition-transform duration-300">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold">Seleccionar archivo</h3>
          <button type="button" class="text-gray-500 hover:text-gray-700 close-modal-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="media-container"></div>
        </div>
      </div>
    `;
    
    // Añadir al DOM
    document.body.appendChild(modal);
    
    // Animar entrada
    setTimeout(() => {
      modal.querySelector('.bg-white').classList.remove('scale-95');
    }, 10);
    
    // Crear instancia de la biblioteca de medios
    const mediaContainer = modal.querySelector('.media-container');
    const mediaLibrary = new MediaLibrary(mediaContainer, (file) => {
      // Llamar al callback de selección
      if (onSelect) {
        onSelect(file);
      }
      
      // Mostrar notificación de éxito
      notifications.success(`Archivo "${file.filename || file.name}" seleccionado`);
      
      // Cerrar el modal
      closeModal();
    });
    
    // Configurar evento para cerrar el modal
    const closeModal = () => {
      // Animar salida
      modal.querySelector('.bg-white').classList.add('scale-95');
      modal.classList.add('opacity-0');
      
      // Eliminar después de la animación
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    };
    
    modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    
    // También permitir cerrar haciendo clic fuera del modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
}
