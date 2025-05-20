/**
 * Carga los autores desde la API y actualiza los selectores
 */
export async function loadAuthors() {
  try {
    console.log('Cargando autores...');
    
    // Obtener autores desde la API
    const response = await this.contentManager.getAuthors();
    console.log('Respuesta de autores:', response);
    
    // Manejar diferentes formatos de respuesta (objeto vs array)
    let authors = response;
    if (response && response.authors) {
      authors = response.authors;
    }
    
    // Verificar si los autores son un array
    if (!Array.isArray(authors)) {
      console.error('Formato de autores inesperado:', authors);
      return;
    }
    
    console.log(`Se encontraron ${authors.length} autores`);
    
    // Obtener el elemento select para autores en el formulario
    const articleAuthorSelect = this.container.querySelector('#article-author');
    
    if (authors && authors.length > 0) {
      // Crear opciones para el selector de autores
      const authorOptions = authors.map(author => {
        // Usar el ID como valor y el nombre como texto mostrado
        const name = author.name || 'Sin nombre';
        const id = author.id || ''; // Usar el ID numérico de la base de datos
        
        console.log(`Opción de autor generada: Nombre=${name}, ID=${id}, Slug=${author.slug}`);
        return `<option value="${id}" data-slug="${author.slug || ''}" data-name="${name}">${name}</option>`;
      }).join('');
      
      // Actualizar el selector de autores
      if (articleAuthorSelect) {
        console.log('Actualizando selector de autores');
        // Incluir una opción por defecto
        articleAuthorSelect.innerHTML = `
          <option value="">Seleccionar autor</option>
          ${authorOptions}
        `;
      } else {
        console.warn('No se encontró el selector de autores en el formulario');
      }
    }
  } catch (error) {
    console.error('Error al cargar autores:', error);
    if (this.notificationManager) {
      this.notificationManager.error('Error al cargar la lista de autores');
    }
  }
}
