// Biblioteca de medios para el CMS
import { MediaManager } from '../media-manager.js';

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
          <span class="ml-2 text-sm text-gray-600">Subiendo...</span>
        `;
        
        // Subir archivo
        const result = await this.mediaManager.uploadFile(file);
        
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
        alert('Error al subir el archivo. Por favor, intenta de nuevo.');
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
      this.mediaGrid.innerHTML = `<div class="loading">Cargando archivos...</div>`;
      
      // Obtener archivos
      this.mediaFiles = await this.mediaManager.getMediaFiles();
      
      // Renderizar archivos
      this.renderMediaFiles();
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      this.mediaGrid.innerHTML = `<div class="error">Error al cargar archivos. <button class="text-blue-500 hover:underline">Reintentar</button></div>`;
      
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
      
      // Usar el ID del archivo en lugar de la ruta para generar la URL de la miniatura
      // Esto evita problemas cuando file.path incluye '/api/media/'
      const thumbnailUrl = isImage ? this.mediaManager.getPublicUrl(file.id) : '';
      
      const isSelected = this.selectedFile && this.selectedFile.id === file.id;
      
      return `
        <div class="media-item ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : ''}" data-id="${file.id}">
          <div class="media-preview">
            ${isImage 
              ? `<img src="${thumbnailUrl}" alt="${file.filename || file.name}" loading="lazy">` 
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
  
  selectFile(file) {
    this.selectedFile = file;
    
    // Actualizar la interfaz para mostrar el archivo seleccionado
    const mediaItems = this.mediaGrid.querySelectorAll('.media-item');
    mediaItems.forEach(item => {
      if (item.dataset.id === file.id) {
        item.classList.add('border-blue-500', 'ring-2', 'ring-blue-300');
      } else {
        item.classList.remove('border-blue-500', 'ring-2', 'ring-blue-300');
      }
    });
  }
  
  // Utilidad para formatear el tamaño de archivo
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  
  // Método para abrir la biblioteca de medios como un modal
  static openModal(onSelect) {
    // Crear el modal
    const modalContainer = document.createElement('div');
    modalContainer.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
    modalContainer.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div class="p-4 border-b flex justify-between items-center">
          <h2 class="text-xl font-bold">Seleccionar archivo</h2>
          <button type="button" class="close-modal text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="media-container p-4 overflow-y-auto" style="max-height: calc(80vh - 130px);"></div>
        <div class="p-4 border-t flex justify-end">
          <button type="button" class="btn-primary select-button" disabled>Seleccionar</button>
        </div>
      </div>
    `;
    
    // Añadir el modal al body
    document.body.appendChild(modalContainer);
    
    // Crear la biblioteca de medios
    const mediaContainer = modalContainer.querySelector('.media-container');
    const mediaLibrary = new MediaLibrary(mediaContainer, (file) => {
      // Habilitar el botón de selección
      const selectButton = modalContainer.querySelector('.select-button');
      selectButton.disabled = false;
      
      // Guardar el archivo seleccionado
      modalContainer.selectedFile = file;
    });
    
    // Configurar eventos del modal
    modalContainer.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modalContainer);
    });
    
    modalContainer.querySelector('.select-button').addEventListener('click', () => {
      if (modalContainer.selectedFile && onSelect) {
        // Asegurarnos de que la URL de la imagen sea correcta antes de pasarla al callback
        const mediaManager = new MediaManager();
        if (modalContainer.selectedFile.path) {
          // Generar la URL pública correcta para la imagen
          modalContainer.selectedFile.publicUrl = mediaManager.getPublicUrl(modalContainer.selectedFile.path);
        }
        
        onSelect(modalContainer.selectedFile);
      }
      document.body.removeChild(modalContainer);
    });
    
    return mediaLibrary;
  }
}
