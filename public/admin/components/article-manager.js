// Gestor de artículos para el CMS
import { ContentManager } from '../content-manager.js';
import { ContentEditor } from './editor.js';
import { MediaLibrary } from './media-library.js';

export class ArticleManager {
  constructor(container) {
    this.container = container;
    this.contentManager = new ContentManager();
    this.currentArticle = null;
    this.editor = null;
    this.init();
  }
  
  async init() {
    // Crear la estructura del gestor de artículos
    this.container.innerHTML = `
      <div class="article-manager">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold">Artículos</h2>
          <button type="button" class="btn-primary new-article-btn">Nuevo artículo</button>
        </div>
        
        <div class="articles-list card mb-6">
          <h3 class="text-lg font-semibold mb-4">Todos los artículos</h3>
          <div class="articles-container">
            <div class="loading">Cargando artículos...</div>
          </div>
        </div>
        
        <div class="article-editor card hidden">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Editor de artículo</h3>
            <button type="button" class="text-gray-500 hover:text-gray-700 back-to-list-btn">
              Volver a la lista
            </button>
          </div>
          
          <form class="article-form">
            <div class="form-group">
              <label for="article-title" class="form-label">Título</label>
              <input type="text" id="article-title" class="form-input" required>
            </div>
            
            <div class="form-group">
              <label for="article-description" class="form-label">Descripción</label>
              <textarea id="article-description" class="form-input" rows="2" required></textarea>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-group">
                <label for="article-category" class="form-label">Categoría</label>
                <select id="article-category" class="form-input" required>
                  <option value="">Seleccionar categoría</option>
                  <option value="agricultura">Agricultura</option>
                  <option value="comunidad">Comunidad</option>
                  <option value="sostenibilidad">Sostenibilidad</option>
                  <option value="politica-agraria">Política Agraria</option>
                  <option value="tecnologia-rural">Tecnología Rural</option>
                  <option value="cultura">Cultura</option>
                  <option value="eventos">Eventos</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="article-date" class="form-label">Fecha de publicación</label>
                <input type="date" id="article-date" class="form-input" required>
              </div>
            </div>
            
            <div class="form-group">
              <label for="article-slug" class="form-label">Slug (URL)</label>
              <input type="text" id="article-slug" class="form-input" required pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$">
              <small class="text-gray-500">Solo letras minúsculas, números y guiones. Ejemplo: mi-nuevo-articulo</small>
            </div>
            
            <div class="form-group">
              <label class="form-label">Imagen destacada</label>
              <div class="featured-image-container">
                <div class="featured-image-preview bg-gray-100 border rounded-lg p-4 flex items-center justify-center h-40 mb-2">
                  <span class="text-gray-500">No hay imagen seleccionada</span>
                </div>
                <button type="button" class="btn-primary select-image-btn">Seleccionar imagen</button>
                <input type="hidden" id="article-image" value="">
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Contenido</label>
              <div class="editor-container" id="article-content-editor"></div>
            </div>
            
            <div class="flex justify-end mt-6">
              <button type="button" class="btn-secondary mr-2 cancel-btn">Cancelar</button>
              <button type="submit" class="btn-primary save-btn">Guardar artículo</button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Obtener referencias a los elementos
    this.articlesList = this.container.querySelector('.articles-list');
    this.articlesContainer = this.container.querySelector('.articles-container');
    this.articleEditor = this.container.querySelector('.article-editor');
    this.articleForm = this.container.querySelector('.article-form');
    this.editorContainer = this.container.querySelector('#article-content-editor');
    this.featuredImagePreview = this.container.querySelector('.featured-image-preview');
    this.featuredImageInput = this.container.querySelector('#article-image');
    
    // Configurar eventos
    this.setupEvents();
    
    // Cargar artículos
    await this.loadArticles();
    
    // Inicializar el editor de contenido
    this.editor = new ContentEditor(this.editorContainer);
  }
  
  setupEvents() {
    // Evento para crear un nuevo artículo
    this.container.querySelector('.new-article-btn').addEventListener('click', () => {
      this.showArticleEditor();
    });
    
    // Evento para volver a la lista de artículos
    this.container.querySelector('.back-to-list-btn').addEventListener('click', () => {
      this.showArticlesList();
    });
    
    // Evento para cancelar la edición
    this.container.querySelector('.cancel-btn').addEventListener('click', () => {
      this.showArticlesList();
    });
    
    // Evento para seleccionar imagen destacada
    this.container.querySelector('.select-image-btn').addEventListener('click', () => {
      MediaLibrary.openModal((file) => {
        // Actualizar la vista previa
        this.updateFeaturedImagePreview(file.path);
        
        // Guardar la ruta de la imagen
        this.featuredImageInput.value = file.path;
      });
    });
    
    // Evento para guardar el artículo
    this.articleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      try {
        // Obtener datos del formulario
        const articleData = {
          title: this.container.querySelector('#article-title').value,
          description: this.container.querySelector('#article-description').value,
          category: this.container.querySelector('#article-category').value,
          pubDate: this.formatDate(this.container.querySelector('#article-date').value),
          slug: this.container.querySelector('#article-slug').value,
          heroImage: this.featuredImageInput.value,
          content: this.editor.getContent()
        };
        
        // Validar datos
        if (!this.validateArticleData(articleData)) {
          return;
        }
        
        // Deshabilitar el botón de guardar
        const saveButton = this.container.querySelector('.save-btn');
        saveButton.disabled = true;
        saveButton.textContent = 'Guardando...';
        
        // Crear o actualizar el artículo
        let result;
        if (this.currentArticle) {
          result = await this.contentManager.updateArticle(this.currentArticle.slug, articleData);
        } else {
          result = await this.contentManager.createArticle(articleData);
        }
        
        // Mostrar mensaje de éxito
        alert(this.currentArticle ? 'Artículo actualizado correctamente' : 'Artículo creado correctamente');
        
        // Recargar artículos y volver a la lista
        await this.loadArticles();
        this.showArticlesList();
      } catch (error) {
        console.error('Error al guardar el artículo:', error);
        alert('Error al guardar el artículo. Por favor, intenta de nuevo.');
      } finally {
        // Restablecer el botón de guardar
        const saveButton = this.container.querySelector('.save-btn');
        saveButton.disabled = false;
        saveButton.textContent = 'Guardar artículo';
      }
    });
    
    // Evento para generar slug automáticamente a partir del título
    this.container.querySelector('#article-title').addEventListener('input', (e) => {
      const title = e.target.value;
      const slugInput = this.container.querySelector('#article-slug');
      
      // Solo generar slug automáticamente si el campo está vacío o no ha sido modificado manualmente
      if (!slugInput.dataset.modified) {
        slugInput.value = this.generateSlug(title);
      }
    });
    
    // Marcar el campo de slug como modificado manualmente
    this.container.querySelector('#article-slug').addEventListener('input', (e) => {
      e.target.dataset.modified = 'true';
    });
  }
  
  async loadArticles() {
    try {
      // Mostrar indicador de carga
      this.articlesContainer.innerHTML = `<div class="loading">Cargando artículos...</div>`;
      
      // Obtener artículos
      const articles = await this.contentManager.getArticles();
      
      // Renderizar artículos
      this.renderArticles(articles);
    } catch (error) {
      console.error('Error al cargar artículos:', error);
      this.articlesContainer.innerHTML = `<div class="error">Error al cargar artículos. <button class="text-blue-500 hover:underline">Reintentar</button></div>`;
      
      // Configurar evento para reintentar
      this.articlesContainer.querySelector('button').addEventListener('click', () => {
        this.loadArticles();
      });
    }
  }
  
  renderArticles(articles) {
    if (articles.length === 0) {
      this.articlesContainer.innerHTML = `<div class="empty-state">No hay artículos. Crea uno nuevo para comenzar.</div>`;
      return;
    }
    
    // Crear tabla de artículos
    const articlesTable = `
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left pb-2">Título</th>
            <th class="text-left pb-2">Categoría</th>
            <th class="text-left pb-2">Fecha</th>
            <th class="text-left pb-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${articles.map(article => `
            <tr class="border-b" data-slug="${article.slug}">
              <td class="py-2">${article.title}</td>
              <td class="py-2">${this.getCategoryName(article.category)}</td>
              <td class="py-2">${this.formatDateShort(article.pubDate)}</td>
              <td class="py-2">
                <button type="button" class="text-blue-500 hover:underline mr-2 edit-article-btn" data-slug="${article.slug}">Editar</button>
                <button type="button" class="text-red-500 hover:underline delete-article-btn" data-slug="${article.slug}">Eliminar</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    
    this.articlesContainer.innerHTML = articlesTable;
    
    // Configurar eventos para los botones de editar y eliminar
    this.articlesContainer.querySelectorAll('.edit-article-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const slug = button.dataset.slug;
        await this.editArticle(slug);
      });
    });
    
    this.articlesContainer.querySelectorAll('.delete-article-btn').forEach(button => {
      button.addEventListener('click', async () => {
        const slug = button.dataset.slug;
        await this.deleteArticle(slug);
      });
    });
  }
  
  async editArticle(slug) {
    try {
      // Mostrar el editor y el indicador de carga
      this.showArticleEditor();
      this.articleEditor.querySelector('.article-form').style.display = 'none';
      this.articleEditor.insertAdjacentHTML('afterbegin', `<div class="loading-overlay p-4 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p class="text-lg font-medium">Cargando artículo...</p>
      </div>`);
      
      // Obtener el artículo
      const article = await this.contentManager.getArticle(slug);
      
      // Guardar referencia al artículo actual
      this.currentArticle = article;
      
      // Eliminar el indicador de carga
      const loadingOverlay = this.articleEditor.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.remove();
      }
      
      // Mostrar el formulario
      this.articleEditor.querySelector('.article-form').style.display = 'block';
      
      // Rellenar el formulario con los datos del artículo
      this.container.querySelector('#article-title').value = article.title || '';
      this.container.querySelector('#article-description').value = article.description || '';
      this.container.querySelector('#article-category').value = article.category || '';
      
      // Formatear la fecha si existe
      if (article.pubDate) {
        try {
          this.container.querySelector('#article-date').value = this.formatDateForInput(article.pubDate);
        } catch (dateError) {
          console.warn('Error al formatear la fecha:', dateError);
          // Usar la fecha actual como fallback
          this.container.querySelector('#article-date').value = this.formatDateForInput(new Date().toISOString());
        }
      }
      
      this.container.querySelector('#article-slug').value = article.slug || '';
      this.container.querySelector('#article-slug').dataset.modified = 'true';
      
      // Actualizar la imagen destacada
      if (article.heroImage) {
        this.updateFeaturedImagePreview(article.heroImage);
        this.featuredImageInput.value = article.heroImage;
      } else {
        this.resetFeaturedImagePreview();
        this.featuredImageInput.value = '';
      }
      
      // Limpiar el contenedor del editor si existe
      if (this.editorContainer) {
        this.editorContainer.innerHTML = '';
      }
      
      // Inicializar el editor de contenido con el contenido del artículo
      // Usar un timeout para asegurar que el DOM esté listo
      setTimeout(() => {
        try {
          // Asegurarse de que el contenedor del editor existe
          this.editorContainer = this.container.querySelector('#article-content-editor');
          if (!this.editorContainer) {
            throw new Error('No se encontró el contenedor del editor');
          }
          
          // Crear una nueva instancia del editor
          this.editor = new ContentEditor(this.editorContainer, article.content || '');
          console.log('Editor inicializado correctamente');
        } catch (editorError) {
          console.error('Error al inicializar el editor:', editorError);
          // Intentar recuperarse del error
          this.editorContainer.innerHTML = `
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p class="text-yellow-700">No se pudo cargar el editor avanzado. Usando editor básico.</p>
              <textarea class="form-input mt-2" rows="10" id="basic-editor">${article.content || ''}</textarea>
            </div>
          `;
        }
      }, 300);
    } catch (error) {
      console.error('Error al cargar el artículo:', error);
      alert('Error al cargar el artículo. Por favor, intenta de nuevo.');
      this.showArticlesList();
    }
  }
  
  async deleteArticle(slug) {
    if (!confirm(`¿Estás seguro de que deseas eliminar el artículo "${slug}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    
    try {
      // Eliminar el artículo
      await this.contentManager.deleteArticle(slug);
      
      // Mostrar mensaje de éxito
      alert('Artículo eliminado correctamente');
      
      // Recargar artículos
      await this.loadArticles();
    } catch (error) {
      console.error('Error al eliminar el artículo:', error);
      alert('Error al eliminar el artículo. Por favor, intenta de nuevo.');
    }
  }
  
  showArticlesList() {
    this.articlesList.classList.remove('hidden');
    this.articleEditor.classList.add('hidden');
    this.currentArticle = null;
  }
  
  showArticleEditor() {
    this.articlesList.classList.add('hidden');
    this.articleEditor.classList.remove('hidden');
    
    // Si es un nuevo artículo, limpiar el formulario
    if (!this.currentArticle) {
      this.articleForm.reset();
      this.container.querySelector('#article-slug').dataset.modified = '';
      this.resetFeaturedImagePreview();
      
      // Establecer la fecha actual
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      this.container.querySelector('#article-date').value = formattedDate;
      
      // Limpiar el editor
      if (this.editor) {
        this.editor.setContent('');
      }
    }
  }
  
  updateFeaturedImagePreview(imagePath) {
    this.featuredImagePreview.innerHTML = `
      <img src="${imagePath}" alt="Imagen destacada" class="max-h-full max-w-full object-contain">
    `;
  }
  
  resetFeaturedImagePreview() {
    this.featuredImagePreview.innerHTML = `
      <span class="text-gray-500">No hay imagen seleccionada</span>
    `;
    this.featuredImageInput.value = '';
  }
  
  validateArticleData(articleData) {
    // Validar campos requeridos
    const requiredFields = ['title', 'description', 'category', 'pubDate', 'slug'];
    for (const field of requiredFields) {
      if (!articleData[field]) {
        alert(`El campo "${field}" es obligatorio`);
        return false;
      }
    }
    
    // Validar formato del slug
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(articleData.slug)) {
      alert('El slug debe contener solo letras minúsculas, números y guiones');
      return false;
    }
    
    return true;
  }
  
  // Utilidades para formatear fechas
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error, dateString);
      return '';
    }
  }
  
  formatDateShort(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Usar formato español
      const options = { day: '2-digit', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('es-ES', options);
    } catch (error) {
      console.error('Error al formatear fecha corta:', error, dateString);
      return '';
    }
  }
  
  formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      
      // Formato YYYY-MM-DD para inputs de tipo date
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error al formatear fecha para input:', error, dateString);
      return '';
    }
  }
  
  // Utilidad para generar slug a partir del título
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '-') // Reemplazar espacios por guiones
      .replace(/-+/g, '-') // Eliminar guiones duplicados
      .trim(); // Eliminar espacios al inicio y al final
  }
  
  // Utilidad para obtener el nombre de la categoría
  getCategoryName(categoryId) {
    const categories = {
      'agricultura': 'Agricultura',
      'comunidad': 'Comunidad',
      'sostenibilidad': 'Sostenibilidad',
      'politica-agraria': 'Política Agraria',
      'tecnologia-rural': 'Tecnología Rural',
      'cultura': 'Cultura',
      'eventos': 'Eventos'
    };
    
    return categories[categoryId] || categoryId;
  }
}
