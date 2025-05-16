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
        // Comprobar primero si hay un selector de archivos existente
        let fileInput = document.getElementById('featured-image-file-input');
        
        // Si no existe, crear uno nuevo
        if (!fileInput) {
          fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.id = 'featured-image-file-input';
          fileInput.accept = 'image/*';
          fileInput.style.display = 'none';
          document.body.appendChild(fileInput);
          
          // Manejar la selección de archivos
          fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
              this.handleImageUpload(file);
            }
          });
        }
        
        // Mostrar opciones de selección de imagen
        const options = [
          { text: 'Seleccionar desde biblioteca', action: 'library' },
          { text: 'Subir nueva imagen', action: 'upload' }
        ];
        
        // Crear diálogo de opciones
        const dialog = document.createElement('div');
        dialog.className = 'image-selection-dialog';
        dialog.innerHTML = `
          <div class="dialog-overlay"></div>
          <div class="dialog-content">
            <h4>Seleccionar imagen</h4>
            <div class="dialog-options">
              ${options.map(option => `
                <button class="dialog-option" data-action="${option.action}">
                  ${option.text}
                </button>
              `).join('')}
            </div>
            <button class="dialog-close">Cancelar</button>
          </div>
        `;
        
        // Añadir diálogo al DOM
        document.body.appendChild(dialog);
        
        // Manejar clics en las opciones
        dialog.querySelectorAll('.dialog-option').forEach(button => {
          button.addEventListener('click', () => {
            const action = button.dataset.action;
            
            // Cerrar diálogo
            document.body.removeChild(dialog);
            
            if (action === 'library') {
              // Usar la biblioteca de medios
              this.mediaManager.openMediaBrowser({
                onSelect: (media) => {
                  if (media && media.url) {
                    this.handleSelectedMedia(media);
                  }
                }
              });
            } else if (action === 'upload') {
              // Abrir selector de archivos
              fileInput.click();
            }
          });
        });
        
        // Cerrar diálogo al hacer clic en el botón de cerrar
        dialog.querySelector('.dialog-close').addEventListener('click', () => {
          document.body.removeChild(dialog);
        });
        
        // Cerrar diálogo al hacer clic en el overlay
        dialog.querySelector('.dialog-overlay').addEventListener('click', () => {
          document.body.removeChild(dialog);
        });
      });
    }
    
    // Método auxiliar para manejar la selección de medios desde la biblioteca
    this.handleSelectedMedia = (media) => {
      console.log('Imagen seleccionada desde biblioteca:', media);
      
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
    };
    
    // Método auxiliar para manejar la carga de imágenes
    this.handleImageUpload = async (file) => {
      try {
        console.log('Subiendo imagen:', file.name);
        this.showLoading('Subiendo imagen...');
        
        // Comprobar si hay un gestor de medios disponible
        if (!this.mediaManager) {
          throw new Error('No se encontró el gestor de medios');
        }
        
        // Subir la imagen usando el gestor de medios
        const response = await this.mediaManager.uploadMedia(file);
        console.log('Respuesta de carga:', response);
        
        if (response && (response.url || response.mediaUrl)) {
          // Obtener la URL de la imagen subida
          const imageUrl = response.url || response.mediaUrl;
          
          // Manejar la selección de medios con la nueva imagen
          this.handleSelectedMedia({
            url: imageUrl,
            name: file.name,
            type: file.type
          });
          
          if (this.notificationManager) {
            this.notificationManager.success('Imagen subida correctamente');
          }
        } else {
          throw new Error('No se recibió una URL válida después de la carga');
        }
      } catch (error) {
        console.error('Error al subir imagen:', error);
        
        if (this.notificationManager) {
          this.notificationManager.error('Error al subir la imagen: ' + (error.message || 'Error desconocido'));
        }
      } finally {
        this.hideLoading();
      }
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
