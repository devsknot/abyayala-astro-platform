import { escapeHtml, attrUrl } from '../../utils/html.js';

/**
 * Convierte la ruta de imagen guardada en una URL para la miniatura
 * @param {string} value
 */
function thumbnailUrl(value) {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return attrUrl(trimmed);
  return attrUrl(`/api/media/${trimmed}`);
}

/**
 * Renderiza la lista de artículos
 * @param {Array} articles - Array de artículos a renderizar
 * @param {Object} options - Opciones de renderizado
 */
export function renderArticles(articles, options = {}) {
  try {
    const { currentPage = 1, totalPages = 1, category = '' } = options;

    this.renderArticlesList();
    this.setupArticleCardEvents();

    const articlesGrid = this.container.querySelector('.articles-grid');
    if (!articlesGrid) return;

    if (!articles || articles.length === 0) {
      const searchTerm = this.currentSearch ? ` con el término "${this.currentSearch}"` : '';
      const categoryText = category ? ` en la categoría "${category}"` : '';

      articlesGrid.innerHTML = `
        <div class="empty-state">
          <p>${escapeHtml(`No se encontraron artículos${categoryText}${searchTerm}.`)}</p>
          ${this.currentSearch || category ? '<button type="button" class="secondary-btn clear-search-results">Mostrar todos los artículos</button>' : ''}
        </div>
      `;

      const paginationContainer = this.container.querySelector('.pagination');
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    articlesGrid.innerHTML = articles
      .filter(article => article && article.slug)
      .map(article => {
        const rawDate = article.pub_date || article.pubDate;
        const date = rawDate ? new Date(rawDate) : null;
        const formattedDate = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Fecha desconocida';
        const image = thumbnailUrl(article.featured_image);
        const title = escapeHtml(article.title || 'Sin título');
        const slug = escapeHtml(article.slug);

        return `
          <div class="article-card" data-slug="${slug}">
            <div class="article-image">
              ${image ? `<img src="${image}" alt="${title}" loading="lazy">` : '<div class="no-image">Sin imagen</div>'}
            </div>
            <div class="article-content">
              <h4 class="article-title">${title}</h4>
              <p class="article-description">${escapeHtml(article.description || 'Sin descripción')}</p>
              <div class="article-meta">
                <span class="article-date">${escapeHtml(formattedDate)}</span>
                ${article.category ? `<span class="article-category">${escapeHtml(article.category)}</span>` : ''}
              </div>
            </div>
            <div class="article-actions">
              <button type="button" class="edit-btn" data-slug="${slug}">
                <span class="icon">✏️</span>
                <span>Editar</span>
              </button>
              <button type="button" class="delete-btn" data-slug="${slug}">
                <span class="icon">🚮</span>
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    this.renderPagination(currentPage, totalPages);
  } catch (error) {
    console.error('Error al renderizar artículos:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al mostrar la lista de artículos');
    }
  }
}

/**
 * Configura (una sola vez) los listeners delegados de la lista y la paginación
 */
export function setupArticleCardEvents() {
  const articlesGrid = this.container.querySelector('.articles-grid');
  if (articlesGrid && !articlesGrid.dataset.bound) {
    articlesGrid.dataset.bound = '1';

    articlesGrid.addEventListener('click', async (event) => {
      if (event.target.closest('.clear-search-results')) {
        const searchInput = this.container.querySelector('#article-search');
        const categoryFilter = this.container.querySelector('#category-filter');
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        this.loadArticles(1, '', '');
        return;
      }

      const card = event.target.closest('.article-card');
      if (!card) return;
      const slug = card.dataset.slug;
      if (!slug) return;

      if (event.target.closest('.delete-btn')) {
        const article = (this.articles || []).find(a => a.slug === slug);
        const title = article?.title || slug;
        const confirmed = await this.notificationManager.confirm(
          `¿Está seguro que desea eliminar el artículo "${title}"?`,
          'Eliminar',
          'Cancelar'
        );
        if (confirmed) this.deleteArticle(slug);
        return;
      }

      // Botón editar o clic en cualquier otra parte de la tarjeta
      this.editArticle(slug);
    });

    // Miniaturas rotas: sustituir por "Sin imagen"
    articlesGrid.addEventListener('error', (event) => {
      const img = event.target;
      if (img.tagName === 'IMG' && img.closest('.article-image')) {
        const placeholder = document.createElement('div');
        placeholder.className = 'no-image';
        placeholder.textContent = 'Sin imagen';
        img.replaceWith(placeholder);
      }
    }, true);
  }

  const paginationContainer = this.container.querySelector('.pagination');
  if (paginationContainer && !paginationContainer.dataset.bound) {
    paginationContainer.dataset.bound = '1';
    paginationContainer.addEventListener('click', (event) => {
      const button = event.target.closest('.pagination-btn');
      if (!button || button.disabled) return;
      const page = parseInt(button.dataset.page, 10);
      if (page) this.loadArticles(page, this.currentCategory || '', this.currentSearch || '');
    });
  }
}

/**
 * Renderiza la paginación
 * @param {number} currentPage - Página actual
 * @param {number} totalPages - Total de páginas
 */
export function renderPagination(currentPage, totalPages) {
  currentPage = parseInt(currentPage, 10) || 1;
  totalPages = parseInt(totalPages, 10) || 1;

  const paginationContainer = this.container.querySelector('.pagination');
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  // Primera, vecinas de la actual y última, con elipsis en los saltos
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      if (pages.length && i - pages[pages.length - 1] > 1) pages.push('...');
      pages.push(i);
    }
  }

  paginationContainer.innerHTML = `
    <div class="pagination-controls">
      <button type="button" class="pagination-btn prev" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
      ${pages.map(page => page === '...'
        ? '<span class="pagination-ellipsis">...</span>'
        : `<button type="button" class="pagination-btn page-number ${page === currentPage ? 'active' : ''}" data-page="${page}">${page}</button>`
      ).join('')}
      <button type="button" class="pagination-btn next" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
    </div>
    <div class="pagination-info">Página ${currentPage} de ${totalPages}</div>
  `;

  if (!document.getElementById('pagination-styles')) {
    const style = document.createElement('style');
    style.id = 'pagination-styles';
    style.textContent = `
      .pagination { display: flex; flex-direction: column; align-items: center; margin-top: 20px; padding: 10px; }
      .pagination-controls { display: flex; align-items: center; gap: 5px; }
      .pagination-btn { padding: 8px 12px; border: 1px solid #e2e8f0; background-color: white; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
      .pagination-btn:hover:not([disabled]) { background-color: #f7fafc; border-color: #cbd5e0; }
      .pagination-btn.active { background-color: #4299e1; color: white; border-color: #4299e1; }
      .pagination-btn[disabled] { opacity: 0.5; cursor: not-allowed; }
      .pagination-ellipsis { padding: 8px 12px; color: #718096; }
      .pagination-info { margin-top: 10px; font-size: 0.875rem; color: #718096; }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Muestra la lista de artículos, oculta el editor y destruye TinyMCE
 */
export function showArticlesList() {
  const articlesList = this.container.querySelector('.articles-list');
  const articleEditor = this.container.querySelector('.article-editor');

  if (articlesList) {
    articlesList.classList.add('active');
    articlesList.style.display = 'block';
  }
  if (articleEditor) {
    articleEditor.classList.remove('active');
    articleEditor.style.display = 'none';
  }

  this.currentArticle = null;
  this.destroyEditor();
}

/**
 * Muestra el editor de artículos y oculta la lista
 */
export function showArticleEditor() {
  const articlesList = this.container.querySelector('.articles-list');
  const articleEditor = this.container.querySelector('.article-editor');

  if (articlesList) {
    articlesList.classList.remove('active');
    articlesList.style.display = 'none';
  }
  if (articleEditor) {
    articleEditor.classList.add('active');
    articleEditor.style.display = 'block';
    articleEditor.style.width = '100%';
    articleEditor.style.marginTop = '0';
    articleEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/**
 * Muestra la sección de lista y sincroniza el filtro de categorías
 */
export function renderArticlesList() {
  this.showArticlesList();
  const categoryFilter = this.container.querySelector('#category-filter');
  if (categoryFilter && this.currentCategory) {
    categoryFilter.value = this.currentCategory;
  }
}
