import { escapeHtml } from '../../utils/html.js';

/**
 * Carga los autores desde la API y actualiza los selectores
 */
export async function loadAuthors() {
  try {
    const response = await this.contentManager.getAuthors();
    const authors = response && Array.isArray(response.authors) ? response.authors : response;

    if (!Array.isArray(authors)) {
      console.error('Formato de autores inesperado:', authors);
      return;
    }

    const articleAuthorSelect = this.container.querySelector('#article-author');
    if (!articleAuthorSelect || authors.length === 0) return;

    // Conservar la selección actual si el selector ya tenía valor
    const currentValue = articleAuthorSelect.value;

    const authorOptions = authors.map(author => {
      const name = escapeHtml(author.name || 'Sin nombre');
      return `<option value="${escapeHtml(author.id ?? '')}" data-slug="${escapeHtml(author.slug || '')}" data-name="${name}">${name}</option>`;
    }).join('');

    articleAuthorSelect.innerHTML = `<option value="">Seleccionar autor</option>${authorOptions}`;
    if (currentValue) articleAuthorSelect.value = currentValue;
  } catch (error) {
    console.error('Error al cargar autores:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al cargar la lista de autores');
    }
  }
}
