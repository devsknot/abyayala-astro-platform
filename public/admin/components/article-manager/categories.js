/**
 * Carga las categorías desde la API y actualiza los selectores
 */
export async function loadCategories() {
  try {
    console.log('Cargando categorías...');
    
    // Obtener categorías desde la API
    const response = await this.contentManager.getCategories();
    console.log('Respuesta de categorías:', response);
    
    // Manejar diferentes formatos de respuesta (objeto vs array)
    let categories = response;
    if (response && response.categories) {
      categories = response.categories;
    }
    
    // Verificar si las categorías son un array
    if (!Array.isArray(categories)) {
      console.error('Formato de categorías inesperado:', categories);
      return;
    }
    
    console.log(`Se encontraron ${categories.length} categorías`);
    
    // Obtener el elemento select para el filtro de categorías
    const categoryFilter = this.container.querySelector('#category-filter');
    const articleCategorySelect = this.container.querySelector('#article-category');
    
    if (categories && categories.length > 0) {
      // Crear opciones para el filtro de categorías
      const categoryOptions = categories.map(category => {
        // Extraer slug y name, considerando diferentes estructuras de datos
        const slug = category.slug || category.id || '';
        const name = category.name || category.title || slug;
        
        return `<option value="${slug}">${name}</option>`;
      }).join('');
      
      // Actualizar el filtro de categorías
      if (categoryFilter) {
        console.log('Actualizando filtro de categorías');
        // Mantener la opción "Todas las categorías"
        categoryFilter.innerHTML = `
          <option value="">Todas las categorías</option>
          ${categoryOptions}
        `;
      } else {
        console.warn('No se encontró el filtro de categorías');
      }
      
      // Actualizar también el selector de categorías en el formulario de edición
      if (articleCategorySelect) {
        console.log('Actualizando selector de categorías en el formulario');
        // Mantener la opción "Seleccionar categoría"
        articleCategorySelect.innerHTML = `
          <option value="">Seleccionar categoría</option>
          ${categoryOptions}
        `;
      } else {
        console.warn('No se encontró el selector de categorías en el formulario');
      }
      
      console.log('Categorías cargadas correctamente');
    } else {
      console.warn('No se encontraron categorías');
    }
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    if (this.notificationManager) {
      this.notificationManager.warning('No se pudieron cargar las categorías. Intente nuevamente más tarde.');
    }
  }
}
