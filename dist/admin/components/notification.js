// Sistema de notificaciones para el CMS
export class NotificationSystem {
  constructor() {
    this.container = null;
    this.timeout = 5000; // Duración predeterminada de las notificaciones (5 segundos)
    this.init();
  }

  init() {
    // Crear el contenedor de notificaciones si no existe
    if (!document.getElementById('notification-container')) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('notification-container');
    }
  }

  /**
   * Mostrar una notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de notificación: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duración en ms (0 para que no desaparezca automáticamente)
   */
  show(message, type = 'info', duration = this.timeout) {
    // Crear el elemento de notificación
    const notification = document.createElement('div');
    
    // Configurar clases según el tipo
    const baseClasses = 'flex items-center p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full';
    const typeClasses = {
      success: 'bg-green-100 border-l-4 border-green-500 text-green-700',
      error: 'bg-red-100 border-l-4 border-red-500 text-red-700',
      warning: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700',
      info: 'bg-blue-100 border-l-4 border-blue-500 text-blue-700'
    };
    
    notification.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;
    
    // Iconos según el tipo
    const icons = {
      success: `<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>`,
      error: `<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>`,
      warning: `<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>`,
      info: `<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`
    };
    
    // Contenido de la notificación
    notification.innerHTML = `
      <div class="flex items-center">
        ${icons[type] || icons.info}
        <div class="flex-1">${message}</div>
        <button type="button" class="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Cerrar">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Añadir al contenedor
    this.container.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 10);
    
    // Configurar botón de cierre
    const closeButton = notification.querySelector('button');
    closeButton.addEventListener('click', () => {
      this.close(notification);
    });
    
    // Auto-cerrar después de la duración especificada (si no es 0)
    if (duration > 0) {
      setTimeout(() => {
        this.close(notification);
      }, duration);
    }
    
    return notification;
  }

  /**
   * Cerrar una notificación específica
   * @param {HTMLElement} notification - Elemento de notificación a cerrar
   */
  close(notification) {
    // Animar salida
    notification.classList.add('translate-x-full');
    notification.classList.add('opacity-0');
    
    // Eliminar después de la animación
    setTimeout(() => {
      if (notification.parentNode === this.container) {
        this.container.removeChild(notification);
      }
    }, 300);
  }

  /**
   * Cerrar todas las notificaciones
   */
  closeAll() {
    const notifications = this.container.querySelectorAll('div');
    notifications.forEach(notification => {
      this.close(notification);
    });
  }

  // Métodos de conveniencia
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  /**
   * Mostrar un diálogo de confirmación
   * @param {string} message - Mensaje a mostrar
   * @param {string} confirmText - Texto del botón de confirmación
   * @param {string} cancelText - Texto del botón de cancelación
   * @returns {Promise} - Promesa que se resuelve con true (confirmación) o false (cancelación)
   */
  confirm(message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise(resolve => {
      // Crear el fondo oscuro
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
      
      // Crear el diálogo
      const dialog = document.createElement('div');
      dialog.className = 'bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform scale-95 transition-transform duration-300';
      
      dialog.innerHTML = `
        <div class="mb-4">${message}</div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary cancel-btn">${cancelText}</button>
          <button type="button" class="btn-primary confirm-btn">${confirmText}</button>
        </div>
      `;
      
      // Añadir al DOM
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
      
      // Animar entrada
      setTimeout(() => {
        dialog.classList.remove('scale-95');
      }, 10);
      
      // Configurar eventos
      const confirmBtn = dialog.querySelector('.confirm-btn');
      const cancelBtn = dialog.querySelector('.cancel-btn');
      
      const cleanup = () => {
        // Animar salida
        dialog.classList.add('scale-95');
        overlay.classList.add('opacity-0');
        
        // Eliminar después de la animación
        setTimeout(() => {
          document.body.removeChild(overlay);
        }, 300);
      };
      
      confirmBtn.addEventListener('click', () => {
        cleanup();
        resolve(true);
      });
      
      cancelBtn.addEventListener('click', () => {
        cleanup();
        resolve(false);
      });
      
      // También permitir cerrar haciendo clic fuera del diálogo
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      });
    });
  }
}

// Exportar una instancia única para usar en toda la aplicación
export const notifications = new NotificationSystem();
