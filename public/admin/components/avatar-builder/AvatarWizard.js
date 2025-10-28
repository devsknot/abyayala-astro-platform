/**
 * Avatar Wizard - Modal wizard para crear/editar avatares
 */
import { AvatarBuilder } from './AvatarBuilder.js';

export class AvatarWizard {
  constructor() {
    this.avatarBuilder = null;
    this.currentStep = 'choice'; // choice, random, manual
    this.currentConfig = null;
    this.onSave = null;
    this.onCancel = null;
  }

  /**
   * Abre el wizard
   * @param {Object} existingConfig - Configuración existente del avatar (opcional)
   * @param {Function} onSave - Callback cuando se guarda
   * @param {Function} onCancel - Callback cuando se cancela
   */
  open(existingConfig = null, onSave = null, onCancel = null) {
    this.currentConfig = existingConfig;
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.currentStep = 'choice';
    
    this.render();
    this.show();
  }

  /**
   * Cierra el wizard
   */
  close() {
    const modal = document.getElementById('avatar-wizard-modal');
    if (modal) {
      modal.remove();
    }
  }

  /**
   * Muestra el modal
   */
  show() {
    const modal = document.getElementById('avatar-wizard-modal');
    if (modal) {
      setTimeout(() => {
        modal.classList.add('active');
      }, 10);
    }
  }

  /**
   * Renderiza el wizard completo
   */
  render() {
    // Eliminar modal existente si hay
    const existingModal = document.getElementById('avatar-wizard-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'avatar-wizard-modal';
    modal.className = 'avatar-wizard-modal';
    modal.innerHTML = `
      <div class="avatar-wizard-overlay"></div>
      <div class="avatar-wizard-container">
        <div class="avatar-wizard-header">
          <h2 class="avatar-wizard-title">
            ${this.currentConfig ? 'Editar Avatar' : 'Crear Avatar'}
          </h2>
          <button class="avatar-wizard-close" id="wizard-close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="avatar-wizard-body" id="wizard-body">
          ${this.renderStep()}
        </div>
        
        <div class="avatar-wizard-footer">
          <button class="btn btn-secondary" id="wizard-cancel-btn">Cancelar</button>
          <button class="btn btn-primary" id="wizard-save-btn" style="display: none;">Guardar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.attachEvents();
  }

  /**
   * Renderiza el paso actual
   */
  renderStep() {
    switch (this.currentStep) {
      case 'choice':
        return this.renderChoiceStep();
      case 'random':
        return this.renderRandomStep();
      case 'manual':
        return this.renderManualStep();
      default:
        return '';
    }
  }

  /**
   * Renderiza el paso de elección
   */
  renderChoiceStep() {
    return `
      <div class="wizard-step wizard-choice">
        <h3 class="step-title">¿Cómo quieres crear tu avatar?</h3>
        <p class="step-description">Elige una opción para comenzar</p>
        
        <div class="choice-cards">
          <div class="choice-card" id="choice-random">
            <div class="choice-icon">🎲</div>
            <h4>Aleatorio</h4>
            <p>Genera un avatar al azar y personalízalo si lo deseas</p>
          </div>
          
          <div class="choice-card" id="choice-manual">
            <div class="choice-icon">🎨</div>
            <h4>Manual</h4>
            <p>Personaliza cada detalle de tu avatar</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza el paso aleatorio
   */
  renderRandomStep() {
    return `
      <div class="wizard-step wizard-random">
        <div class="step-header">
          <button class="btn-back" id="wizard-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Volver
          </button>
          <h3 class="step-title">Avatar Aleatorio</h3>
        </div>
        
        <div class="random-preview">
          <div class="avatar-display">
            <img id="random-avatar-preview" src="" alt="Avatar Preview" />
          </div>
          
          <div class="random-controls">
            <button class="btn btn-large btn-primary" id="generate-random-btn">
              🎲 Generar Nuevo Avatar
            </button>
            
            <div class="style-selector">
              <label>Estilo:</label>
              <select id="random-style-select" class="form-control">
                <option value="avataaars">Avataaars - Personas</option>
                <option value="bottts">Bottts - Robots</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza el paso manual
   */
  renderManualStep() {
    return `
      <div class="wizard-step wizard-manual">
        <div class="step-header">
          <button class="btn-back" id="wizard-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Volver
          </button>
          <h3 class="step-title">Personalizar Avatar</h3>
        </div>
        
        <div id="manual-avatar-builder"></div>
      </div>
    `;
  }

  /**
   * Adjunta eventos a los elementos
   */
  attachEvents() {
    // Botón cerrar
    const closeBtn = document.getElementById('wizard-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.handleCancel());
    }

    // Botón cancelar
    const cancelBtn = document.getElementById('wizard-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    // Botón guardar
    const saveBtn = document.getElementById('wizard-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    // Overlay
    const overlay = document.querySelector('.avatar-wizard-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.handleCancel());
    }

    // Eventos específicos del paso
    this.attachStepEvents();
  }

  /**
   * Adjunta eventos específicos del paso actual
   */
  attachStepEvents() {
    switch (this.currentStep) {
      case 'choice':
        this.attachChoiceEvents();
        break;
      case 'random':
        this.attachRandomEvents();
        break;
      case 'manual':
        this.attachManualEvents();
        break;
    }
  }

  /**
   * Eventos del paso de elección
   */
  attachChoiceEvents() {
    const randomCard = document.getElementById('choice-random');
    const manualCard = document.getElementById('choice-manual');

    if (randomCard) {
      randomCard.addEventListener('click', () => {
        this.currentStep = 'random';
        this.updateStep();
      });
    }

    if (manualCard) {
      manualCard.addEventListener('click', () => {
        this.currentStep = 'manual';
        this.updateStep();
      });
    }
  }

  /**
   * Eventos del paso aleatorio
   */
  attachRandomEvents() {
    const backBtn = document.getElementById('wizard-back-btn');
    const generateBtn = document.getElementById('generate-random-btn');
    const styleSelect = document.getElementById('random-style-select');
    const saveBtn = document.getElementById('wizard-save-btn');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.currentStep = 'choice';
        this.updateStep();
      });
    }

    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.generateRandomAvatar();
      });
    }

    if (styleSelect) {
      styleSelect.addEventListener('change', () => {
        this.generateRandomAvatar();
      });
    }

    // Mostrar botón guardar
    if (saveBtn) {
      saveBtn.style.display = 'inline-block';
    }

    // Generar avatar inicial
    this.generateRandomAvatar();
  }

  /**
   * Eventos del paso manual
   */
  attachManualEvents() {
    const backBtn = document.getElementById('wizard-back-btn');
    const saveBtn = document.getElementById('wizard-save-btn');
    const container = document.getElementById('manual-avatar-builder');

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.currentStep = 'choice';
        this.updateStep();
      });
    }

    // Mostrar botón guardar
    if (saveBtn) {
      saveBtn.style.display = 'inline-block';
    }

    // Inicializar Avatar Builder
    if (container) {
      this.avatarBuilder = new AvatarBuilder(container);
      
      if (this.currentConfig) {
        this.avatarBuilder.loadConfig(this.currentConfig);
      } else {
        this.avatarBuilder.render();
      }
    }
  }

  /**
   * Actualiza el paso actual
   */
  updateStep() {
    const body = document.getElementById('wizard-body');
    if (body) {
      body.innerHTML = this.renderStep();
      this.attachStepEvents();
    }
  }

  /**
   * Genera un avatar aleatorio
   */
  generateRandomAvatar() {
    const styleSelect = document.getElementById('random-style-select');
    const preview = document.getElementById('random-avatar-preview');
    
    if (!styleSelect || !preview) return;

    const style = styleSelect.value;
    const seed = Math.random().toString(36).substring(7);
    
    // Crear configuración aleatoria
    this.currentConfig = {
      style: style,
      seed: seed,
      options: {},
      url: `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`
    };

    // Actualizar preview
    preview.src = this.currentConfig.url;
  }

  /**
   * Maneja el guardado
   */
  handleSave() {
    let config = null;

    if (this.currentStep === 'random') {
      config = this.currentConfig;
    } else if (this.currentStep === 'manual' && this.avatarBuilder) {
      config = this.avatarBuilder.getConfig();
    }

    if (config && this.onSave) {
      this.onSave(config);
    }

    this.close();
  }

  /**
   * Maneja la cancelación
   */
  handleCancel() {
    if (this.onCancel) {
      this.onCancel();
    }
    this.close();
  }
}
