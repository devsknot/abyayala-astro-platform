// Importar estilos del componente
const styles = document.createElement('link');
styles.rel = 'stylesheet';

// Obtener la base URL para construir una ruta absoluta que funcione en cualquier entorno
const baseUrl = window.location.origin;
const adminPath = window.location.pathname.split('/').filter(Boolean)[0] || 'admin';
styles.href = `${baseUrl}/${adminPath}/components/article-manager/styles.css`;

console.log(`Cargando estilos desde: ${styles.href}`);
document.head.appendChild(styles);

import { setupEvents, saveArticle } from './events.js';
import { renderArticlesList, showArticlesList, showArticleEditor, renderArticles, renderPagination, setupPaginationEvents, setupArticleCardEvents } from './list.js';
import { editArticle, createArticle, deleteArticle, updateFeaturedImagePreview, setupEditorInterface, loadArticleDataIntoForm, setDateInputValue, loadFeaturedImage, initializeEditor } from './editor.js';
import { loadCategories } from './categories.js';
import { showLoading, hideLoading } from './ui.js';

/**
 * Clase principal para la gestión de artículos en el CMS
 */
export class ArticleManager {
  /**
   * Constructor del gestor de artículos
   * @param {HTMLElement} container - Contenedor donde se renderizará el gestor
   * @param {Object} options - Opciones de configuración
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    
    // Configuración predeterminada
    this.contentManager = options.contentManager || null;
    this.mediaManager = options.mediaManager || null;
    this.notificationManager = options.notificationManager || null;
    
    // Estado interno
    this.articles = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.pageSize = 10;
    this.currentCategory = '';
    this.currentArticle = null;
    this.editor = null;
    
    // Bindings
    this.render = this.render.bind(this);
    this.loadArticles = this.loadArticles.bind(this);
    this.renderArticles = renderArticles.bind(this);
    this.renderArticlesList = renderArticlesList.bind(this);
    this.showArticlesList = showArticlesList.bind(this);
    this.showArticleEditor = showArticleEditor.bind(this);
    this.editArticle = editArticle.bind(this);
    this.createArticle = createArticle.bind(this);
    this.deleteArticle = deleteArticle.bind(this);
    this.loadCategories = loadCategories.bind(this);
    this.updateFeaturedImagePreview = updateFeaturedImagePreview.bind(this);
    this.showLoading = showLoading.bind(this);
    this.hideLoading = hideLoading.bind(this);
    this.setupEditorInterface = setupEditorInterface.bind(this);
    this.loadArticleDataIntoForm = loadArticleDataIntoForm.bind(this);
    this.setDateInputValue = setDateInputValue.bind(this);
    this.loadFeaturedImage = loadFeaturedImage.bind(this);
    this.initializeEditor = initializeEditor.bind(this);
    this.setupEvents = setupEvents.bind(this);
    this.saveArticle = saveArticle.bind(this);
  }

  /**
   * Inicializa el gestor de artículos
   */
  async init() {
    try {
      console.log('Inicializando ArticleManager...');
      
      if (!this.contentManager) {
        console.error('ContentManager no proporcionado');
        if (this.notificationManager) {
          this.notificationManager.error('Error al inicializar el gestor de artículos: ContentManager no disponible');
        }
        return;
      }
      
      // Renderizar la estructura inicial
      this.render();
      
      // Cargar categorías
      await this.loadCategories();
      
      // Configurar eventos
      this.setupEvents();
      
      // Cargar lista de artículos
      await this.loadArticles();
      
      console.log('ArticleManager inicializado correctamente');
    } catch (error) {
      console.error('Error al inicializar ArticleManager:', error);
      if (this.notificationManager) {
        this.notificationManager.error('Error al inicializar el gestor de artículos');
      }
    }
  }

  /**
   * Renderiza la estructura base del gestor de artículos
   */
  render() {
    if (!this.container) {
      console.error('No se encontró el contenedor para el gestor de artículos');
      return;
    }
    
    console.log('Renderizando estructura del gestor de artículos...');
    
    const html = `
      <div class="article-manager">
        <div class="articles-list active">
          <div class="header">
            <h3>Artículos</h3>
            <button class="create-article-btn primary-btn">Nuevo Artículo</button>
          </div>
          
          <div class="filters">
            <div class="search-container">
              <input type="text" id="article-search" placeholder="Buscar artículos...">
              <button id="search-btn" class="secondary-btn">Buscar</button>
            </div>
            
            <div class="category-filter-container">
              <select id="category-filter">
                <option value="">Todas las categorías</option>
              </select>
              <button id="clear-filters" class="text-btn">Limpiar filtros</button>
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
            <button class="back-to-list-btn secondary-btn">Volver a la lista</button>
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
            
            <div class="form-group">
              <label class="form-label" for="article-slug">Slug</label>
              <input type="text" id="article-slug" name="slug">
              <small class="form-text text-muted">Identificador único para la URL del artículo</small>
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
    
    this.container.innerHTML = html;
    console.log('Estructura del gestor de artículos renderizada');
  }

  /**
   * Carga los artículos desde la API
   * @param {number} page - Número de página a cargar
   * @param {string} category - Categoría a filtrar (opcional)
   * @param {string} search - Búsqueda a aplicar (opcional)
   */
  async loadArticles(page = 1, category = '', search = '') {
    try {
      console.log(`Cargando artículos: página ${page}, categoría ${category || 'todas'}, búsqueda "${search || 'ninguna'}"`);
      this.showLoading('Cargando artículos...');
      
      // Guardar estado actual
      this.currentPage = page;
      this.currentCategory = category;
      this.currentSearch = search; // Guardar término de búsqueda actual
      
      // Crear objeto de parámetros para la API
      const apiParams = {
        page: parseInt(page, 10),
        limit: parseInt(this.pageSize, 10)
      };
      
      // Solo añadir parámetros si tienen valor
      if (category && category.trim() !== '') {
        apiParams.category = category.trim();
      }
      
      if (search && search.trim() !== '') {
        apiParams.search = search.trim();
        // Añadir también como 'q' para mayor compatibilidad con APIs
        apiParams.q = search.trim();
      }
      
      console.log('Enviando parámetros a API:', apiParams);
      
      // Obtener artículos de la API
      const response = await this.contentManager.getArticles(apiParams);
      
      console.log('Respuesta de API:', response);
      
      // Extraer datos de la respuesta
      let articles = [];
      
      if (response && response.articles && Array.isArray(response.articles)) {
        articles = response.articles;
      } else if (response && Array.isArray(response)) {
        articles = response;
      } else {
        console.warn('Formato de respuesta inesperado:', response);
        articles = [];
      }
      
      console.log(`Se encontraron ${articles.length} artículos`);
      
      // Calcular paginación
      const total = response.total || articles.length;
      this.totalPages = response.totalPages || Math.ceil(total / this.pageSize);
      
      // Guardar artículos en el estado
      this.articles = articles;
      
      // Forzar la visualización de la lista de artículos
      this.showArticlesList();
      
      // Limpiar completamente el contenedor antes de renderizar
      const articlesContainer = this.container.querySelector('.articles-container');
      const articlesGrid = this.container.querySelector('.articles-grid');
      
      if (articlesContainer) {
        // Asegurarse de que el contenedor sea visible
        articlesContainer.style.display = 'block';
      }
      
      if (articlesGrid) {
        // Limpiar completamente el grid
        while (articlesGrid.firstChild) {
          articlesGrid.removeChild(articlesGrid.firstChild);
        }
        
        // Asegurarse de que el grid sea visible y tenga el estilo correcto
        articlesGrid.style.display = 'grid';
        articlesGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        articlesGrid.style.gap = '1.5rem';
        articlesGrid.style.width = '100%';
      }
      
      // Asegurarse de que no haya mensajes de carga visibles
      const loadingElement = articlesContainer?.querySelector('.loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }
      
      // Asegurarse de que la sección de lista sea visible
      const articlesList = this.container.querySelector('.articles-list');
      if (articlesList) {
        articlesList.classList.add('active');
        articlesList.style.display = 'block';
      }
      
      console.log('Contenedor limpiado, renderizando', articles.length, 'artículos');
      
      // Renderizar artículos con información de búsqueda
      this.renderArticles(articles, {
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        category: this.currentCategory
      });
      
      this.hideLoading();
    } catch (error) {
      console.error('Error al cargar artículos:', error);
      if (this.notificationManager) {
        this.notificationManager.error('Error al cargar los artículos');
      }
      this.hideLoading();
      
      // Mostrar mensaje de error en la interfaz
      const articlesContainer = this.container.querySelector('.articles-grid');
      if (articlesContainer) {
        articlesContainer.innerHTML = `
          <div class="error-message">
            <p>No se pudieron cargar los artículos. Intente nuevamente.</p>
            <button class="retry-btn primary-btn">Reintentar</button>
          </div>
        `;
        
        // Agregar evento al botón de reintentar
        const retryBtn = articlesContainer.querySelector('.retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            this.loadArticles(this.currentPage, this.currentCategory);
          });
        }
      }
    }
  }
}
