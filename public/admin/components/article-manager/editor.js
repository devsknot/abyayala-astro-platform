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
    
    // Mostrar todos los campos del artículo para depuración
    console.log('Datos del artículo procesados:', article);
    console.log('Campos del artículo:');
    for (const key in article) {
      console.log(`- ${key}: ${typeof article[key] === 'object' ? JSON.stringify(article[key]) : article[key]}`);
    }
    
    // Verificar que el artículo tenga contenido
    if (!article.content || article.content.trim() === '') {
      console.log('El artículo no tiene contenido o es vacío');
      // Intento de recuperar el contenido directamente usando la API de Cloudflare D1
      try {
        console.log('Intentando recuperar contenido completo del artículo...');
        const response = await fetch(`/api/content/articles/full/${article.slug}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const fullArticle = await response.json();
          if (fullArticle && fullArticle.content) {
            console.log('Contenido recuperado con éxito de la API alternativa');
            article.content = fullArticle.content;
            console.log('Nuevo contenido asignado:', article.content.substring(0, 100) + '...');
          }
        } else {
          console.warn('No se pudo recuperar el contenido completo:', response.status);
        }
      } catch (fetchError) {
        console.error('Error al intentar recuperar contenido completo:', fetchError);
      }
    } else {
      console.log(`Artículo con contenido de ${article.content.length} caracteres`);
      console.log('Muestra del contenido:', article.content.substring(0, 100) + '...');
    }
    
    // Super importante: mostrar el formato exacto del autor
    console.log('AUTOR DEL ARTÍCULO:', article.author);
    console.log('TIPO DE AUTOR:', typeof article.author);
    console.log('AUTOR_ID DEL ARTÍCULO:', article.author_id);
    
    if (!article) {
      throw new Error('Artículo no encontrado');
    }
    
    // Mostrar el editor y configurar la interfaz básica
    this.showArticleEditor();
    this.currentArticle = article;
    this.setupEditorInterface();
    
    // Cargar los datos del artículo en el formulario
    this.loadArticleDataIntoForm(article);
    
    // Ocultar el indicador de carga una vez que todo esté listo
    this.hideLoading();
    console.log('Artículo cargado correctamente, loader ocultado');
    
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
    console.log('Cargando datos del artículo en el formulario:', article);
    
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
      console.log('Elementos encontrados:', {
        titleInput: !!titleInput,
        descriptionInput: !!descriptionInput,
        categorySelect: !!categorySelect,
        dateInput: !!dateInput,
        slugInput: !!slugInput,
        authorSelect: !!authorSelect,
        tagsInput: !!tagsInput
      });
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
      console.log('DEPURACIÓN AUTORES:');
      console.log('- Autor del artículo:', article.author);
      console.log('- Author ID del artículo:', article.author_id);
      console.log('- Author Info:', article.author_info);
      console.log('- Opciones disponibles:', Array.from(authorSelect.options).map(o => ({value: o.value, text: o.text})));
      
      // Extraer información del autor del artículo
      let autorActual = (article.author || '').trim();
      let autorId = '';
      
      // Intentar obtener el ID del autor de diferentes fuentes
      if (article.author_id) {
        // Si el ID viene directamente en el artículo
        autorId = String(article.author_id).trim();
      } else if (article.author_info && article.author_info.id) {
        // Si el ID viene en el objeto author_info
        autorId = String(article.author_info.id).trim();
      }
      
      console.log('Datos procesados - Autor:', autorActual, 'ID:', autorId);
      
      // Manejar caso especial de "Autor desconocido"
      if (autorActual.toLowerCase() === 'autor desconocido') {
        console.log('Caso especial: "Autor desconocido" detectado, seleccionando primera opción disponible');
        
        // Comprobar si hay opciones disponibles y seleccionar la primera no vacía
        if (authorSelect.options.length > 1) { // Más de la opción "Seleccionar autor"
          authorSelect.selectedIndex = 1; // Seleccionar la primera opción real (no la opción vacía)
          console.log(`Seleccionando primera opción disponible: ${authorSelect.options[1].text}`);
          // Verificación final
          console.log('Autor seleccionado por defecto:', authorSelect.options[authorSelect.selectedIndex]?.text, 
                     '(valor:', authorSelect.value, ')');
        }
      } else {
        // Intentar seleccionar el autor por ID primero (más preciso)
        let autorEncontrado = false;
        
        if (autorId) {
          console.log('Intentando seleccionar autor por ID:', autorId);
          // Intentar seleccionar por ID
          authorSelect.value = autorId;
          
          // Verificar si se seleccionó correctamente
          if (authorSelect.value === autorId) {
            autorEncontrado = true;
            console.log('Autor seleccionado correctamente por ID:', authorSelect.options[authorSelect.selectedIndex].text);
          } else {
            console.log('No se pudo seleccionar por ID, intentando por nombre...');
          }
        }
        
        // Si no se encontró por ID, intentar por nombre
        if (!autorEncontrado && autorActual && autorActual.toLowerCase() !== 'autor desconocido') {
          console.log('Intentando seleccionar autor por nombre:', autorActual);
          
          // Buscar en las opciones por texto
          for (let i = 0; i < authorSelect.options.length; i++) {
            if (authorSelect.options[i].text.toLowerCase() === autorActual.toLowerCase()) {
              authorSelect.selectedIndex = i;
              autorEncontrado = true;
              console.log(`Autor encontrado por nombre en opción ${i}:`, authorSelect.options[i].text);
              break;
            }
          }
        }
        
        // Si aún no se encontró, añadir temporalmente (solo si no es "Autor desconocido")
        if (!autorEncontrado && autorActual && autorActual.toLowerCase() !== 'autor desconocido') {
          console.log(`Añadiendo autor temporal: ${autorActual}`);
          // Usar el ID si existe, de lo contrario usar un valor temporal
          const valorOption = autorId || `temp_${Date.now()}`;
          const newOption = new Option(autorActual, valorOption);
          authorSelect.add(newOption);
          authorSelect.value = valorOption;
        }
        
        // Verificación final
        const selectedOption = authorSelect.options[authorSelect.selectedIndex];
        console.log('Autor finalmente seleccionado:', 
                   selectedOption ? selectedOption.text : 'Ninguno', 
                   '(valor:', authorSelect.value, ')');
      }
    }
    
    // Cargar etiquetas
    if (tagsInput) {
      tagsInput.value = Array.isArray(article.tags) ? article.tags.join(', ') : (article.tags || '');
    }
    
    // Cargar imagen destacada (el campo estándar es featured_image)
    if (article.featured_image) {
      console.log('Imagen destacada encontrada (featured_image):', article.featured_image);
      this.loadFeaturedImage(article.featured_image);
    } else if (article.featuredImage) { // Posible nombre alternativo en camelCase
      console.log('Imagen destacada encontrada (featuredImage):', article.featuredImage);
      this.loadFeaturedImage(article.featuredImage);
    } else {
      console.warn('No se encontró imagen destacada para el artículo');
      // Buscar cualquier campo que pueda contener una URL de imagen
      for (const key in article) {
        if (typeof article[key] === 'string' && 
            (article[key].includes('/api/media/') || 
             article[key].includes('/media/') || 
             article[key].includes('/img/') || 
             article[key].includes('.jpg') || 
             article[key].includes('.png') || 
             article[key].includes('.jpeg'))) {
          console.log(`Posible imagen encontrada en campo '${key}':`, article[key]);
          this.loadFeaturedImage(article[key]);
          break;
        }
      }
    }
    
    // Verificar y registrar el contenido del artículo para depuración
    console.log('Contenido del artículo a cargar:', article.content ? article.content.substring(0, 100) + '...' : 'No hay contenido');
    console.log('Longitud del contenido:', article.content ? article.content.length : 0);
    
    // Guardar una referencia al contenido para asegurarnos de que no se pierda
    // Asegurarnos de que el contenido sea una cadena válida
    let articleContent = '';
    
    if (article.content) {
      // El contenido existe, usarlo directamente
      articleContent = article.content;
    } else if (article.body) {
      // Compatibilidad con campo alternativo 'body'
      console.log('Usando campo alternativo "body" para el contenido');
      articleContent = article.body;
    } else {
      console.warn('No se encontró contenido para el artículo');
    }
    
    // Verificar que el contenido sea una cadena
    if (typeof articleContent !== 'string') {
      console.warn('El contenido no es una cadena, intentando convertir');
      try {
        articleContent = String(articleContent || '');
      } catch (e) {
        console.error('Error al convertir contenido a cadena:', e);
        articleContent = '';
      }
    }
    
    // Cargar contenido en el editor (en un método separado para evitar anidamiento)
    // Aumentar el tiempo de espera para asegurar que el DOM esté listo
    setTimeout(() => {
      if (articleContent) {
        console.log('Iniciando carga de contenido en el editor...');
        console.log('Primeros 100 caracteres del contenido:', articleContent.substring(0, 100));
        this.initializeEditor(articleContent);
      } else {
        console.warn('No hay contenido para cargar en el editor');
        this.initializeEditor('');
      }
      
      // Ocultar el indicador de carga después de un tiempo adicional
      setTimeout(() => {
        this.hideLoading();
      }, 1500);
      
    }, 1000); // Aumentar el tiempo de espera para asegurar que el DOM esté completamente listo
    
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
      if (!imageUrl) {
        console.warn('URL de imagen vacía o no válida');
        return;
      }
      
      // Normalizar la URL de la imagen
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = '/' + imageUrl;
      }
      
      // Asegurarse de que la URL use el formato estándar para R2
      // El formato estándar es: /api/media/YYYY/MM/nombre-archivo.jpg
      if (imageUrl.includes('/api/media/')) {
        console.log('URL de imagen en formato R2 detectada');
      } else if (imageUrl.includes('/media/')) {
        // Convertir /media/ a /api/media/
        imageUrl = imageUrl.replace('/media/', '/api/media/');
        console.log('URL de imagen convertida a formato R2:', imageUrl);
      }
      
      console.log('URL de imagen normalizada:', imageUrl);
      
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
    
    // Verificar nuevamente que el contenido sea válido
    if (content) {
      console.log(`Preparando editor para contenido de ${content.length} caracteres`);
      console.log('Muestra del contenido a cargar:', content.substring(0, 100) + '...');
    } else {
      console.warn('Contenido vacío o no válido para el editor');
      content = ''; // Asegurar que sea una cadena vacía y no undefined
    }
    
    // Importar dinámicamente el editor (usando ruta absoluta para evitar problemas)
    import('/admin/components/content-editor.js')
      .then(module => {
        try {
          const ContentEditor = module.ContentEditor;
          
          // Inicializar el editor con el nuevo módulo
          this.editor = new ContentEditor(editorContainer);
          
          // Esperar un momento para asegurar que el editor esté completamente inicializado
          setTimeout(() => {
            try {
              // Establecer el contenido
              if (this.editor && typeof this.editor.setContent === 'function') {
                // Verificar que el contenido sea válido
                if (content && typeof content === 'string') {
                  console.log(`Estableciendo contenido en el editor (${content.length} caracteres)`);
                  console.log('Muestra del contenido a establecer:', content.substring(0, 100) + '...');
                  
                  // Establecer el contenido en el editor
                  this.editor.setContent(content);
                  console.log('Contenido establecido en el editor correctamente');
                  
                  // Verificar que el contenido se haya establecido correctamente
                  const editorContent = this.editor.getContent();
                  console.log(`Contenido verificado: ${editorContent ? 'OK' : 'FALLO'} (${editorContent ? editorContent.length : 0} caracteres)`);
                  
                  // Si el contenido no se estableció correctamente, intentar nuevamente
                  if (!editorContent || editorContent.length === 0) {
                    console.warn('El contenido no se estableció correctamente, intentando nuevamente...');
                    setTimeout(() => {
                      this.editor.setContent(content);
                      console.log('Segundo intento de establecer contenido completado');
                    }, 500);
                  }
                } else {
                  console.warn('Contenido inválido o vacío:', content);
                  this.editor.setContent(''); // Establecer contenido vacío como fallback
                }
              } else {
                console.error('El editor no tiene el método setContent o no está correctamente inicializado');
              }
            } catch (contentError) {
              console.error('Error al establecer contenido:', contentError);
              // Intentar con un enfoque alternativo
              try {
                const editorArea = editorContainer.querySelector('.editor-area');
                if (editorArea) {
                  console.log('Intentando establecer contenido directamente en el área editable');
                  editorArea.innerHTML = content || '';
                }
              } catch (fallbackError) {
                console.error('Error en el fallback para establecer contenido:', fallbackError);
              }
            } finally {
              this.hideLoading();
            }
          }, 1000); // Aumentar el tiempo de espera para asegurar que el editor esté completamente inicializado
          
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
          
          this.hideLoading();
        }
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
    
    // Variable para controlar si debemos actualizar la lista
    let isDeleted = false;
    
    try {
      // Intentar eliminar el artículo
      const response = await this.contentManager.deleteArticle(slug);
      console.log('Respuesta de eliminación:', response);
      
      if (response && response.success) {
        isDeleted = true;
        if (this.notificationManager) {
          this.notificationManager.success('Artículo eliminado con éxito');
        }
      }
    } catch (deleteError) {
      console.warn('Error durante la eliminación:', deleteError);
      
      // Si el error es 404, puede significar que el artículo ya fue eliminado
      if (deleteError.message && (deleteError.message.includes('404') || deleteError.message.includes('not found'))) {
        console.log('Artículo no encontrado (404), asumiendo que ya ha sido eliminado');
        isDeleted = true; // Consideramos que el artículo ya no está en la base de datos
        
        if (this.notificationManager) {
          this.notificationManager.info('El artículo ya fue eliminado o no existe');
        }
      } else {
        // Otros tipos de error
        if (this.notificationManager) {
          this.notificationManager.error('Error al eliminar el artículo: ' + (deleteError.message || ''));
        }
      }
    }
    
    // Si determinamos que el artículo fue eliminado o ya no existe,
    // actualizamos la lista de artículos
    if (isDeleted) {
      console.log('Actualizando lista después de la eliminación...');
      await this.loadArticles();
    }
    
    this.hideLoading();
  } catch (error) {
    // Error general en la función de eliminación
    console.error('Error al eliminar artículo:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al eliminar el artículo: ' + (error.message || ''));
    }
    this.hideLoading();
    
    // A pesar del error, intentamos actualizar la lista por si acaso
    try {
      await this.loadArticles();
    } catch (loadError) {
      console.error('Error adicional al recargar la lista:', loadError);
    }
  }
}
