/**
 * Muestra el indicador de carga con un mensaje personalizado
 * @param {string} message - Mensaje a mostrar (opcional)
 * @param {boolean} useGlobalOverlay - Si se debe usar un overlay global (opcional, por defecto true)
 */
export function showLoading(message = 'Cargando...', useGlobalOverlay = true) {
  if (this.container) {
    const loadingElement = this.container.querySelector('.loading');
    if (loadingElement) {
      loadingElement.textContent = message;
      loadingElement.style.display = 'flex';
    }
    this.container.querySelector('.articles-container')?.classList.add('is-loading');
  }

  if (!useGlobalOverlay) return;

  let loadingOverlay = document.querySelector('.loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-message"></div>';
    document.body.appendChild(loadingOverlay);
  }

  const messageElement = loadingOverlay.querySelector('.loading-message');
  if (messageElement) messageElement.textContent = message;

  loadingOverlay.style.display = 'flex';
  document.body.classList.add('loading');
}

/**
 * Oculta el indicador de carga
 * @param {boolean} hideGlobalOverlay - Si se debe ocultar el overlay global (opcional, por defecto true)
 */
export function hideLoading(hideGlobalOverlay = true) {
  if (this.container) {
    const loadingElement = this.container.querySelector('.loading');
    if (loadingElement) loadingElement.style.display = 'none';
    this.container.querySelector('.articles-container')?.classList.remove('is-loading');
  }

  if (!hideGlobalOverlay) return;

  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) loadingOverlay.style.display = 'none';
  document.body.classList.remove('loading');
}
