/**
 * Renderiza la lista de artículos
 * @param {Array} articles - Array de artículos a renderizar
 * @param {Object} options - Opciones de renderizado
 */
export function renderArticles(articles, options = {}) {
  try {
    console.log('Renderizando lista de artículos:', articles.length);
    
    const {
      currentPage = 1,
      totalPages = 1,
      category = ''
    } = options;
    
    // Mostrar la sección de lista de artículos
    this.renderArticlesList();
    
    // Obtener contenedor de artículos
    const articlesGrid = this.container.querySelector('.articles-grid');
    if (!articlesGrid) {
      console.error('No se encontró el contenedor para la lista de artículos');
      return;
    }
    
    // Si no hay artículos, mostrar mensaje
    if (!articles || articles.length === 0) {
      // Obtener término de búsqueda si existe
      const searchTerm = this.currentSearch ? ` con el término "${this.currentSearch}"` : '';
      const categoryText = category ? ` en la categoría "${category}"` : '';
      
      articlesGrid.innerHTML = `
        <div class="empty-state">
          <p>No se encontraron artículos${categoryText}${searchTerm}.</p>
          ${this.currentSearch || category ? `<button id="clear-search-results" class="secondary-btn">Mostrar todos los artículos</button>` : ''}
        </div>
      `;
      
      // Añadir evento al botón para limpiar búsqueda
      const clearBtn = articlesGrid.querySelector('#clear-search-results');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          // Limpiar campos de búsqueda
          const searchInput = this.container.querySelector('#article-search');
          const categoryFilter = this.container.querySelector('#category-filter');
          
          if (searchInput) searchInput.value = '';
          if (categoryFilter) categoryFilter.value = '';
          
          // Cargar todos los artículos
          this.loadArticles(1, '', '');
        });
      }
      
      // Ocultar paginación
      const paginationContainer = this.container.querySelector('.pagination');
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
      }
      
      return;
    }
    
    console.log('Procesando', articles.length, 'artículos para renderizar');
    
    // Verificar que articlesGrid exista
    if (!articlesGrid) {
      console.error('No se encontró el contenedor .articles-grid');
      return;
    }
    
    // Limpiar el grid antes de añadir nuevos artículos
    articlesGrid.innerHTML = '';
    
    // Crear un fragmento para mejorar el rendimiento
    const fragment = document.createDocumentFragment();
    
    // Procesar cada artículo
    articles.forEach(article => {
      try {
        // Verificar que el artículo tenga los datos mínimos necesarios
        if (!article || !article.slug) {
          console.warn('Artículo inválido:', article);
          return;
        }
        
        // Formatear fecha
        let formattedDate = 'Fecha desconocida';
        if (article.pubDate) {
          try {
            const date = new Date(article.pubDate);
            formattedDate = date.toLocaleDateString();
          } catch (error) {
            console.warn(`Error al formatear fecha para artículo ${article.slug}:`, error);
          }
        }
        
        // Crear el elemento del artículo
        const articleCard = document.createElement('div');
        articleCard.className = 'article-card';
        articleCard.dataset.slug = article.slug;
        
        // Crear HTML para el artículo
        articleCard.innerHTML = `
          <div class="article-image">
            ${article.featured_image 
              ? `<img src="${article.featured_image}" alt="${article.title || 'Artículo'}">`
              : `<div class="no-image">Sin imagen</div>`
            }
          </div>
          <div class="article-content">
            <h4 class="article-title">${article.title || 'Sin título'}</h4>
            <p class="article-description">${article.description || 'Sin descripción'}</p>
            <div class="article-meta">
              <span class="article-date">${formattedDate}</span>
              ${article.category ? `<span class="article-category">${article.category}</span>` : ''}
            </div>
          </div>
          <div class="article-actions">
            <button class="edit-btn" data-slug="${article.slug}">
              <span class="icon">✏️</span>
              <span>Editar</span>
            </button>
            <button class="delete-btn" data-slug="${article.slug}" data-title="${article.title || 'Sin título'}">
              <span class="icon">🚮</span>
              <span>Eliminar</span>
            </button>
          </div>
        `;
        
        // Añadir el artículo al fragmento
        fragment.appendChild(articleCard);
      } catch (error) {
        console.error(`Error al procesar artículo:`, error, article);
      }
    });
    
    // Añadir todos los artículos al grid de una sola vez
    articlesGrid.appendChild(fragment);
    
    // Verificar que se hayan añadido artículos
    console.log(`Se han renderizado ${articlesGrid.children.length} artículos en el grid`);
    
    // Configurar paginación
    renderPagination.call(this, currentPage, totalPages);
    
    // Configurar eventos para los botones de cada artículo
    setupArticleCardEvents.call(this);
    
  } catch (error) {
    console.error('Error al renderizar artículos:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al mostrar la lista de artículos');
    }
  }
}

/**
 * Configura los eventos para las tarjetas de artículos
 */
export function setupArticleCardEvents() {
  try {
    // Botones de editar artículo
    const editButtons = this.container.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.addEventListener('click', () => {
        const slug = button.dataset.slug;
        if (slug) {
          this.editArticle(slug);
        }
      });
    });
    
    // Botones de eliminar artículo
    const deleteButtons = this.container.querySelectorAll('.delete-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', () => {
        const slug = button.dataset.slug;
        const title = button.dataset.title;
        if (slug && title) {
          if (confirm(`¿Está seguro que desea eliminar el artículo "${title}"?`)) {
            this.deleteArticle(slug);
          }
        }
      });
    });
    
    // Hacer que las tarjetas sean clickeables para editar
    const articleCards = this.container.querySelectorAll('.article-card');
    articleCards.forEach(card => {
      card.addEventListener('click', (event) => {
        // Solo permitir clic en la tarjeta si no se hizo clic en un botón
        if (!event.target.closest('button')) {
          const slug = card.dataset.slug;
          if (slug) {
            this.editArticle(slug);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error al configurar eventos de tarjetas:', error);
  }
}

/**
 * Renderiza la paginación
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 */
export function renderPagination(currentPage, totalPages) {
  try {
    const paginationContainer = this.container.querySelector('.pagination');
    if (!paginationContainer) {
      console.error('No se encontró el contenedor para la paginación');
      return;
    }
    
    // Si no hay más de una página, ocultar paginación
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    // Determinar las páginas a mostrar
    let pages = [];
    
    // Siempre mostrar la primera página
    pages.push(1);
    
    // Para páginas intermedias
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    
    // Si hay saltos, agregar ellipsis
    if (currentPage - 1 > 2) {
      pages = [1, '...', ...pages.filter(p => p !== 1)];
    }
    
    // Siempre mostrar la última página si hay más de una
    if (totalPages > 1 && !pages.includes(totalPages)) {
      if (currentPage + 1 < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    
    // Crear botones de paginación
    const paginationHTML = `
      <button class="pagination-btn prev" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
      ${pages.map(page => {
        if (page === '...') {
          return '<span class="pagination-ellipsis">...</span>';
        }
        return `<button class="pagination-btn page-number ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`;
      }).join('')}
      <button class="pagination-btn next" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
    `;
    
    // Actualizar el contenedor de paginación
    paginationContainer.innerHTML = paginationHTML;
    
    // Configurar eventos de paginación
    this.setupPaginationEvents(currentPage, totalPages);
    
  } catch (error) {
    console.error('Error al renderizar paginación:', error);
  }
}

/**
 * Configura los eventos para la paginación
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 */
export function setupPaginationEvents(currentPage, totalPages) {
  try {
    // Botón de página anterior
    const prevButton = this.container.querySelector('.pagination-btn.prev');
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
          this.loadArticles(currentPage - 1, this.currentCategory);
        }
      });
    }
    
    // Botón de página siguiente
    const nextButton = this.container.querySelector('.pagination-btn.next');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
          this.loadArticles(currentPage + 1, this.currentCategory);
        }
      });
    }
    
    // Botones de número de página
    const pageButtons = this.container.querySelectorAll('.pagination-btn.page-number');
    pageButtons.forEach(button => {
      button.addEventListener('click', () => {
        const page = parseInt(button.dataset.page);
        if (page && page !== currentPage) {
          this.loadArticles(page, this.currentCategory);
        }
      });
    });
  } catch (error) {
    console.error('Error al configurar eventos de paginación:', error);
  }
}

/**
 * Muestra la lista de artículos y oculta el editor
 */
export function showArticlesList() {
  try {
    const articlesList = this.container.querySelector('.articles-list');
    const articleEditor = this.container.querySelector('.article-editor');
    
    if (articlesList) {
      articlesList.classList.add('active');
    }
    
    if (articleEditor) {
      articleEditor.classList.remove('active');
    }
    
    // Resetear el artículo actual
    this.currentArticle = null;
    
    // Destruir editor si existe
    if (this.editor && typeof this.editor.destroy === 'function') {
      this.editor.destroy();
      this.editor = null;
    }
  } catch (error) {
    console.error('Error al mostrar lista de artículos:', error);
  }
}

/**
 * Muestra el editor de artículos y oculta la lista
 */
export function showArticleEditor() {
  try {
    const articlesList = this.container.querySelector('.articles-list');
    const articleEditor = this.container.querySelector('.article-editor');
    
    if (articlesList) {
      articlesList.classList.remove('active');
    }
    
    if (articleEditor) {
      articleEditor.classList.add('active');
    }
  } catch (error) {
    console.error('Error al mostrar editor de artículos:', error);
  }
}

/**
 * Renderiza la lista de artículos
 */
export function renderArticlesList() {
  try {
    // Mostrar la sección de lista y ocultar editor
    this.showArticlesList();
    
    // Actualizar el filtro de categorías si es necesario
    const categoryFilter = this.container.querySelector('#category-filter');
    if (categoryFilter && this.currentCategory) {
      categoryFilter.value = this.currentCategory;
    }
  } catch (error) {
    console.error('Error al renderizar lista de artículos:', error);
  }
}
