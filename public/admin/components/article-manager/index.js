import { setupEvents, saveArticle, generateSlug, handleSelectedMedia, handleImageUpload } from './events.js';
import { renderArticlesList, showArticlesList, showArticleEditor, renderArticles, renderPagination, setupArticleCardEvents } from './list.js';
import {
  editArticle, createArticle, deleteArticle, updateFeaturedImagePreview, setupEditorInterface,
  loadArticleDataIntoForm, setDateInputValue, loadFeaturedImage, initializeEditor,
  openMediaLibraryForTinyMCE, destroyEditor
} from './editor.js';
import { loadCategories } from './categories.js';
import { loadAuthors } from './authors.js';
import { showLoading, hideLoading } from './ui.js';

// Estilos del componente (una sola vez)
if (!document.getElementById('article-manager-styles')) {
  const styles = document.createElement('link');
  styles.id = 'article-manager-styles';
  styles.rel = 'stylesheet';
  styles.href = '/admin/components/article-manager/styles.css';
  document.head.appendChild(styles);
}

/**
 * Clase principal para la gestión de artículos en el CMS
 */
export class ArticleManager {
  /**
   * @param {HTMLElement} container - Contenedor donde se renderizará el gestor
   * @param {Object} options - { contentManager, mediaManager, notificationManager }
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.contentManager = options.contentManager || null;
    this.mediaManager = options.mediaManager || null;
    this.notificationManager = options.notificationManager || null;

    this.articles = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.pageSize = 10;
    this.currentCategory = '';
    this.currentSearch = '';
    this.currentArticle = null;
    this.editor = null;
    // Identificador de la última petición de lista: descarta respuestas viejas
    this.loadRequestId = 0;

    this.render = this.render.bind(this);
    this.loadArticles = this.loadArticles.bind(this);
    this.loadAuthors = loadAuthors.bind(this);
    this.loadCategories = loadCategories.bind(this);
    this.renderArticles = renderArticles.bind(this);
    this.renderArticlesList = renderArticlesList.bind(this);
    this.renderPagination = renderPagination.bind(this);
    this.setupArticleCardEvents = setupArticleCardEvents.bind(this);
    this.showArticlesList = showArticlesList.bind(this);
    this.showArticleEditor = showArticleEditor.bind(this);
    this.editArticle = editArticle.bind(this);
    this.createArticle = createArticle.bind(this);
    this.deleteArticle = deleteArticle.bind(this);
    this.updateFeaturedImagePreview = updateFeaturedImagePreview.bind(this);
    this.setupEditorInterface = setupEditorInterface.bind(this);
    this.loadArticleDataIntoForm = loadArticleDataIntoForm.bind(this);
    this.setDateInputValue = setDateInputValue.bind(this);
    this.loadFeaturedImage = loadFeaturedImage.bind(this);
    this.initializeEditor = initializeEditor.bind(this);
    this.openMediaLibraryForTinyMCE = openMediaLibraryForTinyMCE.bind(this);
    this.destroyEditor = destroyEditor.bind(this);
    this.showLoading = showLoading.bind(this);
    this.hideLoading = hideLoading.bind(this);
    this.setupEvents = setupEvents.bind(this);
    this.saveArticle = saveArticle.bind(this);
    this.generateSlug = generateSlug.bind(this);
    this.handleSelectedMedia = handleSelectedMedia.bind(this);
    this.handleImageUpload = handleImageUpload.bind(this);
  }

  /**
   * Inicializa el gestor de artículos
   */
  async init() {
    if (!this.contentManager) {
      console.error('ContentManager no proporcionado');
      if (this.notificationManager) {
        this.notificationManager.error('Error al inicializar el gestor de artículos: ContentManager no disponible');
      }
      return;
    }

    this.render();
    this.setupEvents();
    await Promise.all([this.loadCategories(), this.loadAuthors()]);
    await this.loadArticles();
  }

  /**
   * Libera recursos al salir de la vista (TinyMCE, overlays)
   */
  destroy() {
    this.loadRequestId++;
    this.destroyEditor();
    this.hideLoading();
  }

  /**
   * Renderiza la estructura base del gestor de artículos
   */
  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="article-manager">
        <div class="articles-list active">
          <div class="header">
            <h3>Artículos</h3>
            <button type="button" class="create-article-btn primary-btn">Nuevo Artículo</button>
          </div>

          <div class="filters">
            <div class="search-container">
              <input type="text" id="article-search" placeholder="Buscar artículos...">
              <button type="button" id="search-btn" class="secondary-btn">Buscar</button>
            </div>

            <div class="category-filter-container">
              <select id="category-filter">
                <option value="">Todas las categorías</option>
              </select>
              <button type="button" id="clear-filters" class="text-btn">Limpiar filtros</button>
            </div>
          </div>

          <div class="articles-container">
            <div class="loading">Cargando artículos...</div>
            <div class="articles-grid"></div>
            <div class="pagination"></div>
          </div>
        </div>

        <div class="article-editor">
          <div class="header">
            <h3>Crear artículo</h3>
            <button type="button" class="back-to-list-btn secondary-btn">Volver a la lista</button>
          </div>

          <form class="article-form">
            <div class="form-group">
              <label class="form-label" for="article-title">Título</label>
              <input type="text" id="article-title" name="title" required>
            </div>

            <div class="form-group">
              <label class="form-label" for="article-description">Descripción</label>
              <textarea id="article-description" name="description" rows="3"></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="article-category">Categoría</label>
                <select id="article-category" name="category">
                  <option value="">Seleccionar categoría</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="article-date">Fecha de publicación</label>
                <input type="date" id="article-date" name="pubDate">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="article-author">Autor</label>
                <select id="article-author" name="author_id">
                  <option value="">Seleccionar autor</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="article-slug">Slug</label>
                <input type="text" id="article-slug" name="slug">
                <small class="form-text text-muted">Identificador único para la URL del artículo. No se puede cambiar después de crearlo.</small>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="article-tags">Etiquetas</label>
              <input type="text" id="article-tags" name="tags" placeholder="Separadas por comas">
              <small class="form-text text-muted">Ejemplo: tecnología, ciencia, innovación</small>
            </div>

            <div class="form-group featured-image-container">
              <label class="form-label">Imagen destacada</label>
              <div class="featured-image-preview">
                <span class="text-gray-500">No hay imagen seleccionada</span>
              </div>
              <input type="hidden" id="article-featured-image" name="featured_image" value="">
              <button type="button" class="select-image-btn secondary-btn mt-2">Seleccionar imagen</button>
              <button type="button" class="remove-image-btn text-btn mt-2" style="display: none;">Eliminar imagen</button>
            </div>

            <div class="form-group mt-4">
              <label class="form-label">Contenido</label>
              <div class="editor-container border rounded-lg p-2 min-h-[300px]"></div>
            </div>

            <div class="form-actions mt-4">
              <button type="submit" class="save-article-btn primary-btn">Guardar artículo</button>
              <button type="button" class="cancel-btn secondary-btn">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  /**
   * Carga los artículos desde la API
   * @param {number} page - Número de página a cargar
   * @param {string} category - Categoría a filtrar (opcional)
   * @param {string} search - Búsqueda a aplicar (opcional)
   */
  async loadArticles(page = 1, category = '', search = '') {
    const requestId = ++this.loadRequestId;
    this.showLoading('Cargando artículos...');

    this.currentCategory = category || '';
    this.currentSearch = search || '';

    try {
      const response = await this.contentManager.getArticles({
        page: parseInt(page, 10) || 1,
        pageSize: this.pageSize,
        category: this.currentCategory,
        search: this.currentSearch
      });

      // Otra búsqueda empezó mientras esperábamos: descartar este resultado
      if (requestId !== this.loadRequestId) return;

      const articles = Array.isArray(response?.articles) ? response.articles : [];
      const pagination = response?.pagination || {};

      this.articles = articles;
      this.currentPage = pagination.page || parseInt(page, 10) || 1;
      this.totalPages = pagination.totalPages || 1;

      const articlesGrid = this.container.querySelector('.articles-grid');
      if (articlesGrid) {
        articlesGrid.style.display = 'grid';
        articlesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        articlesGrid.style.gap = '1.5rem';
        articlesGrid.style.width = '100%';
      }

      this.renderArticles(articles, {
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        category: this.currentCategory
      });
    } catch (error) {
      if (requestId !== this.loadRequestId) return;
      console.error('Error al cargar artículos:', error);
      if (this.notificationManager) this.notificationManager.error('Error al cargar los artículos');

      const articlesGrid = this.container.querySelector('.articles-grid');
      if (articlesGrid) {
        articlesGrid.innerHTML = `
          <div class="error-message">
            <p>No se pudieron cargar los artículos. Intente nuevamente.</p>
            <button type="button" class="retry-btn primary-btn">Reintentar</button>
          </div>
        `;
        articlesGrid.querySelector('.retry-btn').addEventListener('click', () => {
          this.loadArticles(this.currentPage, this.currentCategory, this.currentSearch);
        });
      }
    } finally {
      if (requestId === this.loadRequestId) this.hideLoading();
    }
  }
}
