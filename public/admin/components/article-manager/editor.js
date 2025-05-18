/**
 * Edita un artículo existente
 * @param {string} slug - Slug del artículo a editar
 */
export async function editArticle(slug) {
  console.log(`Iniciando edición del artículo con slug: ${slug}`);
  this.showLoading('Cargando artículo...');
  
  try {
    // Primero cargar autores para asegurar que el selector esté completo
    await this.loadAuthors();
    console.log('Autores cargados antes de editar artículo');
    
    // Obtener el artículo de la API
    const response = await this.contentManager.getArticle(slug);
    console.log('Artículo recibido de la API:', response);
    
    // La respuesta puede venir en diferentes formatos, manejar ambos casos
    const article = response.article || response;
    console.log('Datos del artículo procesados:', article);
    
    if (!article) {
      throw new Error('Artículo no encontrado');
    }
    
    // Mostrar el editor y configurar la interfaz básica
    this.showArticleEditor();
    this.currentArticle = article;
    this.setupEditorInterface();
    
    // Cargar los datos del artículo en el formulario
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
 * Configura la interfaz del editor de artículos
 */
export function setupEditorInterface() {
  try {
    // Actualizar título del editor
    const editorTitle = this.container.querySelector('.article-editor h3');
    if (editorTitle) {
      editorTitle.textContent = 'Editar artículo';
    }
    
    // Asegurarse de que el botón para volver al listado funcione
    const backButton = this.container.querySelector('.back-to-list-btn');
    if (backButton) {
      // Eliminar eventos anteriores para evitar duplicados
      const newBackButton = backButton.cloneNode(true);
      backButton.parentNode.replaceChild(newBackButton, backButton);
      
      // Agregar evento para volver al listado
      newBackButton.addEventListener('click', () => {
        this.showArticlesList();
      });
    }
    
    // Imprimir la estructura del formulario para depuración
    console.log('Estructura del formulario:', {
      articleEditor: this.container.querySelector('.article-editor') ? 'Encontrado' : 'No encontrado',
      articleForm: this.container.querySelector('.article-form') ? 'Encontrado' : 'No encontrado',
      titleInput: this.container.querySelector('#article-title') ? 'Encontrado' : 'No encontrado',
      descriptionInput: this.container.querySelector('#article-description') ? 'Encontrado' : 'No encontrado',
      categorySelect: this.container.querySelector('#article-category') ? 'Encontrado' : 'No encontrado',
      dateInput: this.container.querySelector('#article-date') ? 'Encontrado' : 'No encontrado',
      slugInput: this.container.querySelector('#article-slug') ? 'Encontrado' : 'No encontrado',
      featuredImagePreview: this.container.querySelector('.featured-image-preview') ? 'Encontrado' : 'No encontrado',
    });
  } catch (error) {
    console.error('Error al configurar interfaz del editor:', error);
  }
}

/**
 * Carga los datos de un artículo en el formulario de edición
 * @param {Object} article - Datos del artículo a cargar
 */
export function loadArticleDataIntoForm(article) {
  if (!article) return;
  
  try {
    // Cargar los datos del artículo en el formulario
    const titleInput = this.container.querySelector('#article-title');
    const descriptionInput = this.container.querySelector('#article-description');
    const categorySelect = this.container.querySelector('#article-category');
    const dateInput = this.container.querySelector('#article-date');
    const slugInput = this.container.querySelector('#article-slug');
    const authorSelect = this.container.querySelector('#article-author');
    const tagsInput = this.container.querySelector('#article-tags');
    
    // Verificar que todos los elementos existan
    if (!titleInput || !descriptionInput || !categorySelect || !dateInput || !slugInput) {
      console.error('No se encontraron todos los elementos del formulario');
      if (this.notificationManager) {
        this.notificationManager.error('Error al cargar el formulario');
      }
      this.hideLoading();
      return;
    }
    
    // Asignar valores con comprobación de nulos
    titleInput.value = article.title || '';
    descriptionInput.value = article.description || '';
    categorySelect.value = article.category || '';
    slugInput.value = article.slug || '';
    slugInput.dataset.edited = 'true';
    
    // Formatear la fecha para el input date
    this.setDateInputValue(dateInput, article.pubDate);
    
    // Seleccionar el autor si existe
    if (authorSelect) {
      console.log('DEBUG: Opciones de autor disponibles:', Array.from(authorSelect.options).map(o => o.value));
      console.log('DEBUG: Autor del artículo:', article.author);
      
      // Enfoque directo: Si el autor es un string, usarlo directamente
      if (typeof article.author === 'string' && article.author) {
        // Verificar si el autor existe en las opciones
        let autorExisteEnOpciones = false;
        
        for (let i = 0; i < authorSelect.options.length; i++) {
          // Comparación insensible a mayúsculas/minúsculas para mayor tolerancia
          if (authorSelect.options[i].value.toLowerCase() === article.author.toLowerCase()) {
            authorSelect.selectedIndex = i;
            autorExisteEnOpciones = true;
            console.log(`Autor encontrado y seleccionado: ${article.author}`);
            break;
          }
        }
        
        // Si no existe, añadirlo como opción temporal
        if (!autorExisteEnOpciones && article.author !== 'Autor Desconocido') {
          console.log(`Añadiendo autor como opción temporal: ${article.author}`);
          const newOption = new Option(article.author, article.author);
          authorSelect.add(newOption);
          authorSelect.value = article.author;
        }
      }
      // Si hay un author_id, intentar usarlo como respaldo
      else if (article.author_id) {
        authorSelect.value = article.author_id;
        console.log('Usando author_id como respaldo:', article.author_id);
      }
      
      // Mostrar resultado final
      console.log('Autor seleccionado finalmente:', authorSelect.value);
    }
    
    // Cargar etiquetas
    if (tagsInput) {
      tagsInput.value = Array.isArray(article.tags) ? article.tags.join(', ') : '';
    }
    
    // Cargar imagen destacada
    this.loadFeaturedImage(article.featured_image);
    
    // Cargar contenido en el editor (en un método separado para evitar anidamiento)
    setTimeout(() => this.initializeEditor(article.content || ''), 500);
    
  } catch (error) {
    console.error('Error al cargar datos en el formulario:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al cargar los datos del artículo');
    }
    this.hideLoading();
  }
}

/**
 * Formatea y establece el valor de la fecha en el input
 * @param {HTMLInputElement} dateInput - Input de fecha
 * @param {string} pubDate - Fecha de publicación
 */
export function setDateInputValue(dateInput, pubDate) {
  try {
    if (pubDate) {
      const date = new Date(pubDate);
      if (!isNaN(date.getTime())) {
        dateInput.value = date.toISOString().split('T')[0];
      } else {
        dateInput.value = new Date().toISOString().split('T')[0];
        console.warn('Fecha inválida en el artículo:', pubDate);
      }
    } else {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  } catch (error) {
    console.error('Error al procesar fecha:', error);
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

/**
 * Carga la imagen destacada en la vista previa
 * @param {string} featuredImage - URL de la imagen destacada
 */
export function loadFeaturedImage(featuredImage) {
  try {
    console.log('Cargando imagen destacada:', featuredImage);
    
    const featuredImagePreview = this.container.querySelector('.featured-image-preview');
    if (!featuredImagePreview) {
      console.warn('No se encontró el contenedor para la vista previa de la imagen');
      return;
    }
    
    // Verificar si existe el input para la imagen destacada
    let featuredImageInput = this.container.querySelector('#article-image');
    if (!featuredImageInput) {
      featuredImageInput = this.container.querySelector('#article-featured-image');
    }
    
    // Si no existe el input, intentamos encontrar el contenedor y lo creamos
    if (!featuredImageInput) {
      console.log('Creando input para la imagen destacada...');
      const featuredImageContainer = this.container.querySelector('.featured-image-container');
      if (featuredImageContainer) {
        featuredImageInput = document.createElement('input');
        featuredImageInput.type = 'hidden';
        featuredImageInput.id = 'article-featured-image';
        featuredImageInput.name = 'featured_image';
        featuredImageContainer.appendChild(featuredImageInput);
        console.log('Input para la imagen destacada creado');
      } else {
        console.warn('No se encontró el contenedor para añadir el input de imagen');
      }
    }
    
    // Botón para eliminar imagen
    const removeImageBtn = this.container.querySelector('.remove-image-btn');
    
    if (featuredImage && featuredImagePreview) {
      console.log('Actualizando vista previa de la imagen destacada');
      
      // Comprobar si la URL de la imagen es válida
      // Si la URL no comienza con http o /, intentar prepender la ruta base
      let imageUrl = featuredImage;
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = '/' + imageUrl;
      }
      
      // Actualizar la vista previa de la imagen
      this.updateFeaturedImagePreview(imageUrl, featuredImagePreview);
      
      // Actualizar el valor del input oculto si existe
      if (featuredImageInput) {
        featuredImageInput.value = featuredImage;
        console.log('Valor del input actualizado:', featuredImageInput.value);
      }
      
      // Mostrar botón para eliminar
      if (removeImageBtn) {
        removeImageBtn.style.display = 'inline-block';
      }
    } else if (featuredImagePreview) {
      console.log('No hay imagen destacada, reseteando vista previa');
      
      // Resetear la vista previa
      featuredImagePreview.innerHTML = `<span class="text-gray-500">No hay imagen seleccionada</span>`;
      
      // Limpiar el input oculto si existe
      if (featuredImageInput) {
        featuredImageInput.value = '';
      }
      
      // Ocultar botón para eliminar
      if (removeImageBtn) {
        removeImageBtn.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Error al cargar imagen destacada:', error);
  }
}

/**
 * Inicializa el editor de contenido
 * @param {string} content - Contenido a cargar en el editor
 */
export function initializeEditor(content) {
  try {
    // Verificar si existe el contenedor del editor
    const editorContainer = this.container.querySelector('.editor-container');
    if (!editorContainer) {
      console.error('No se encontró el contenedor del editor');
      this.hideLoading();
      return;
    }
    
    // Limpiar cualquier contenido previo del editor
    editorContainer.innerHTML = '';
    
    // Importar dinámicamente el editor
    import('../content-editor.js')
      .then(module => {
        try {
          const ContentEditor = module.ContentEditor;
          
          // Inicializar el editor con el nuevo módulo
          this.editor = new ContentEditor(editorContainer);
          
          // Establecer el contenido
          if (this.editor && typeof this.editor.setContent === 'function') {
            this.editor.setContent(content);
            console.log('Contenido establecido en el editor correctamente');
          } else {
            console.error('El editor no tiene el método setContent');
          }
        } catch (initError) {
          console.error('Error al instanciar el editor:', initError);
          
          // Fallback a un textarea simple si falla la inicialización
          const textarea = document.createElement('textarea');
          textarea.className = 'editor-fallback';
          textarea.style.width = '100%';
          textarea.style.minHeight = '300px';
          textarea.style.padding = '10px';
          textarea.style.border = '1px solid #ddd';
          textarea.value = content || '';
          
          editorContainer.innerHTML = '';
          editorContainer.appendChild(textarea);
          
          // Crear un editor simple
          this.editor = {
            setContent: (c) => { textarea.value = c || ''; },
            getContent: () => textarea.value,
            destroy: () => { editorContainer.innerHTML = ''; }
          };
        }
        
        this.hideLoading();
      })
      .catch(importError => {
        console.error('Error al importar el editor:', importError);
        
        // Fallback a un textarea simple si falla la importación
        const textarea = document.createElement('textarea');
        textarea.className = 'editor-fallback';
        textarea.style.width = '100%';
        textarea.style.minHeight = '300px';
        textarea.style.padding = '10px';
        textarea.style.border = '1px solid #ddd';
        textarea.value = content || '';
        
        editorContainer.innerHTML = '';
        editorContainer.appendChild(textarea);
        
        // Crear un editor simple
        this.editor = {
          setContent: (c) => { textarea.value = c || ''; },
          getContent: () => textarea.value,
          destroy: () => { editorContainer.innerHTML = ''; }
        };
        
        this.hideLoading();
      });
  } catch (error) {
    console.error('Error al inicializar editor:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al inicializar el editor');
    }
    this.hideLoading();
  }
}

/**
 * Actualiza la vista previa de la imagen destacada
 * @param {string} imageUrl - URL de la imagen destacada
 * @param {HTMLElement} previewElement - Elemento donde mostrar la vista previa
 */
export function updateFeaturedImagePreview(imageUrl, previewElement) {
  try {
    if (!previewElement) return;
    
    console.log('Actualizando vista previa con URL:', imageUrl);
    
    // Normalizar la URL de la imagen
    let normalizedUrl = imageUrl;
    
    // Si la URL no comienza con http o /, intentar prepender la ruta base
    if (normalizedUrl && !normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('/')) {
      normalizedUrl = '/' + normalizedUrl;
      console.log('URL normalizada:', normalizedUrl);
    }
    
    // Si la URL contiene api/media pero no comienza con /, añadir /
    if (normalizedUrl && normalizedUrl.includes('api/media') && !normalizedUrl.startsWith('/')) {
      normalizedUrl = '/' + normalizedUrl;
      console.log('URL de API normalizada:', normalizedUrl);
    }
    
    // Si la URL no contiene api/media pero parece ser una ruta de archivo, añadir /api/media/
    if (normalizedUrl && !normalizedUrl.includes('api/media') && !normalizedUrl.startsWith('http') && 
        (normalizedUrl.includes('.jpg') || normalizedUrl.includes('.png') || normalizedUrl.includes('.jpeg') || normalizedUrl.includes('.gif'))) {
      // Eliminar la barra inicial si existe
      const cleanPath = normalizedUrl.startsWith('/') ? normalizedUrl.substring(1) : normalizedUrl;
      normalizedUrl = `/api/media/${cleanPath}`;
      console.log('URL convertida a ruta de API:', normalizedUrl);
    }
    
    const maxWidth = 150;
    const maxHeight = 150;
    
    // Crear elemento imagen
    const img = document.createElement('img');
    img.alt = 'Imagen destacada';
    img.style.maxWidth = `${maxWidth}px`;
    img.style.maxHeight = `${maxHeight}px`;
    img.style.objectFit = 'contain';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    
    // Limpiar el contenedor de vista previa
    previewElement.innerHTML = '';
    
    // Mostrar indicador de carga
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = `<span>Cargando imagen...</span>`;
    previewElement.appendChild(loadingIndicator);
    
    // Agregar manejador de error para la imagen
    img.onerror = () => {
      console.warn('Error al cargar la imagen:', normalizedUrl);
      previewElement.innerHTML = `
        <div style="text-align: center; color: #e53e3e;">
          <p>Error al cargar la imagen</p>
          <small>${normalizedUrl}</small>
          <p style="font-size: 0.8em; margin-top: 5px;">Intenta con otra imagen o verifica la URL</p>
        </div>
      `;
      
      // Intentar con una URL alternativa si parece ser una ruta de archivo
      if (!normalizedUrl.startsWith('http') && !normalizedUrl.includes('api/media')) {
        console.log('Intentando con URL alternativa...');
        setTimeout(() => {
          const alternativeUrl = `/api/media/${normalizedUrl.replace(/^\//, '')}`;
          this.updateFeaturedImagePreview(alternativeUrl, previewElement);
        }, 1000);
      }
    };
    
    // Manejador de carga exitosa
    img.onload = () => {
      console.log('Imagen cargada correctamente:', normalizedUrl);
      // Eliminar indicador de carga
      previewElement.innerHTML = '';
      previewElement.appendChild(img);
    };
    
    // Establecer la URL de la imagen después de configurar los manejadores
    img.src = normalizedUrl;
    
    console.log('Vista previa de imagen actualizada');
  } catch (error) {
    console.error('Error al actualizar vista previa de imagen:', error);
    
    // Mostrar mensaje de error en la vista previa
    if (previewElement) {
      previewElement.innerHTML = `<span class="text-gray-500">Error al cargar la imagen</span>`;
    }
  }
}

/**
 * Crea un nuevo artículo
 */
export function createArticle() {
  try {
    console.log('Creando nuevo artículo...');
    
    // Mostrar el editor
    this.showArticleEditor();
    
    // Actualizar título del editor
    const editorTitle = this.container.querySelector('.article-editor h3');
    if (editorTitle) {
      editorTitle.textContent = 'Crear artículo';
    }
    
    // Resetear el artículo actual
    this.currentArticle = null;
    
    // Resetear el formulario
    const articleForm = this.container.querySelector('.article-form');
    if (articleForm) {
      articleForm.reset();
      
      // Resetear el campo de slug
      const slugInput = articleForm.querySelector('#article-slug');
      if (slugInput) {
        slugInput.value = '';
        slugInput.dataset.edited = 'false';
      }
      
      // Resetear imagen destacada
      const featuredImagePreview = articleForm.querySelector('.featured-image-preview');
      if (featuredImagePreview) {
        featuredImagePreview.innerHTML = `<span class="text-gray-500">No hay imagen seleccionada</span>`;
      }
      
      // Ocultar botón para eliminar imagen
      const removeImageBtn = articleForm.querySelector('.remove-image-btn');
      if (removeImageBtn) {
        removeImageBtn.style.display = 'none';
      }
      
      // Limpiar input oculto de imagen
      let featuredImageInput = articleForm.querySelector('#article-image');
      if (!featuredImageInput) {
        featuredImageInput = articleForm.querySelector('#article-featured-image');
      }
      
      if (featuredImageInput) {
        featuredImageInput.value = '';
      }
      
      // Establecer fecha actual
      const dateInput = articleForm.querySelector('#article-date');
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
    
    // Inicializar el editor con contenido vacío
    setTimeout(() => this.initializeEditor(''), 500);
    
  } catch (error) {
    console.error('Error al crear nuevo artículo:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al crear nuevo artículo');
    }
  }
}

/**
 * Elimina un artículo
 * @param {string} slug - Slug del artículo a eliminar
 */
export async function deleteArticle(slug) {
  try {
    console.log(`Eliminando artículo con slug: ${slug}`);
    this.showLoading('Eliminando artículo...');
    
    // Confirmar eliminación
    const response = await this.contentManager.deleteArticle(slug);
    
    console.log('Respuesta de eliminación:', response);
    
    if (response && response.success) {
      if (this.notificationManager) {
        this.notificationManager.success('Artículo eliminado con éxito');
      }
      
      // Recargar lista de artículos
      await this.loadArticles();
    } else {
      throw new Error('No se pudo eliminar el artículo');
    }
    
    this.hideLoading();
  } catch (error) {
    console.error('Error al eliminar artículo:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al eliminar el artículo: ' + (error.message || ''));
    }
    this.hideLoading();
  }
}
