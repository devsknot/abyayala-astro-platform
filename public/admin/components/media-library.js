// Biblioteca de medios para el CMS
import { MediaManager, ALLOWED_UPLOAD_TYPES } from '../media-manager.js';
import { ContentManager } from '../content-manager.js';
import { notifications } from './notification.js';
import { escapeHtml, attrUrl } from '../utils/html.js';
import { icon } from '../utils/icons.js';

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
        <div class="page-header">
          <div>
            <h2 class="page-title">Biblioteca de medios</h2>
            <p class="page-subtitle">JPG, PNG, GIF, WebP y AVIF · tamaño máximo 10 MB. Se guardan en Cloudflare R2.</p>
          </div>
          <div class="page-actions">
            <span class="upload-status hidden" role="status"><span class="spinner spinner-sm" aria-hidden="true"></span>Subiendo…</span>
            <label class="btn btn-primary file-button" tabindex="0">
              ${icon('upload', { size: 18 })}<span>Subir imagen</span>
              <input id="file-upload" type="file" class="sr-only" tabindex="-1" accept="${ALLOWED_UPLOAD_TYPES.join(',')}">
            </label>
          </div>
        </div>

        <div class="toolbar card">
          <div class="search-field">
            ${icon('search', { size: 18, className: 'search-field-icon' })}
            <label for="media-search" class="sr-only">Buscar archivos</label>
            <input id="media-search" type="search" placeholder="Buscar archivos por nombre…" class="form-input" autocomplete="off">
          </div>
          <span class="toolbar-meta media-count" aria-live="polite"></span>
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
    // El <label> hace de botón: activarlo también con teclado
    const uploadLabel = this.fileUpload.closest('label');
    uploadLabel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.fileUpload.click();
      }
    });

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
    this.mediaGrid.setAttribute('aria-busy', 'true');
    this.mediaGrid.innerHTML = '<div class="media-item skeleton-card" aria-hidden="true"><span class="skeleton skeleton-media"></span><div class="media-info"><span class="skeleton skeleton-text"></span><span class="skeleton skeleton-text w-1/2"></span></div></div>'.repeat(8);

    try {
      this.mediaFiles = await this.mediaManager.getMediaFiles();
      this.renderMediaFiles();
    } catch (error) {
      console.error('Error al cargar archivos:', error);
      this.mediaGrid.removeAttribute('aria-busy');
      this.mediaGrid.innerHTML = `
        <div class="state-card state-error grid-span-all" role="alert">
          <span class="state-icon">${icon('alert', { size: 28 })}</span>
          <h3 class="state-title">No se pudieron cargar los archivos</h3>
          <button type="button" class="btn btn-primary retry-btn">${icon('refresh', { size: 18 })}<span>Reintentar</span></button>
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

    this.mediaGrid.removeAttribute('aria-busy');
    const count = this.container.querySelector('.media-count');
    if (count) {
      const totalBytes = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
      count.textContent = `${files.length} ${files.length === 1 ? 'archivo' : 'archivos'} · ${this.formatFileSize(totalBytes)}`;
    }

    if (files.length === 0) {
      this.mediaGrid.innerHTML = `
        <div class="empty-state grid-span-all">
          <span class="empty-state-icon">${icon(term ? 'search' : 'image', { size: 28 })}</span>
          <p class="empty-state-title">${term ? 'Sin resultados' : 'La biblioteca está vacía'}</p>
          <p class="empty-state-text">${term ? 'No hay archivos que coincidan con la búsqueda.' : 'Sube la primera imagen con el botón «Subir imagen».'}</p>
        </div>
      `;
      return;
    }

    this.mediaGrid.innerHTML = files.map(file => {
      const isImage = (file.type || '').startsWith('image/');
      const name = file.name || file.id || 'Sin nombre';
      const isSelected = this.selectedFile && this.selectedFile.id === file.id;
      const thumbnailUrl = isImage ? attrUrl(this.mediaManager.getPublicUrl(file.id)) : '';

      return `
        <div class="media-item ${isSelected ? 'is-selected' : ''}" data-id="${escapeHtml(file.id)}">
          <div class="media-preview">
            ${thumbnailUrl
              ? `<img src="${thumbnailUrl}" alt="${escapeHtml(name)}" loading="lazy">`
              : `<span class="media-file-icon">${icon('file', { size: 32 })}</span>`}
          </div>
          <div class="media-info">
            <div class="media-info-text">
              <div class="media-name" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
              <div class="media-size">${escapeHtml(this.formatFileSize(file.size))}</div>
            </div>
            <button type="button" class="btn-icon btn-icon-sm media-delete-btn" data-id="${escapeHtml(file.id)}" aria-label="Eliminar ${escapeHtml(name)}" title="Eliminar">${icon('trash', { size: 16 })}</button>
          </div>
        </div>
      `;
    }).join('');
  }

  selectFile(file) {
    this.selectedFile = file;
    file.publicUrl = this.mediaManager.getPublicUrl(file.id);

    this.mediaGrid.querySelectorAll('.media-item').forEach(item => {
      item.classList.toggle('is-selected', item.dataset.id === file.id);
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
}
