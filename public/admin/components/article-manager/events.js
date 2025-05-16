/**
 * Configura los eventos del gestor de artículos
 */
export function setupEvents() {
  try {
    console.log('Configurando eventos del gestor de artículos...');
    
    // Botón para crear un nuevo artículo
    const createBtn = this.container.querySelector('.create-article-btn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        this.createArticle();
      });
    }
    
    // Botón para volver a la lista de artículos
    const backButton = this.container.querySelector('.back-to-list-btn');
    if (backButton) {
      backButton.addEventListener('click', () => {
        this.showArticlesList();
      });
    }
    
    // Botón para cancelar la edición
    const cancelBtn = this.container.querySelector('.cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.showArticlesList();
      });
    }
    
    // Formulario de artículo
    const articleForm = this.container.querySelector('.article-form');
    if (articleForm) {
      articleForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.saveArticle();
      });
    }
    
    // Filtro de categorías
    const categoryFilter = this.container.querySelector('#category-filter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        const selectedCategory = categoryFilter.value;
        this.loadArticles(1, selectedCategory);
      });
    }
    
    // Búsqueda de artículos
    const searchBtn = this.container.querySelector('#search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const searchInput = this.container.querySelector('#article-search');
        if (searchInput) {
          const searchTerm = searchInput.value.trim();
          this.loadArticles(1, this.currentCategory, searchTerm);
        }
      });
    }
    
    // Input de búsqueda (al presionar Enter)
    const searchInput = this.container.querySelector('#article-search');
    if (searchInput) {
      searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const searchTerm = searchInput.value.trim();
          this.loadArticles(1, this.currentCategory, searchTerm);
        }
      });
    }
    
    // Campo de título (para generar el slug)
    const titleInput = this.container.querySelector('#article-title');
    const slugInput = this.container.querySelector('#article-slug');
    if (titleInput && slugInput) {
      titleInput.addEventListener('input', () => {
        // Solo generar el slug si no ha sido editado manualmente
        if (!slugInput.dataset.edited || slugInput.dataset.edited === 'false') {
          const title = titleInput.value.trim();
          const slug = this.generateSlug(title);
          slugInput.value = slug;
        }
      });
      
      // Marcar el slug como editado cuando el usuario lo modifica
      slugInput.addEventListener('input', () => {
        slugInput.dataset.edited = 'true';
      });
    }
    
    // Botón para seleccionar imagen destacada
    const selectImageBtn = this.container.querySelector('.select-image-btn');
    if (selectImageBtn && this.mediaManager) {
      selectImageBtn.addEventListener('click', () => {
        this.mediaManager.openMediaBrowser({
          onSelect: (media) => {
            if (media && media.url) {
              console.log('Imagen seleccionada:', media);
              
              // Actualizar la vista previa
              const featuredImagePreview = this.container.querySelector('.featured-image-preview');
              if (featuredImagePreview) {
                this.updateFeaturedImagePreview(media.url, featuredImagePreview);
              }
              
              // Actualizar el valor del input oculto
              let featuredImageInput = this.container.querySelector('#article-image');
              if (!featuredImageInput) {
                featuredImageInput = this.container.querySelector('#article-featured-image');
              }
              
              if (!featuredImageInput) {
                console.log('Creando input oculto para la imagen destacada...');
                const featuredImageContainer = this.container.querySelector('.featured-image-container');
                if (featuredImageContainer) {
                  featuredImageInput = document.createElement('input');
                  featuredImageInput.type = 'hidden';
                  featuredImageInput.id = 'article-featured-image';
                  featuredImageInput.name = 'featured_image';
                  featuredImageContainer.appendChild(featuredImageInput);
                }
              }
              
              if (featuredImageInput) {
                featuredImageInput.value = media.url;
              }
              
              // Mostrar botón para eliminar
              const removeImageBtn = this.container.querySelector('.remove-image-btn');
              if (removeImageBtn) {
                removeImageBtn.style.display = 'inline-block';
              }
            }
          }
        });
      });
    }
    
    // Botón para eliminar imagen destacada
    const removeImageBtn = this.container.querySelector('.remove-image-btn');
    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => {
        // Resetear la vista previa
        const featuredImagePreview = this.container.querySelector('.featured-image-preview');
        if (featuredImagePreview) {
          featuredImagePreview.innerHTML = `<span class="text-gray-500">No hay imagen seleccionada</span>`;
        }
        
        // Limpiar el valor del input oculto
        let featuredImageInput = this.container.querySelector('#article-image');
        if (!featuredImageInput) {
          featuredImageInput = this.container.querySelector('#article-featured-image');
        }
        
        if (featuredImageInput) {
          featuredImageInput.value = '';
        }
        
        // Ocultar el botón de eliminar
        removeImageBtn.style.display = 'none';
      });
    }
    
    console.log('Eventos configurados correctamente');
  } catch (error) {
    console.error('Error al configurar eventos:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al configurar eventos del gestor de artículos');
    }
  }
}

/**
 * Genera un slug a partir de un texto
 * @param {string} text - Texto a convertir en slug
 * @returns {string} Slug generado
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Cambiar espacios por guiones
    .replace(/-+/g, '-') // Evitar guiones duplicados
    .substring(0, 50); // Limitar longitud
}

/**
 * Guarda un artículo (nuevo o existente)
 */
export async function saveArticle() {
  try {
    console.log('Guardando artículo...');
    this.showLoading('Guardando artículo...');
    
    // Recopilar datos del formulario
    const titleInput = this.container.querySelector('#article-title');
    const descriptionInput = this.container.querySelector('#article-description');
    const categorySelect = this.container.querySelector('#article-category');
    const dateInput = this.container.querySelector('#article-date');
    const slugInput = this.container.querySelector('#article-slug');
    const authorSelect = this.container.querySelector('#article-author');
    const tagsInput = this.container.querySelector('#article-tags');
    
    if (!titleInput || !slugInput) {
      throw new Error('Faltan campos requeridos en el formulario');
    }
    
    const title = titleInput.value.trim();
    const slug = slugInput.value.trim();
    
    if (!title) {
      this.notificationManager.warning('Por favor ingrese un título para el artículo');
      titleInput.focus();
      this.hideLoading();
      return;
    }
    
    if (!slug) {
      this.notificationManager.warning('Por favor ingrese un slug para el artículo');
      slugInput.focus();
      this.hideLoading();
      return;
    }
    
    // Preparar datos del artículo
    const articleData = {
      title,
      slug,
      description: descriptionInput ? descriptionInput.value.trim() : '',
      category: categorySelect ? categorySelect.value : '',
      pubDate: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
      content: this.editor ? this.editor.getContent() : ''
    };
    
    // Manejar autor si existe
    if (authorSelect && authorSelect.value) {
      articleData.author_id = authorSelect.value;
    }
    
    // Manejar etiquetas si existen
    if (tagsInput && tagsInput.value.trim()) {
      const tagsString = tagsInput.value.trim();
      articleData.tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    }
    
    // Manejar imagen destacada
    let featuredImageInput = this.container.querySelector('#article-image');
    if (!featuredImageInput) {
      featuredImageInput = this.container.querySelector('#article-featured-image');
    }
    
    if (featuredImageInput && featuredImageInput.value) {
      articleData.featured_image = featuredImageInput.value;
    }
    
    console.log('Datos del artículo a guardar:', articleData);
    
    // Determinar si es crear o actualizar
    let response;
    if (this.currentArticle && this.currentArticle.id) {
      // Actualizar artículo existente
      console.log(`Actualizando artículo con ID: ${this.currentArticle.id}`);
      articleData.id = this.currentArticle.id;
      response = await this.contentManager.updateArticle(articleData);
      
      if (response) {
        this.notificationManager.success('Artículo actualizado con éxito');
      } else {
        throw new Error('No se recibió respuesta al actualizar el artículo');
      }
    } else {
      // Crear nuevo artículo
      console.log('Creando nuevo artículo');
      response = await this.contentManager.createArticle(articleData);
      
      if (response) {
        this.notificationManager.success('Artículo creado con éxito');
      } else {
        throw new Error('No se recibió respuesta al crear el artículo');
      }
    }
    
    console.log('Respuesta del servidor:', response);
    
    // Volver a la lista y recargar artículos
    this.showArticlesList();
    await this.loadArticles();
    
    this.hideLoading();
  } catch (error) {
    console.error('Error al guardar artículo:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al guardar el artículo: ' + (error.message || ''));
    }
    this.hideLoading();
  }
}
