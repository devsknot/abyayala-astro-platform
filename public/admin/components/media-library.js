// Biblioteca de medios para el CMS
import { MediaManager, ALLOWED_UPLOAD_TYPES } from '../media-manager.js';
import { ContentManager } from '../content-manager.js';
import { notifications } from './notification.js';
import { escapeHtml, attrUrl } from '../utils/html.js';

export class MediaLibrary {
  /**
   * @param {HTMLElement} container
   * @param {Function|null} onSelect
   * @param {{ mediaManager?: MediaManager, contentManager?: ContentManager }} [deps]
   */
  constructor(container, onSelect = null, { mediaManager, contentManager } = {}) {
    this.container = container;
    this.onSelect = onSelect;
    this.mediaManager = mediaManager || new MediaManager();
    this.contentManager = contentManager || new ContentManager();
    this.mediaFiles = [];
    this.selectedFile = null;
    this.uploading = false;
    this.init();
  }

  async init() {
    this.container.innerHTML = `
      <div class="media-library">
        <div class="media-header flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Biblioteca de medios</h3>
          <div class="media-actions flex items-center">
            <label class="btn-primary cursor-pointer">
              Subir imagen
              <input id="file-upload" type="file" class="hidden" accept="${ALLOWED_UPLOAD_TYPES.join(',')}">
            </label>
            <span class="upload-status ml-2 text-sm text-gray-600 hidden">Subiendo...</span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mb-4">Formatos permitidos: JPG, PNG, GIF, WebP y AVIF. Tamaño máximo: 10 MB.</p>

        <div class="media-filter mb-4">
          <input id="media-search" type="text" placeholder="Buscar archivos..." class="form-input">
        </div>

        <div class="media-grid"></div>
      </div>
    `;

    this.mediaGrid = this.container.querySelector('.media-grid');
    this.fileUpload = this.container.querySelector('#file-upload');
    this.searchInput = this.container.querySelector('#media-search');
    this.uploadStatus = this.container.querySelector('.upload-status');

    this.setupEvents();
    await this.loadMediaFiles();
  }

  setupEvents() {
    this.fileUpload.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) await this.uploadFile(file);
      this.fileUpload.value = '';
    });

    this.searchInput.addEventListener('input', () => this.renderMediaFiles());

    // Un único listener delegado para seleccionar y eliminar
    this.mediaGrid.addEventListener('click', (e) => {
      const deleteButton = e.target.closest('.media-delete-btn');
      if (deleteButton) {
        e.stopPropagation();
        this.deleteFile(deleteButton.dataset.id);
        return;
      }

      const item = e.target.closest('.media-item');
      if (!item) return;
      const file = this.mediaFiles.find(f => f.id === item.dataset.id);
      if (file) this.selectFile(file);
    });

    // Miniaturas rotas: sustituir por el placeholder sin usar onerror inline
    this.mediaGrid.addEventListener('error', (e) => {
      const img = e.target;
      if (img.tagName === 'IMG' && !img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/img/placeholder-image.svg';
      }
    }, true);
  }

  async uploadFile(file) {
    if (this.uploading) return;
    this.uploading = true;
    this.uploadStatus.classList.remove('hidden');
    try {
      const result = await this.mediaManager.uploadFile(file);
      await this.contentManager.logActivity({
        type: 'media_upload',
        entity_type: 'media',
        entity_id: result.id,
        entity_title: file.name,
        details: { size: this.formatFileSize(file.size), type: file.type }
      });
      notifications.success(`Archivo "${file.name}" subido correctamente`);
      await this.loadMediaFiles();
    } catch (error) {
      console.error('Error al subir archivo:', error);
      notifications.error(`No se pudo subir "${file.name}": ${error.message}`);
    } finally {
      this.uploading = false;
      this.uploadStatus.classList.add('hidden');
    }
  }

  async loadMediaFiles() {
    this.mediaGrid.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8">
        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mb-2"></div>
        <span class="text-gray-500">Cargando archivos...</span>
      </div>
    `;

    try {
      this.mediaFiles = await this.mediaManager.getMediaFiles();
      this.renderMediaFiles();
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      this.mediaGrid.innerHTML = `
        <div class="error p-8 text-center">
          <div class="text-red-500 mb-2">Error al cargar archivos</div>
          <button type="button" class="btn-secondary retry-btn">Reintentar</button>
        </div>
      `;
      this.mediaGrid.querySelector('.retry-btn').addEventListener('click', () => this.loadMediaFiles());
      if (error.status !== 401) notifications.error('Error al cargar los archivos. Por favor, intenta de nuevo.');
    }
  }

  renderMediaFiles() {
    const term = this.searchInput.value.trim().toLowerCase();
    const files = term
      ? this.mediaFiles.filter(file => (file.name || '').toLowerCase().includes(term))
      : this.mediaFiles;

    if (files.length === 0) {
      this.mediaGrid.innerHTML = `<div class="empty-state">${term ? 'No hay archivos que coincidan con la búsqueda.' : 'No hay archivos. Sube algunos para comenzar.'}</div>`;
      return;
    }

    this.mediaGrid.innerHTML = files.map(file => {
      const isImage = (file.type || '').startsWith('image/');
      const name = file.name || file.id || 'Sin nombre';
      const isSelected = this.selectedFile && this.selectedFile.id === file.id;
      const thumbnailUrl = isImage ? attrUrl(this.mediaManager.getPublicUrl(file.id)) : '';

      return `
        <div class="media-item ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : ''}" data-id="${escapeHtml(file.id)}">
          <div class="media-preview">
            ${thumbnailUrl
              ? `<img src="${thumbnailUrl}" alt="${escapeHtml(name)}" loading="lazy">`
              : '<div class="flex items-center justify-center h-full bg-gray-100"><span class="text-3xl">📄</span></div>'}
          </div>
          <div class="media-info">
            <div class="truncate text-sm font-medium" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
            <div class="text-xs text-gray-500">${escapeHtml(this.formatFileSize(file.size))}</div>
            <button type="button" class="media-delete-btn" data-id="${escapeHtml(file.id)}" aria-label="Eliminar">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  }

  selectFile(file) {
    this.selectedFile = file;
    file.publicUrl = this.mediaManager.getPublicUrl(file.id);

    this.mediaGrid.querySelectorAll('.media-item').forEach(item => {
      const selected = item.dataset.id === file.id;
      item.classList.toggle('border-blue-500', selected);
      item.classList.toggle('ring-2', selected);
      item.classList.toggle('ring-blue-300', selected);
    });

    if (this.onSelect) this.onSelect(file);
  }

  formatFileSize(bytes) {
    if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  async deleteFile(fileId) {
    if (!fileId) return;
    const file = this.mediaFiles.find(f => f.id === fileId);
    const fileName = file ? file.name : fileId;

    const confirmed = await notifications.confirm(
      `¿Eliminar el archivo "${fileName}"? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );
    if (!confirmed) return;

    try {
      await this.mediaManager.deleteFile(fileId);
      await this.contentManager.logActivity({
        type: 'delete',
        entity_type: 'media',
        entity_id: fileId,
        entity_title: fileName,
        details: { type: file ? file.type || '' : '' }
      });
      if (this.selectedFile && this.selectedFile.id === fileId) this.selectedFile = null;
      notifications.success('Archivo eliminado correctamente');
      await this.loadMediaFiles();
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      notifications.error(`Error al eliminar el archivo: ${error.message}`);
    }
  }

  // Abre un modal con la biblioteca de medios para seleccionar un archivo
  static openModal(onSelect) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div class="flex justify-between items-center p-4 border-b">
          <h3 class="text-lg font-semibold">Seleccionar archivo</h3>
          <button type="button" class="text-gray-500 hover:text-gray-700 close-modal-btn" aria-label="Cerrar">&times;</button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <div class="media-container"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    new MediaLibrary(modal.querySelector('.media-container'), (file) => {
      if (onSelect) onSelect(file);
      closeModal();
    });

    modal.querySelector('.close-modal-btn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
}
