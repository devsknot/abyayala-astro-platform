/**
 * Carga las categorías desde la API y actualiza los selectores
 */
export async function loadCategories() {
  try {
    // Obtener categorías desde la API
    const categories = await this.contentManager.getCategories();
    
    // Obtener el elemento select para el filtro de categorías
    const categoryFilter = this.container.querySelector('#category-filter');
    const articleCategorySelect = this.container.querySelector('#article-category');
    
    if (categories && categories.length > 0) {
      // Crear opciones para el filtro de categorías
      const categoryOptions = categories.map(category => `
        <option value="${category.slug}">${category.name}</option>
      `).join('');
      
      // Actualizar el filtro de categorías
      if (categoryFilter) {
        // Mantener la opción "Todas las categorías"
        categoryFilter.innerHTML = `
          <option value="">Todas las categorías</option>
          ${categoryOptions}
        `;
      }
      
      // Actualizar también el selector de categorías en el formulario de edición
      if (articleCategorySelect) {
        // Mantener la opción "Seleccionar categoría"
        articleCategorySelect.innerHTML = `
          <option value="">Seleccionar categoría</option>
          ${categoryOptions}
        `;
      }
    }
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    // No mostrar error al usuario, simplemente mantener las categorías predeterminadas
  }
}
