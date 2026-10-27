// Gestor de medios para el CMS: listado, subida y borrado de archivos en R2
// (vía /api/media) y selector modal de imágenes.
import { apiRequest, ApiError } from './utils/api.js';
import { safeUrl } from './utils/html.js';
import { notifications } from './components/notification.js';

const API_BASE = '/api/media';

// Debe coincidir con lo que acepta el servidor en POST /api/media/upload
export const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Valida un archivo antes de subirlo. Lanza ApiError con el mismo código que
 * devolvería el servidor (413/415) para que el manejo de errores sea uniforme.
 * @param {File} file
 */
export function validateUploadFile(file) {
  if (!file) throw new ApiError('No se proporcionó ningún archivo', 400, null);
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new ApiError('Tipo de archivo no permitido. Usa JPG, PNG, GIF, WebP o AVIF.', 415, null);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError('El archivo supera el tamaño máximo de 10 MB.', 413, null);
  }
}

function encodeKey(key) {
  return String(key ?? '')
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
}

export class MediaManager {
  // Lista de archivos del bucket (requiere sesión). Lanza ApiError si falla.
  async getMediaFiles() {
    const data = await apiRequest(`${API_BASE}/list`);
    return Array.isArray(data?.files) ? data.files : [];
  }

  // Sube un archivo y devuelve la respuesta del servidor
  async uploadFile(file, fileName = null) {
    validateUploadFile(file);
    const formData = new FormData();
    formData.append('file', file);
    if (fileName) formData.append('fileName', fileName);
    return apiRequest(`${API_BASE}/upload`, { method: 'POST', body: formData });
  }

  // Sube un archivo y devuelve un objeto con la URL lista para usar
  async uploadMedia(file) {
    const result = await this.uploadFile(file);
    return {
      id: result.id,
      url: result.url || this.getPublicUrl(result.id),
      path: result.id ? `/${result.id}` : '',
      name: result.name || file.name,
      type: result.type || file.type,
      size: result.size ?? file.size
    };
  }

  deleteFile(fileId) {
    return apiRequest(`${API_BASE}/${encodeKey(fileId)}`, { method: 'DELETE' });
  }

  // URL pública (servida por /api/media) para una clave o ruta de R2
  getPublicUrl(fileId) {
    if (!fileId) return '';
    const value = String(fileId);
    if (/^https?:\/\//i.test(value)) return safeUrl(value);
    const clean = value.replace(/^\/+/, '');
    if (clean.startsWith('api/media/')) return `/${clean}`;
    return `${API_BASE}/${encodeKey(clean)}`;
  }

  isImage(file) {
    return Boolean(file && typeof file.type === 'string' && file.type.startsWith('image/'));
  }

  /**
   * Renderiza los archivos en el grid con botones de seleccionar/eliminar.
   * Todo el contenido variable se asigna con textContent / propiedades.
   * @param {Array} files
   * @param {HTMLElement} mediaGrid
   * @param {{ onSelect?: Function, onClose?: Function }} options
   */
  renderMediaItems(files, mediaGrid, options = {}) {
    mediaGrid.replaceChildren();

    if (!Array.isArray(files) || files.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'no-media';
      empty.textContent = 'No hay archivos multimedia disponibles.';
      mediaGrid.appendChild(empty);
      return;
    }

    for (const file of files) {
      const name = file.name || 'Sin nombre';
      const fileUrl = this.getPublicUrl(file.id || file.path);

      const item = document.createElement('div');
      item.className = 'media-item';

      const thumb = document.createElement('div');
      thumb.className = 'media-thumbnail';

      const fallback = document.createElement('div');
      fallback.className = 'media-fallback';
      fallback.textContent = name;
      thumb.appendChild(fallback);

      if (this.isImage(file) && fileUrl) {
        const img = document.createElement('img');
        img.alt = name;
        img.loading = 'lazy';
        img.addEventListener('error', () => { img.style.display = 'none'; });
        img.addEventListener('load', () => { fallback.style.display = 'none'; });
        img.src = fileUrl;
        thumb.appendChild(img);
      }
      item.appendChild(thumb);

      const info = document.createElement('div');
      info.className = 'media-info';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'media-name';
      nameSpan.textContent = name;
      nameSpan.title = name;
      info.appendChild(nameSpan);

      const actions = document.createElement('div');
      actions.className = 'media-actions';

      if (typeof options.onSelect === 'function') {
        const selectButton = document.createElement('button');
        selectButton.type = 'button';
        selectButton.className = 'media-action-btn select-btn';
        selectButton.textContent = '✓ Seleccionar';
        selectButton.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onSelect({
            ...file,
            url: fileUrl,
            absoluteUrl: new URL(fileUrl, window.location.origin).href
          });
          if (typeof options.onClose === 'function') options.onClose();
        });
        actions.appendChild(selectButton);
      }

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'media-action-btn delete-btn';
      deleteButton.textContent = '🗑️ Eliminar';
      deleteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        const confirmed = await notifications.confirm(
          `¿Eliminar el archivo "${name}"? Esta acción no se puede deshacer.`,
          'Eliminar',
          'Cancelar'
        );
        if (!confirmed) return;

        deleteButton.disabled = true;
        deleteButton.textContent = '⏳ Eliminando...';
        try {
          await this.deleteFile(file.id || file.path);
          item.remove();
          notifications.success('Archivo eliminado correctamente');
          if (mediaGrid.children.length === 0) this.renderMediaItems([], mediaGrid, options);
        } catch (error) {
          console.error('Error al eliminar archivo:', error);
          notifications.error(`Error al eliminar el archivo: ${error.message}`);
          deleteButton.disabled = false;
          deleteButton.textContent = '🗑️ Eliminar';
        }
      });
      actions.appendChild(deleteButton);

      info.appendChild(actions);
      item.appendChild(info);
      mediaGrid.appendChild(item);
    }
  }

  /**
   * Abre el selector modal de archivos multimedia.
   * @param {{ onSelect?: Function }} options
   */
  openMediaBrowser(options = {}) {
    let modal = document.getElementById('media-browser-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'media-browser-modal';
      modal.className = 'modal';
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>Seleccionar archivo multimedia</h3>
            <button type="button" class="close-modal" aria-label="Cerrar">&times;</button>
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
      document.body.appendChild(modal);
      modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    const close = () => { modal.style.display = 'none'; };
    const grid = modal.querySelector('.media-browser-grid');
    const loading = modal.querySelector('.media-browser-loading');
    const oldSearch = modal.querySelector('.search-input');

    // Reemplazar el input para descartar listeners de aperturas anteriores
    const searchInput = oldSearch.cloneNode(true);
    searchInput.value = '';
    oldSearch.replaceWith(searchInput);

    modal.style.display = 'block';
    grid.replaceChildren();
    grid.style.display = 'none';
    loading.style.display = 'block';

    const renderOptions = { ...options, onClose: close };
    let allFiles = [];

    const renderFiltered = (query) => {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const filtered = allFiles.filter(file => {
        const haystack = `${file.name || ''} ${file.path || ''}`.toLowerCase();
        return terms.every(term => haystack.includes(term));
      });
      if (filtered.length === 0 && terms.length > 0) {
        grid.replaceChildren();
        const empty = document.createElement('p');
        empty.className = 'no-media';
        empty.textContent = `No se encontraron archivos para "${query}".`;
        grid.appendChild(empty);
        return;
      }
      this.renderMediaItems(filtered, grid, renderOptions);
    };

    searchInput.addEventListener('input', (e) => renderFiltered(e.target.value.trim()));

    this.getMediaFiles()
      .then(files => {
        allFiles = files;
        loading.style.display = 'none';
        grid.style.display = 'grid';
        this.renderMediaItems(files, grid, renderOptions);
      })
      .catch(error => {
        console.error('Error al cargar archivos multimedia:', error);
        loading.style.display = 'none';
        grid.style.display = 'block';
        grid.replaceChildren();
        const msg = document.createElement('p');
        msg.className = 'error-message';
        msg.textContent = 'Error al cargar los archivos multimedia.';
        grid.appendChild(msg);
      });
  }
}

// Estilos del selector (una sola vez)
if (!document.getElementById('media-actions-styles')) {
  const style = document.createElement('style');
  style.id = 'media-actions-styles';
  style.textContent = `
    .media-browser-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; padding: 16px; }
    .media-item { position: relative; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #fff; }
    .media-thumbnail { position: relative; height: 150px; background: #f7fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .media-thumbnail img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; background: #fff; }
    .media-fallback { padding: 8px; font-size: 0.75rem; color: #4a5568; text-align: center; word-break: break-word; }
    .media-info { padding: 8px; }
    .media-name { font-size: 0.875rem; font-weight: 500; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .media-actions { display: flex; gap: 5px; margin-top: 5px; }
    .media-action-btn { flex: 1; padding: 4px 8px; font-size: 0.75rem; border: 1px solid #e2e8f0; background: #fff; border-radius: 4px; cursor: pointer; }
    .media-action-btn:disabled { opacity: 0.6; cursor: wait; }
    .select-btn { background: #ebf8ff; border-color: #bee3f8; color: #2b6cb0; }
    .delete-btn { background: #fff5f5; border-color: #fed7d7; color: #c53030; }
    .search-container { padding: 16px; border-bottom: 1px solid #e2e8f0; }
    .search-input { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px; }
    .no-media, .error-message, .media-browser-loading { padding: 16px; text-align: center; color: #718096; }
    .error-message { color: #e53e3e; }
  `;
  document.head.appendChild(style);
}
