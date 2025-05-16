/**
 * Muestra el indicador de carga con un mensaje personalizado
 * @param {string} message - Mensaje a mostrar (opcional)
 */
export function showLoading(message = 'Cargando...') {
  try {
    // Crear o actualizar el overlay de carga
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
  } catch (error) {
    console.error('Error al mostrar indicador de carga:', error);
  }
}

/**
 * Oculta el indicador de carga
 */
export function hideLoading() {
  try {
    // Buscar overlay de carga
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
