import { safeUrl } from '../../utils/html.js';
import { icon } from '../../utils/icons.js';
import { localDateInputValue } from '../../utils/format.js';
import { ALLOWED_UPLOAD_TYPES } from '../../media-manager.js';

const EDITOR_ID = 'tinymce-editor';
const PLACEHOLDER_HTML = `<div class="featured-placeholder">${icon('image', { size: 28 })}<span>No hay imagen seleccionada</span></div>`;

/**
 * Destruye la instancia de TinyMCE del editor de artículos, si existe.
 */
export function destroyEditor() {
  if (typeof tinymce !== 'undefined') {
    const instance = tinymce.get(EDITOR_ID);
    if (instance) instance.remove();
  }
  this.editor = null;
}

/**
 * Edita un artículo existente
 * @param {string} slug - Slug del artículo a editar
 */
export async function editArticle(slug) {
  this.showLoading('Cargando artículo...');

  try {
    // Cargar autores y el artículo en paralelo
    const [, article] = await Promise.all([
      this.loadAuthors(),
      this.contentManager.getArticle(slug)
    ]);

    if (!article) {
      throw new Error('Artículo no encontrado');
    }

    this.showArticleEditor();
    this.currentArticle = article;
    this.setupEditorInterface();
    this.loadArticleDataIntoForm(article);
  } catch (error) {
    console.error('Error al cargar artículo:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al cargar el artículo: ' + (error.message || 'Error desconocido'));
    }
    this.hideLoading();
  }
}

/**
 * Configura la interfaz del editor para editar un artículo existente
 */
export function setupEditorInterface() {
  const editorTitle = this.container.querySelector('.article-editor h3');
  if (editorTitle) editorTitle.textContent = 'Editar artículo';
}

/**
 * Carga los datos de un artículo en el formulario de edición
 * @param {Object} article - Datos del artículo a cargar
 */
export function loadArticleDataIntoForm(article) {
  if (!article) return;

  try {
    const titleInput = this.container.querySelector('#article-title');
    const descriptionInput = this.container.querySelector('#article-description');
    const categorySelect = this.container.querySelector('#article-category');
    const dateInput = this.container.querySelector('#article-date');
    const slugInput = this.container.querySelector('#article-slug');
    const authorSelect = this.container.querySelector('#article-author');
    const tagsInput = this.container.querySelector('#article-tags');

    if (!titleInput || !descriptionInput || !categorySelect || !dateInput || !slugInput) {
      console.error('No se encontraron todos los elementos del formulario');
      if (this.notificationManager) this.notificationManager.error('Error al cargar el formulario');
      this.hideLoading();
      return;
    }

    titleInput.value = article.title || '';
    descriptionInput.value = article.description || '';

    // Si la categoría guardada no está en la lista (borrada o heredada), se añade
    // una opción temporal para no cambiarla en silencio al guardar.
    categorySelect.querySelectorAll('option[data-missing]').forEach(option => option.remove());
    const category = article.category || '';
    categorySelect.value = category;
    if (category && categorySelect.value !== category) {
      const option = document.createElement('option');
      option.value = category;
      option.dataset.missing = 'true';
      option.textContent = `${category} (no existe en Categorías)`;
      categorySelect.appendChild(option);
      categorySelect.value = category;
    }

    // El slug no se puede cambiar en artículos existentes (la API lo rechaza)
    slugInput.value = article.slug || '';
    slugInput.dataset.edited = 'true';
    slugInput.readOnly = true;
    slugInput.classList.add('bg-gray-100');

    this.setDateInputValue(dateInput, article.pub_date || article.pubDate);

    if (authorSelect) {
      const authorId = article.author_id ?? article.author_info?.id ?? '';
      authorSelect.value = authorId === null ? '' : String(authorId);
      // Si el autor ya no existe en la lista, queda sin seleccionar (no se asigna otro)
      if (authorSelect.value !== String(authorId ?? '')) authorSelect.value = '';
    }

    if (tagsInput) {
      tagsInput.value = Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || '');
    }

    this.loadFeaturedImage(article.featured_image || '');

    const content = typeof article.content === 'string' ? article.content : '';
    this.initializeEditor(content);
  } catch (error) {
    console.error('Error al cargar datos en el formulario:', error);
    if (this.notificationManager) this.notificationManager.error('Error al cargar los datos del artículo');
    this.hideLoading();
  }
}

/**
 * Formatea y establece el valor de la fecha en el input
 * @param {HTMLInputElement} dateInput - Input de fecha
 * @param {string} pubDate - Fecha de publicación
 */
export function setDateInputValue(dateInput, pubDate) {
  dateInput.value = localDateInputValue(pubDate);
}

/**
 * Devuelve (creándolo si hace falta) el input oculto con la imagen destacada
 */
function getFeaturedImageInput() {
  let input = this.container.querySelector('#article-featured-image');
  if (!input) {
    const container = this.container.querySelector('.featured-image-container');
    if (!container) return null;
    input = document.createElement('input');
    input.type = 'hidden';
    input.id = 'article-featured-image';
    input.name = 'featured_image';
    container.appendChild(input);
  }
  return input;
}

/**
 * Carga la imagen destacada en la vista previa y en el input oculto.
 * El valor guardado se conserva tal cual; solo la vista previa normaliza la URL.
 * @param {string} featuredImage - URL o ruta de la imagen destacada ('' para limpiar)
 */
export function loadFeaturedImage(featuredImage) {
  const preview = this.container.querySelector('.featured-image-preview');
  const input = getFeaturedImageInput.call(this);
  const removeImageBtn = this.container.querySelector('.remove-image-btn');

  if (input) input.value = featuredImage || '';

  if (featuredImage) {
    if (preview) this.updateFeaturedImagePreview(featuredImage, preview);
    if (removeImageBtn) removeImageBtn.style.display = 'inline-block';
  } else {
    if (preview) preview.innerHTML = PLACEHOLDER_HTML;
    if (removeImageBtn) removeImageBtn.style.display = 'none';
  }
}

/**
 * Convierte una ruta guardada en la BD en una URL utilizable para la vista previa
 * @param {string} value
 */
function previewUrlFor(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return safeUrl(trimmed);
  // Clave de R2 sin barra inicial
  return safeUrl(`/api/media/${trimmed}`);
}

/**
 * Actualiza la vista previa de la imagen destacada
 * @param {string} imageUrl - URL de la imagen destacada
 * @param {HTMLElement} previewElement - Elemento donde mostrar la vista previa
 */
export function updateFeaturedImagePreview(imageUrl, previewElement) {
  if (!previewElement) return;

  const url = previewUrlFor(imageUrl);
  previewElement.replaceChildren();

  if (!url) {
    previewElement.innerHTML = PLACEHOLDER_HTML;
    return;
  }

  const status = document.createElement('span');
  status.className = 'skeleton skeleton-media';
  status.setAttribute('aria-label', 'Cargando imagen');
  previewElement.appendChild(status);

  const img = document.createElement('img');
  img.alt = 'Imagen destacada';
  img.className = 'featured-image';

  img.addEventListener('load', () => {
    previewElement.replaceChildren(img);
  });
  img.addEventListener('error', () => {
    const box = document.createElement('div');
    box.className = 'featured-error';
    const title = document.createElement('p');
    title.className = 'featured-error-title';
    title.textContent = 'No se pudo cargar la imagen';
    const detail = document.createElement('small');
    detail.textContent = String(imageUrl);
    box.append(title, detail);
    previewElement.replaceChildren(box);
  });

  img.src = url;
}

/**
 * Inicializa el editor de contenido con TinyMCE
 * @param {string} content - Contenido a cargar en el editor
 */
export function initializeEditor(content = '') {
  try {
    const editorContainer = this.container.querySelector('.editor-container');
    if (!editorContainer) {
      console.error('No se encontró el contenedor del editor');
      this.hideLoading();
      return;
    }

    // Primero destruir la instancia previa (comparte id con el nuevo textarea)
    this.destroyEditor();
    editorContainer.replaceChildren();

    const textarea = document.createElement('textarea');
    textarea.id = EDITOR_ID;
    textarea.value = content;
    editorContainer.appendChild(textarea);

    const mediaManager = this.mediaManager;

    tinymce.init({
      target: textarea,
      height: 500,
      menubar: false,
      language: 'es',

      plugins: [
        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
        'insertdatetime', 'media', 'table', 'help', 'wordcount'
      ],

      toolbar: 'undo redo | blocks | ' +
        'bold italic forecolor | alignleft aligncenter ' +
        'alignright alignjustify | bullist numlist outdent indent | ' +
        'image media link | removeformat | code | help',

      // Selector de imágenes de la biblioteca de medios
      file_picker_types: 'image',
      file_picker_callback: (callback, value, meta) => {
        if (meta.filetype === 'image') this.openMediaLibraryForTinyMCE(callback);
      },

      // Las imágenes pegadas o arrastradas se suben a R2 y se sustituyen por su URL,
      // en lugar de quedar incrustadas en base64 dentro del HTML del artículo.
      automatic_uploads: true,
      paste_data_images: true,
      images_file_types: 'jpeg,jpg,png,gif,webp,avif',
      images_upload_handler: async (blobInfo) => {
        const blob = blobInfo.blob();
        const file = new File([blob], blobInfo.filename(), { type: blob.type });
        const result = await mediaManager.uploadMedia(file);
        if (!result.url) throw new Error('No se recibió la URL de la imagen');
        return result.url;
      },

      content_style: `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; padding: 10px; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
        p { margin-bottom: 1rem; }
        h2 { font-size: 1.5rem; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; }
        h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.75rem; }
      `,

      // Sin manejadores de eventos (on*): el HTML del artículo no debe llevar JS
      extended_valid_elements: 'img[class|src|alt|title|width|height|style|loading]',
      invalid_elements: 'script,object,embed',

      relative_urls: false,
      remove_script_host: false,
      convert_urls: true,

      setup: (editor) => {
        editor.on('init', () => {
          editor.setContent(content || '');
          this.hideLoading();
        });
      }
    });

    this.editor = {
      setContent: (c) => {
        const ed = tinymce.get(EDITOR_ID);
        if (ed) ed.setContent(c || '');
      },
      getContent: () => {
        const ed = tinymce.get(EDITOR_ID);
        return ed ? ed.getContent() : '';
      },
      // Espera a que terminen las subidas de imágenes pendientes
      uploadPending: async () => {
        const ed = tinymce.get(EDITOR_ID);
        if (ed) await ed.uploadImages();
      },
      destroy: () => this.destroyEditor()
    };
  } catch (error) {
    console.error('Error al inicializar TinyMCE:', error);
    if (this.notificationManager) this.notificationManager.error('Error al inicializar el editor');
    this.hideLoading();
  }
}

/**
 * Abre la biblioteca de medios para seleccionar una imagen desde TinyMCE
 * @param {Function} callback - Función callback de TinyMCE para devolver la URL
 */
export function openMediaLibraryForTinyMCE(callback) {
  const previousFocus = document.activeElement;
  const modal = document.createElement('div');
  // Por encima de los diálogos de TinyMCE (z-index ~1300)
  modal.className = 'modal-backdrop is-visible modal-over-tinymce tinymce-media-modal';

  modal.innerHTML = `
    <div class="modal-panel modal-lg" role="dialog" aria-modal="true" aria-labelledby="tinymce-media-title">
      <div class="modal-header">
        <h2 class="modal-title" id="tinymce-media-title">Seleccionar imagen</h2>
        <button type="button" class="btn-icon close-media-modal" aria-label="Cerrar">${icon('close')}</button>
      </div>
      <div class="modal-body">
        <div class="media-loading view-loading" role="status"><span class="spinner" aria-hidden="true"></span><span>Cargando imágenes…</span></div>
        <div class="media-picker-grid" hidden></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };
  const close = () => {
    document.removeEventListener('keydown', onKeydown, true);
    modal.remove();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  };
  document.addEventListener('keydown', onKeydown, true);
  modal.querySelector('.close-media-modal').addEventListener('click', close);
  modal.querySelector('.close-media-modal').focus();
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  const loading = modal.querySelector('.media-loading');
  const grid = modal.querySelector('.media-picker-grid');

  const showMessage = (text, isError) => {
    loading.hidden = true;
    loading.style.display = 'none';
    grid.hidden = false;
    const p = document.createElement('p');
    p.className = isError ? 'empty-state text-danger grid-span-all' : 'empty-state grid-span-all';
    p.textContent = text;
    grid.replaceChildren(p);
  };

  this.mediaManager.getMediaFiles()
    .then(files => {
      const images = files.filter(file => ALLOWED_UPLOAD_TYPES.includes(file.type) || (file.type || '').startsWith('image/'));
      if (images.length === 0) {
        showMessage('No hay imágenes disponibles', false);
        return;
      }

      loading.hidden = true;
      loading.style.display = 'none';
      grid.hidden = false;

      for (const file of images) {
        const url = this.mediaManager.getPublicUrl(file.id);
        if (!url) continue;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'media-picker-item';
        item.title = file.name || '';

        const img = document.createElement('img');
        img.src = url;
        img.alt = file.name || 'Imagen';
        img.loading = 'lazy';

        item.addEventListener('click', () => {
          callback(url, { alt: file.name || '' });
          close();
        });

        item.appendChild(img);
        grid.appendChild(item);
      }
    })
    .catch(error => {
      console.error('Error al cargar imágenes:', error);
      showMessage('Error al cargar imágenes', true);
    });
}

/**
 * Prepara el formulario para crear un nuevo artículo
 */
export function createArticle() {
  try {
    this.showArticleEditor();

    const editorTitle = this.container.querySelector('.article-editor h3');
    if (editorTitle) editorTitle.textContent = 'Crear artículo';

    this.currentArticle = null;

    const articleForm = this.container.querySelector('.article-form');
    if (articleForm) {
      articleForm.reset();

      const slugInput = articleForm.querySelector('#article-slug');
      if (slugInput) {
        slugInput.value = '';
        slugInput.dataset.edited = 'false';
        slugInput.readOnly = false;
        slugInput.classList.remove('bg-gray-100');
      }

      const dateInput = articleForm.querySelector('#article-date');
      if (dateInput) dateInput.value = localDateInputValue();

      // Quitar opciones temporales de categorías inexistentes de una edición anterior
      articleForm.querySelectorAll('#article-category option[data-missing]').forEach(option => option.remove());
    }

    this.loadFeaturedImage('');
    this.initializeEditor('');
  } catch (error) {
    console.error('Error al crear nuevo artículo:', error);
    if (this.notificationManager) this.notificationManager.error('Error al crear nuevo artículo');
  }
}

/**
 * Elimina un artículo
 * @param {string} slug - Slug del artículo a eliminar
 */
export async function deleteArticle(slug) {
  this.showLoading('Eliminando artículo...');
  let shouldReload = false;

  try {
    await this.contentManager.deleteArticle(slug);
    shouldReload = true;
    if (this.notificationManager) this.notificationManager.success('Artículo eliminado con éxito');
  } catch (error) {
    if (error.status === 404) {
      shouldReload = true;
      if (this.notificationManager) this.notificationManager.info('El artículo ya fue eliminado o no existe');
    } else {
      console.error('Error al eliminar artículo:', error);
      if (this.notificationManager) {
        this.notificationManager.error('Error al eliminar el artículo: ' + (error.message || ''));
      }
    }
  } finally {
    this.hideLoading();
  }

  if (shouldReload) {
    await this.loadArticles(this.currentPage, this.currentCategory, this.currentSearch);
  }
}
