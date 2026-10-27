import { escapeHtml } from '../../utils/html.js';

/**
 * Carga las categorías desde la API y actualiza los selectores
 */
export async function loadCategories() {
  try {
    const response = await this.contentManager.getCategories();
    const categories = response && Array.isArray(response.categories) ? response.categories : response;

    if (!Array.isArray(categories)) {
      console.error('Formato de categorías inesperado:', categories);
      return;
    }
    if (categories.length === 0) return;

    const categoryOptions = categories.map(category => {
      const slug = category.slug || category.id || '';
      const name = category.name || category.title || slug;
      return `<option value="${escapeHtml(slug)}">${escapeHtml(name)}</option>`;
    }).join('');

    const fill = (select, placeholder) => {
      if (!select) return;
      const currentValue = select.value;
      select.innerHTML = `<option value="">${placeholder}</option>${categoryOptions}`;
      if (currentValue) select.value = currentValue;
    };

    fill(this.container.querySelector('#category-filter'), 'Todas las categorías');
    fill(this.container.querySelector('#article-category'), 'Seleccionar categoría');
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    if (this.notificationManager) {
      this.notificationManager.warning('No se pudieron cargar las categorías. Intente nuevamente más tarde.');
    }
  }
}
