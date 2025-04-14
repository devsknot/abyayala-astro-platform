// Gestor de artículos para el CMS
import { ContentManager } from '../content-manager.js';
import { ContentEditor } from './editor.js';
import { MediaLibrary } from './media-library.js';
import { MediaManager } from '../media-manager.js';
import { notifications } from './notification.js';

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
                
                <div class="flex space-x-2 mb-2">
                  <button type="button" class="btn-primary select-image-btn">Seleccionar imagen</button>
                  <button type="button" class="btn-secondary toggle-gallery-btn">Mostrar galería</button>
                  <label class="btn-secondary cursor-pointer">
                    Subir imagen
                    <input type="file" class="hidden upload-image-input" accept="image/*">
                  </label>
                </div>
                
                <div class="image-gallery hidden bg-gray-50 border rounded-lg p-3 mb-2">
                  <div class="flex justify-between items-center mb-2">
                    <h4 class="font-medium">Galería de imágenes</h4>
                    <button type="button" class="text-gray-500 hover:text-gray-700 close-gallery-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                  <div class="gallery-grid grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                    <div class="loading">Cargando imágenes...</div>
                  </div>
                </div>
                
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
    this.galleryGrid = this.container.querySelector('.gallery-grid');
    
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
        // Usar la URL pública si está disponible, de lo contrario usar la ruta
        const imagePath = file.publicUrl || file.path;
        
        // Actualizar la vista previa
        this.updateFeaturedImagePreview(imagePath);
        
        // Guardar la ruta de la imagen
        this.featuredImageInput.value = file.path;
      });
    });
    
    // Evento para mostrar la galería de imágenes
    this.container.querySelector('.toggle-gallery-btn').addEventListener('click', async () => {
      const gallery = this.container.querySelector('.image-gallery');
      const isHidden = gallery.classList.contains('hidden');
      
      if (isHidden) {
        // Si vamos a mostrar la galería, cargar las imágenes
        await this.loadGalleryImages();
        
        // Añadir evento de clic a las imágenes de la galería
        this.galleryGrid.addEventListener('click', (e) => {
          const galleryItem = e.target.closest('.gallery-item');
          if (!galleryItem) return;
          
          // Obtener la ruta de la imagen
          const imagePath = galleryItem.dataset.path;
          
          // Crear una instancia del gestor de medios para obtener la URL correcta
          const mediaManager = new MediaManager();
          
          // Extraer el ID de la imagen (sin el dominio) si es una URL completa
          let imageId = imagePath;
          if (imagePath.includes('https://')) {
            // Si es una URL completa, extraer solo la parte de la ruta después del dominio
            try {
              const url = new URL(imagePath);
              imageId = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
            } catch (e) {
              console.warn('URL inválida:', imagePath);
            }
          }
          
          const imageUrl = mediaManager.getPublicUrl(imageId);
          
          // Actualizar la vista previa
          this.updateFeaturedImagePreview(imageUrl);
          
          // Guardar la ruta de la imagen
          this.featuredImageInput.value = imageId;
          
          // Cerrar la galería
          this.toggleImageGallery();
        });
      }
      
      this.toggleImageGallery();
    });
    
    // Evento para cerrar la galería de imágenes
    this.container.querySelector('.close-gallery-btn').addEventListener('click', () => {
      this.toggleImageGallery();
    });
    
    // Evento para subir imagen
    this.container.querySelector('.upload-image-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        // Mostrar indicador de carga
        this.featuredImagePreview.innerHTML = `
          <div class="flex flex-col items-center justify-center">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500 mb-2"></div>
            <span class="text-gray-500">Subiendo imagen...</span>
          </div>
        `;
        
        // Crear una instancia del gestor de medios
        const mediaManager = new MediaManager();
        
        // Subir el archivo
        const result = await mediaManager.uploadFile(file);
        
        // Actualizar la vista previa con la imagen subida
        this.updateFeaturedImagePreview(result.path);
        
        // Guardar la ruta de la imagen
        this.featuredImageInput.value = result.path;
        
        // Si la galería está visible, recargar las imágenes
        if (!this.container.querySelector('.image-gallery').classList.contains('hidden')) {
          await this.loadGalleryImages();
        }
      } catch (error) {
        console.error('Error al subir imagen:', error);
        notifications.error('Error al subir la imagen. Por favor, intenta de nuevo.');
        this.resetFeaturedImagePreview();
      } finally {
        // Limpiar el input de archivo
        e.target.value = '';
      }
    });
    
    // Evento para seleccionar imagen desde la galería
    this.galleryGrid.addEventListener('click', (e) => {
      const imageItem = e.target.closest('.gallery-item');
      if (!imageItem) return;
      
      // Obtener la ruta de la imagen
      const imagePath = imageItem.dataset.path;
      
      // Crear una instancia del gestor de medios para obtener la URL correcta
      const mediaManager = new MediaManager();
      
      // Extraer el ID de la imagen (sin el dominio) si es una URL completa
      let imageId = imagePath;
      if (imagePath.includes('https://')) {
        // Si es una URL completa, extraer solo la parte de la ruta después del dominio
        try {
          const url = new URL(imagePath);
          imageId = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
        } catch (e) {
          console.warn('URL inválida:', imagePath);
        }
      }
      
      const imageUrl = mediaManager.getPublicUrl(imageId);
      
      // Actualizar la vista previa
      this.updateFeaturedImagePreview(imageUrl);
      
      // Guardar la ruta de la imagen
      this.featuredImageInput.value = imageId;
      
      // Cerrar la galería
      this.toggleImageGallery();
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
          featured_image: this.featuredImageInput.value,
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
        notifications.success(this.currentArticle ? 'Artículo actualizado correctamente' : 'Artículo creado correctamente');
        
        // Recargar artículos y volver a la lista
        await this.loadArticles();
        this.showArticlesList();
      } catch (error) {
        console.error('Error al guardar el artículo:', error);
        notifications.error('Error al guardar el artículo. Por favor, intenta de nuevo.');
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
      
      // Mostrar notificación de carga
      const loadingNotification = notifications.info('Cargando artículo...', 0);
      
      // Obtener el artículo
      console.log(`Solicitando artículo con slug: ${slug}`);
      const article = await this.contentManager.getArticle(slug);
      console.log('Artículo cargado para edición:', article);
      console.log('Propiedades del artículo:', Object.keys(article));
      console.log('Valor de featured_image:', article.featured_image);
      
      // Cerrar notificación de carga
      notifications.close(loadingNotification);
      
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
          notifications.warning('La fecha del artículo no es válida. Se ha establecido la fecha actual.');
        }
      }
      
      this.container.querySelector('#article-slug').value = article.slug || '';
      this.container.querySelector('#article-slug').dataset.modified = 'true';
      
      // Actualizar la imagen destacada
      if (article.featured_image) {
        console.log('Imagen destacada del artículo:', article.featured_image);
        
        try {
          // Crear instancia del gestor de medios
          const mediaManager = new MediaManager();
          
          // Obtener la URL pública de la imagen
          const imageUrl = mediaManager.getPublicUrl(article.featured_image);
          console.log('URL pública de la imagen destacada:', imageUrl);
          
          // Verificar si la imagen existe (solo en desarrollo)
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Verificando existencia de imagen en desarrollo local...');
            
            // Intentar cargar la imagen para verificar si existe
            const img = new Image();
            img.onload = () => {
              console.log('Imagen cargada correctamente:', imageUrl);
              // La imagen existe, actualizar la vista previa
              this.updateFeaturedImagePreview(article.featured_image);
            };
            
            img.onerror = () => {
              console.warn('Error al cargar la imagen:', imageUrl);
              // La imagen no existe, intentar con otra ruta
              const alternativeUrl = article.featured_image.startsWith('/') 
                ? article.featured_image 
                : `/${article.featured_image}`;
              
              console.log('Intentando con ruta alternativa:', alternativeUrl);
              this.updateFeaturedImagePreview(alternativeUrl);
            };
            
            img.src = imageUrl;
          } else {
            // En producción, confiar en la URL generada
            this.updateFeaturedImagePreview(article.featured_image);
          }
          
          // Guardar la ruta original de la imagen
          this.featuredImageInput.value = article.featured_image;
        } catch (imageError) {
          console.error('Error al procesar la imagen destacada:', imageError);
          this.resetFeaturedImagePreview();
          notifications.warning('No se pudo cargar la imagen destacada del artículo.');
        }
      } else {
        console.log('El artículo no tiene imagen destacada');
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
          notifications.warning('No se pudo cargar el editor avanzado. Se está usando un editor básico.');
        }
      }, 300);
    } catch (error) {
      console.error('Error al cargar el artículo:', error);
      notifications.error('Error al cargar el artículo. Por favor, intenta de nuevo.');
      this.showArticlesList();
    }
  }

  updateFeaturedImagePreview(imagePath) {
    console.log('Actualizando vista previa de imagen destacada:', imagePath);
    
    // Si no hay ruta de imagen, mostrar mensaje de "No hay imagen seleccionada"
    if (!imagePath) {
      this.resetFeaturedImagePreview();
      return;
    }
    
    // Crear una instancia del gestor de medios para obtener la URL correcta
    const mediaManager = new MediaManager();
    
    // Obtener la URL pública de la imagen
    const imageUrl = mediaManager.getPublicUrl(imagePath);
    console.log('URL pública generada:', imageUrl);
    
    // Actualizar la vista previa con la imagen
    this.featuredImagePreview.innerHTML = `
      <div class="relative w-full h-full flex items-center justify-center">
        <img src="${imageUrl}" alt="Imagen destacada" class="max-h-full max-w-full object-contain" 
             onerror="this.onerror=null; this.src='/img/placeholder-image.svg'; console.error('Error al cargar imagen destacada, usando placeholder');">
        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <button type="button" class="remove-image-btn bg-red-500 text-white rounded-full p-2 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
    
    // Agregar evento para eliminar la imagen
    const removeButton = this.featuredImagePreview.querySelector('.remove-image-btn');
    if (removeButton) {
      removeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que el clic se propague
        this.resetFeaturedImagePreview();
      });
    }
  }

  resetFeaturedImagePreview() {
    this.featuredImagePreview.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-gray-300 mb-2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span class="text-gray-500">No hay imagen seleccionada</span>
      </div>
    `;
    this.featuredImageInput.value = '';
  }
  
  async deleteArticle(slug) {
    const confirmed = await notifications.confirm(`¿Estás seguro de que deseas eliminar el artículo "${slug}"? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }
    
    try {
      // Mostrar notificación de carga
      const loadingNotification = notifications.info('Eliminando artículo...', 0);
      
      // Eliminar el artículo
      await this.contentManager.deleteArticle(slug);
      
      // Cerrar notificación de carga
      notifications.close(loadingNotification);
      
      // Mostrar mensaje de éxito
      notifications.success('Artículo eliminado correctamente');
      
      // Recargar artículos
      await this.loadArticles();
    } catch (error) {
      console.error('Error al eliminar el artículo:', error);
      notifications.error('Error al eliminar el artículo. Por favor, intenta de nuevo.');
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
  
  validateArticleData(articleData) {
    // Validar campos requeridos
    const requiredFields = ['title', 'description', 'category', 'pubDate', 'slug'];
    for (const field of requiredFields) {
      if (!articleData[field]) {
        notifications.error(`El campo "${field}" es obligatorio`);
        return false;
      }
    }
    
    // Validar formato del slug
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(articleData.slug)) {
      notifications.error('El slug debe contener solo letras minúsculas, números y guiones');
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
  
  toggleImageGallery() {
    const gallery = this.container.querySelector('.image-gallery');
    gallery.classList.toggle('hidden');
  }
  
  // Cargar imágenes para la galería
  async loadGalleryImages() {
    try {
      // Mostrar indicador de carga
      this.galleryGrid.innerHTML = `<div class="loading col-span-4 text-center py-4">Cargando imágenes...</div>`;
      
      // Crear una instancia del gestor de medios
      const mediaManager = new MediaManager();
      
      // Obtener los archivos de medios
      const mediaFiles = await mediaManager.getMediaFiles();
      
      // Filtrar solo imágenes
      const imageFiles = mediaFiles.filter(file => 
        file.type.startsWith('image/') || 
        file.path.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      
      // Renderizar la galería
      if (imageFiles.length === 0) {
        this.galleryGrid.innerHTML = `<div class="col-span-4 text-center py-4 text-gray-500">No hay imágenes disponibles</div>`;
        return;
      }
      
      // Crear elementos para cada imagen
      this.galleryGrid.innerHTML = imageFiles.map(file => {
        // Usar el MediaManager para generar la URL correcta de la imagen
        // Usar file.id en lugar de file.path para evitar duplicación de dominio
        const imageUrl = file.id ? mediaManager.getPublicUrl(file.id) : file.path;
        
        return `
        <div class="gallery-item cursor-pointer border rounded-lg overflow-hidden hover:border-blue-500 transition-colors" data-path="${file.path}">
          <div class="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
            <img src="${imageUrl}" alt="${file.name}" class="w-full h-full object-cover">
          </div>
          <div class="p-1 text-xs truncate text-center">${file.name}</div>
        </div>
      `}).join('');
    } catch (error) {
      console.error('Error al cargar imágenes:', error);
      this.galleryGrid.innerHTML = `<div class="col-span-4 text-center py-4 text-red-500">Error al cargar imágenes</div>`;
    }
  }
}
