// Sistema de notificaciones (toasts) y diálogo de confirmación del panel.
// Los mensajes se insertan siempre como texto plano (textContent).
import { icon } from '../utils/icons.js';

const TOAST_ICONS = { success: 'check', error: 'error', warning: 'alert', info: 'info' };
const EXIT_MS = 200;

export class NotificationSystem {
  constructor() {
    this.container = null;
    this.timeout = 5000; // Duración predeterminada (ms)
    this.init();
  }

  init() {
    this.container = document.getElementById('notification-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'toast-region';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-relevant', 'additions');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Muestra una notificación.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration - ms; 0 = persistente (hasta que se cierre)
   * @returns {HTMLElement}
   */
  show(message, type = 'info', duration = this.timeout) {
    const kind = TOAST_ICONS[type] ? type : 'info';
    const toast = document.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.setAttribute('role', kind === 'error' || kind === 'warning' ? 'alert' : 'status');

    toast.innerHTML = `
      <span class="toast-icon">${icon(TOAST_ICONS[kind], { size: 20 })}</span>
      <div class="toast-message"></div>
      <button type="button" class="toast-close" aria-label="Cerrar notificación">${icon('close', { size: 16 })}</button>
    `;
    toast.querySelector('.toast-message').textContent = String(message ?? '');
    toast.querySelector('.toast-close').addEventListener('click', () => this.close(toast));

    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));

    if (duration > 0) {
      toast._timer = setTimeout(() => this.close(toast), duration);
    }
    return toast;
  }

  /** Cierra una notificación concreta. */
  close(toast) {
    if (!toast || toast._closing) return;
    toast._closing = true;
    if (toast._timer) clearTimeout(toast._timer);
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), EXIT_MS);
  }

  /** Cierra todas las notificaciones. */
  closeAll() {
    Array.from(this.container.children).forEach(toast => this.close(toast));
  }

  success(message, duration) { return this.show(message, 'success', duration); }
  error(message, duration) { return this.show(message, 'error', duration); }
  warning(message, duration) { return this.show(message, 'warning', duration); }
  info(message, duration) { return this.show(message, 'info', duration); }

  /**
   * Diálogo de confirmación modal.
   * @param {string} message
   * @param {string} [confirmText]
   * @param {string} [cancelText]
   * @param {{ danger?: boolean, title?: string }} [options] - por defecto, danger si el texto empieza por "Eliminar"
   * @returns {Promise<boolean>}
   */
  confirm(message, confirmText = 'Confirmar', cancelText = 'Cancelar', options = {}) {
    const danger = options.danger ?? /^eliminar/i.test(confirmText);
    const previousFocus = document.activeElement;

    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-backdrop';
      overlay.innerHTML = `
        <div class="modal-panel modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
          <div class="modal-body">
            <div class="confirm-layout">
              <span class="confirm-icon ${danger ? 'is-danger' : ''}">${icon(danger ? 'alert' : 'info', { size: 22 })}</span>
              <div>
                <h2 class="modal-title" id="confirm-title"></h2>
                <p class="confirm-message" id="confirm-message"></p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary cancel-btn"></button>
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} confirm-btn"></button>
          </div>
        </div>
      `;
      overlay.querySelector('.modal-title').textContent = options.title || (danger ? 'Confirmar eliminación' : 'Confirmar');
      overlay.querySelector('.confirm-message').textContent = String(message ?? '');
      const cancelBtn = overlay.querySelector('.cancel-btn');
      const confirmBtn = overlay.querySelector('.confirm-btn');
      cancelBtn.textContent = cancelText;
      confirmBtn.textContent = confirmText;

      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
      // En acciones destructivas el foco inicial va a "Cancelar"
      (danger ? cancelBtn : confirmBtn).focus();

      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKeydown, true);
        overlay.classList.remove('is-visible');
        setTimeout(() => overlay.remove(), EXIT_MS);
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        resolve(value);
      };

      const onKeydown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(false);
        } else if (event.key === 'Tab') {
          // Mantener el foco dentro del diálogo
          event.preventDefault();
          (document.activeElement === cancelBtn ? confirmBtn : cancelBtn).focus();
        }
      };
      document.addEventListener('keydown', onKeydown, true);

      confirmBtn.addEventListener('click', () => finish(true));
      cancelBtn.addEventListener('click', () => finish(false));
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) finish(false);
      });
    });
  }
}

// Instancia única para toda la aplicación
export const notifications = new NotificationSystem();
