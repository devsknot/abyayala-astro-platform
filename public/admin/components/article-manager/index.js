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
import { icon } from '../../utils/icons.js';

// Los estilos del gestor viven en /admin/style.css (sistema de diseño común)
const SKELETON_CARDS = '<div class="article-card skeleton-card" aria-hidden="true"><span class="skeleton skeleton-media"></span><div class="article-content"><span class="skeleton skeleton-title"></span><span class="skeleton skeleton-text"></span><span class="skeleton skeleton-text w-2/3"></span></div></div>'.repeat(6);

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
    await this.loadArticles(1, this.options.initialCategory || '');
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
          <div class="page-header">
            <div>
              <h2 class="page-title">Artículos</h2>
              <p class="page-subtitle">Crea, edita y publica las noticias del sitio.</p>
            </div>
            <div class="page-actions">
              <button type="button" class="create-article-btn btn btn-primary">${icon('plus', { size: 18 })}<span>Nuevo artículo</span></button>
            </div>
          </div>

          <div class="toolbar card">
            <div class="search-field">
              ${icon('search', { size: 18, className: 'search-field-icon' })}
              <label for="article-search" class="sr-only">Buscar artículos</label>
              <input type="search" id="article-search" class="form-input" placeholder="Buscar por título o contenido…" autocomplete="off">
            </div>
            <button type="button" id="search-btn" class="btn btn-secondary">Buscar</button>
            <label for="category-filter" class="sr-only">Filtrar por categoría</label>
            <select id="category-filter" class="form-select toolbar-select">
              <option value="">Todas las categorías</option>
            </select>
            <button type="button" id="clear-filters" class="btn btn-link">Limpiar filtros</button>
          </div>

          <div class="articles-container">
            <div class="loading list-loading" role="status" style="display: none;"></div>
            <div class="articles-grid">${SKELETON_CARDS}</div>
            <div class="pagination"></div>
          </div>
        </div>

        <div class="article-editor">
          <div class="page-header">
            <div class="page-header-main">
              <button type="button" class="back-to-list-btn btn btn-ghost btn-sm">${icon('arrowLeft', { size: 18 })}<span>Volver a la lista</span></button>
              <h3 class="page-title">Crear artículo</h3>
            </div>
          </div>

          <form class="article-form" novalidate>
            <div class="editor-layout">
              <div class="editor-main">
                <div class="card">
                  <div class="card-body">
                    <div class="form-field">
                      <label class="form-label" for="article-title">Título <span class="required" aria-hidden="true">*</span></label>
                      <input type="text" id="article-title" name="title" class="form-input form-input-lg" required>
                    </div>

                    <div class="form-field">
                      <label class="form-label" for="article-description">Descripción</label>
                      <textarea id="article-description" name="description" rows="3" class="form-textarea"></textarea>
                      <p class="form-help">Resumen breve para listados, buscadores y redes sociales.</p>
                    </div>

                    <div class="form-field mb-0">
                      <span class="form-label" id="article-content-label">Contenido</span>
                      <div class="editor-container" aria-labelledby="article-content-label"></div>
                    </div>
                  </div>
                </div>
              </div>

              <aside class="editor-side">
                <div class="card">
                  <div class="card-header"><h4 class="card-title">Publicación</h4></div>
                  <div class="card-body">
                    <div class="form-field">
                      <label class="form-label" for="article-date">Fecha de publicación</label>
                      <input type="date" id="article-date" name="pubDate" class="form-input">
                    </div>

                    <div class="form-field">
                      <label class="form-label" for="article-category">Categoría</label>
                      <select id="article-category" name="category" class="form-select">
                        <option value="">Seleccionar categoría</option>
                      </select>
                    </div>

                    <div class="form-field">
                      <label class="form-label" for="article-author">Autor</label>
                      <select id="article-author" name="author_id" class="form-select">
                        <option value="">Seleccionar autor</option>
                      </select>
                    </div>

                    <div class="form-field">
                      <label class="form-label" for="article-slug">Slug <span class="required" aria-hidden="true">*</span></label>
                      <input type="text" id="article-slug" name="slug" class="form-input font-mono">
                      <p class="form-help">Identificador de la URL. No se puede cambiar después de crear el artículo.</p>
                    </div>

                    <div class="form-field mb-0">
                      <label class="form-label" for="article-tags">Etiquetas</label>
                      <input type="text" id="article-tags" name="tags" class="form-input" placeholder="Separadas por comas">
                      <p class="form-help">Ejemplo: agroecología, territorio, semillas</p>
                    </div>
                  </div>
                </div>

                <div class="card featured-image-container">
                  <div class="card-header"><h4 class="card-title">Imagen destacada</h4></div>
                  <div class="card-body">
                    <div class="featured-image-preview">
                      <span class="text-muted">No hay imagen seleccionada</span>
                    </div>
                    <input type="hidden" id="article-featured-image" name="featured_image" value="">
                    <div class="button-row">
                      <button type="button" class="select-image-btn btn btn-secondary btn-sm">${icon('image', { size: 16 })}<span>Seleccionar imagen</span></button>
                      <button type="button" class="remove-image-btn btn btn-ghost btn-sm text-danger" style="display: none;">${icon('trash', { size: 16 })}<span>Quitar</span></button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>

            <div class="form-actions sticky-actions">
              <button type="button" class="cancel-btn btn btn-secondary">Cancelar</button>
              <button type="submit" class="save-article-btn btn btn-primary">${icon('check', { size: 18 })}<span>Guardar artículo</span></button>
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
    // Carga de la lista: indicador en línea, sin overlay a pantalla completa
    this.showLoading('Cargando artículos…', false);

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

      this.renderArticles(articles, {
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        category: this.currentCategory
      });
    } catch (error) {
      if (requestId !== this.loadRequestId) return;
      console.error('Error al cargar artículos:', error);
      if (this.notificationManager && error.status !== 401) this.notificationManager.error('Error al cargar los artículos');

      const articlesGrid = this.container.querySelector('.articles-grid');
      const paginationContainer = this.container.querySelector('.pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
      if (articlesGrid) {
        articlesGrid.innerHTML = `
          <div class="state-card state-error grid-span-all" role="alert">
            <span class="state-icon">${icon('alert', { size: 28 })}</span>
            <h3 class="state-title">No se pudieron cargar los artículos</h3>
            <p class="state-text"></p>
            <button type="button" class="retry-btn btn btn-primary">${icon('refresh', { size: 18 })}<span>Reintentar</span></button>
          </div>
        `;
        articlesGrid.querySelector('.state-text').textContent = error.message || 'Inténtalo de nuevo.';
        articlesGrid.querySelector('.retry-btn').addEventListener('click', () => {
          this.loadArticles(this.currentPage, this.currentCategory, this.currentSearch);
        });
      }
    } finally {
      if (requestId === this.loadRequestId) this.hideLoading(false);
    }
  }
}
