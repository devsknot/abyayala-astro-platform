/**
 * Muestra el indicador de carga con un mensaje personalizado
 * @param {string} message - Mensaje a mostrar (opcional)
 * @param {boolean} useGlobalOverlay - Si se debe usar un overlay global (opcional, por defecto true)
 */
export function showLoading(message = 'Cargando...', useGlobalOverlay = true) {
  try {
    // Actualizar cualquier elemento de carga local en el contenedor
    if (this.container) {
      const loadingElement = this.container.querySelector('.loading');
      if (loadingElement) {
        loadingElement.innerHTML = message;
        loadingElement.style.display = 'flex';
      }

      // También actualizar el contenedor de artículos si existe
      const articlesContainer = this.container.querySelector('.articles-container');
      if (articlesContainer) {
        articlesContainer.classList.add('is-loading');
      }

      // Ocultar la grilla de artículos durante la carga
      const articlesGrid = this.container.querySelector('.articles-grid');
      if (articlesGrid) {
        articlesGrid.style.display = 'none';
      }
    }

    // Si no queremos usar el overlay global, terminamos aquí
    if (!useGlobalOverlay) return;
    
    // Crear o actualizar el overlay de carga global
    let loadingOverlay = document.querySelector('.loading-overlay');
    
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      document.body.appendChild(loadingOverlay);
    }
    
    // Actualizar contenido
    loadingOverlay.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-message">${message}</div>
    `;
    
    // Mostrar overlay
    loadingOverlay.style.display = 'flex';
    document.body.classList.add('loading');

    console.log(`Indicador de carga mostrado: ${message}`);
  } catch (error) {
    console.error('Error al mostrar indicador de carga:', error);
  }
}

/**
 * Oculta el indicador de carga
 * @param {boolean} hideGlobalOverlay - Si se debe ocultar el overlay global (opcional, por defecto true)
 */
export function hideLoading(hideGlobalOverlay = true) {
  try {
    console.log('Ocultando indicador de carga...');

    // Actualizar cualquier elemento de carga local en el contenedor
    if (this.container) {
      const loadingElement = this.container.querySelector('.loading');
      if (loadingElement) {
        loadingElement.style.display = 'none';
      }

      // También actualizar el contenedor de artículos si existe
      const articlesContainer = this.container.querySelector('.articles-container');
      if (articlesContainer) {
        articlesContainer.classList.remove('is-loading');
      }

      // Mostrar la grilla de artículos después de la carga
      const articlesGrid = this.container.querySelector('.articles-grid');
      if (articlesGrid) {
        articlesGrid.style.display = 'grid';
      }
    }

    // Si no queremos ocultar el overlay global, terminamos aquí
    if (!hideGlobalOverlay) return;
    
    // Buscar overlay de carga global
    const loadingOverlay = document.querySelector('.loading-overlay');
    
    // Ocultar si existe
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
    
    // Remover clase de carga del body
    document.body.classList.remove('loading');
  } catch (error) {
    console.error('Error al ocultar indicador de carga:', error);
  }
}
