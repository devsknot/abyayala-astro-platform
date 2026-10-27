import { ALLOWED_UPLOAD_TYPES } from '../../media-manager.js';
import { icon } from '../../utils/icons.js';
import { slugify, localDateInputValue } from '../../utils/format.js';

/**
 * Configura los eventos del gestor de artículos (se llama una sola vez tras render()).
 */
export function setupEvents() {
  try {
    const $ = (selector) => this.container.querySelector(selector);

    $('.create-article-btn')?.addEventListener('click', () => this.createArticle());
    $('.back-to-list-btn')?.addEventListener('click', () => this.showArticlesList());
    $('.cancel-btn')?.addEventListener('click', () => this.showArticlesList());

    $('.article-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.saveArticle();
    });

    // Búsqueda y filtro de categoría (con debounce)
    const searchInput = $('#article-search');
    const categoryFilter = $('#category-filter');
    let searchTimeout = null;

    const runSearch = () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = null;
      this.loadArticles(1, categoryFilter ? categoryFilter.value : '', searchInput ? searchInput.value.trim() : '');
    };
    const debouncedSearch = () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(runSearch, 500);
    };

    categoryFilter?.addEventListener('change', debouncedSearch);
    $('#search-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      runSearch();
    });
    if (searchInput) {
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          runSearch();
        }
      });
      searchInput.addEventListener('input', debouncedSearch);
    }

    $('#clear-filters')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (categoryFilter) categoryFilter.value = '';
      runSearch();
    });

    // Generación automática del slug a partir del título (solo artículos nuevos)
    const titleInput = $('#article-title');
    const slugInput = $('#article-slug');
    if (titleInput && slugInput) {
      titleInput.addEventListener('input', () => {
        if (slugInput.readOnly) return;
        if (!slugInput.dataset.edited || slugInput.dataset.edited === 'false') {
          slugInput.value = this.generateSlug(titleInput.value.trim());
        }
      });
      slugInput.addEventListener('input', () => {
        slugInput.dataset.edited = 'true';
      });
    }

    // Selector de archivo oculto para subir la imagen destacada
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = ALLOWED_UPLOAD_TYPES.join(',');
    fileInput.style.display = 'none';
    this.container.appendChild(fileInput);
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      fileInput.value = '';
      if (file) this.handleImageUpload(file);
    });

    // Botón para seleccionar imagen destacada: biblioteca o subida
    $('.select-image-btn')?.addEventListener('click', () => {
      if (!this.mediaManager) return;

      const trigger = $('.select-image-btn');
      const dialog = document.createElement('div');
      dialog.className = 'modal-backdrop is-visible image-selection-dialog';
      dialog.innerHTML = `
        <div class="modal-panel modal-sm" role="dialog" aria-modal="true" aria-labelledby="image-dialog-title">
          <div class="modal-header">
            <h2 class="modal-title" id="image-dialog-title">Imagen destacada</h2>
            <button type="button" class="btn-icon dialog-close" aria-label="Cerrar">${icon('close')}</button>
          </div>
          <div class="modal-body">
            <div class="option-list">
              <button type="button" class="option-card dialog-option" data-action="library">
                <span class="option-icon">${icon('media', { size: 22 })}</span>
                <span><strong>Elegir de la biblioteca</strong><small>Usa una imagen ya subida.</small></span>
              </button>
              <button type="button" class="option-card dialog-option" data-action="upload">
                <span class="option-icon">${icon('upload', { size: 22 })}</span>
                <span><strong>Subir una imagen nueva</strong><small>JPG, PNG, GIF, WebP o AVIF · máx. 10 MB.</small></span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
      dialog.querySelector('.dialog-option').focus();

      const closeDialog = () => {
        document.removeEventListener('keydown', onKeydown, true);
        dialog.remove();
      };
      const onKeydown = (e) => {
        if (e.key === 'Escape') {
          closeDialog();
          trigger?.focus();
        }
      };
      document.addEventListener('keydown', onKeydown, true);

      dialog.addEventListener('click', (e) => {
        const option = e.target.closest('.dialog-option');
        const closing = option || e.target.closest('.dialog-close') || e.target === dialog;
        if (!closing) return;
        closeDialog();
        if (!option) trigger?.focus();

        if (option?.dataset.action === 'library') {
          this.mediaManager.openMediaBrowser({
            onSelect: (media) => {
              if (media && media.url) this.handleSelectedMedia(media);
            }
          });
        } else if (option?.dataset.action === 'upload') {
          fileInput.click();
        }
      });
    });

    // Botón para quitar la imagen destacada
    $('.remove-image-btn')?.addEventListener('click', () => this.loadFeaturedImage(''));
  } catch (error) {
    console.error('Error al configurar eventos:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al configurar eventos del gestor de artículos');
    }
  }
}

/**
 * Aplica una imagen elegida en la biblioteca como imagen destacada
 * @param {{ url: string }} media
 */
export function handleSelectedMedia(media) {
  this.loadFeaturedImage(media.url);
}

/**
 * Sube una imagen y la usa como imagen destacada
 * @param {File} file
 */
export async function handleImageUpload(file) {
  this.showLoading('Subiendo imagen...');
  try {
    const response = await this.mediaManager.uploadMedia(file);
    if (!response || !response.url) {
      throw new Error('No se recibió una URL válida después de la carga');
    }
    this.handleSelectedMedia(response);
    if (this.notificationManager) this.notificationManager.success('Imagen subida correctamente');
  } catch (error) {
    console.error('Error al subir imagen:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al subir la imagen: ' + (error.message || 'Error desconocido'));
    }
  } finally {
    this.hideLoading();
  }
}

/**
 * Genera un slug a partir de un texto
 * @param {string} text - Texto a convertir en slug
 * @returns {string} Slug generado
 */
export function generateSlug(text) {
  return slugify(text, 60);
}

/**
 * Guarda un artículo (nuevo o existente)
 */
export async function saveArticle() {
  const $ = (selector) => this.container.querySelector(selector);
  const titleInput = $('#article-title');
  const slugInput = $('#article-slug');
  if (!titleInput || !slugInput) return;

  const title = titleInput.value.trim();
  const slug = slugInput.value.trim();

  if (!title) {
    this.notificationManager.warning('Por favor ingrese un título para el artículo');
    titleInput.focus();
    return;
  }
  if (!slug) {
    this.notificationManager.warning('Por favor ingrese un slug para el artículo');
    slugInput.focus();
    return;
  }

  this.showLoading('Guardando artículo...');
  try {
    // Esperar a que terminen las subidas de imágenes pegadas en el editor
    if (this.editor && this.editor.uploadPending) await this.editor.uploadPending();
    const content = this.editor ? this.editor.getContent() : '';

    if (/<img[^>]+src=["']?data:/i.test(content)) {
      this.notificationManager.warning('El contenido tiene imágenes incrustadas que no se pudieron subir. Súbelas desde la biblioteca de medios e inténtalo de nuevo.');
      return;
    }

    const authorSelect = $('#article-author');
    const authorValue = authorSelect ? authorSelect.value : '';
    const tagsInput = $('#article-tags');
    const featuredImageInput = $('#article-featured-image');
    const dateInput = $('#article-date');

    const articleData = {
      title,
      description: ($('#article-description')?.value || '').trim(),
      category: $('#article-category')?.value || '',
      pubDate: dateInput && dateInput.value ? dateInput.value : localDateInputValue(),
      content,
      author_id: authorValue ? Number(authorValue) : null,
      // Siempre se envían para poder vaciarlos
      tags: tagsInput ? tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      featured_image: featuredImageInput ? featuredImageInput.value : ''
    };

    if (this.currentArticle) {
      // El slug no cambia al actualizar: se usa el original en la URL
      await this.contentManager.updateArticle(this.currentArticle.slug, articleData);
      this.notificationManager.success('Artículo actualizado con éxito');
    } else {
      await this.contentManager.createArticle({ ...articleData, slug });
      this.notificationManager.success('Artículo creado con éxito');
    }

    this.showArticlesList();
    await this.loadArticles(this.currentPage, this.currentCategory, this.currentSearch);
  } catch (error) {
    console.error('Error al guardar artículo:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al guardar el artículo: ' + (error.message || ''));
    }
  } finally {
    this.hideLoading();
  }
}
