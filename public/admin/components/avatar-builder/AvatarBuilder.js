/**
 * Avatar Builder - Generador de avatares personalizables con DiceBear
 */
export class AvatarBuilder {
  constructor(container) {
    this.container = container;
    this.currentConfig = {
      style: 'avataaars',
      seed: '',
      options: {}
    };
    
    // Estilos disponibles de DiceBear
    this.styles = [
      { id: 'avataaars', name: 'Avataaars', description: 'Estilo ilustrado popular' },
      { id: 'bottts', name: 'Bottts', description: 'Robots adorables' },
      { id: 'personas', name: 'Personas', description: 'Personas realistas' },
      { id: 'lorelei', name: 'Lorelei', description: 'Estilo moderno' },
      { id: 'adventurer', name: 'Aventurero', description: 'Personajes de aventura' },
      { id: 'big-ears', name: 'Big Ears', description: 'Orejas grandes' },
      { id: 'pixel-art', name: 'Pixel Art', description: 'Estilo retro 8-bit' }
    ];
    
    // Opciones de personalización por estilo
    this.styleOptions = {
      avataaars: {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9'],
        eyes: ['close', 'cry', 'default', 'dizzy', 'eyeRoll', 'happy', 'hearts', 'side', 'squint', 'surprised', 'wink', 'winkWacky'],
        mouth: ['concerned', 'default', 'disbelief', 'eating', 'grimace', 'sad', 'screamOpen', 'serious', 'smile', 'tongue', 'twinkle', 'vomit'],
        hairColor: ['auburn', 'black', 'blonde', 'brown', 'pastelPink', 'platinum', 'red', 'silverGray'],
        skinColor: ['tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black']
      },
      bottts: {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9'],
        eyes: ['bulging', 'dizzy', 'eva', 'frame1', 'frame2', 'glow', 'happy', 'hearts', 'robocop', 'round', 'roundFrame01', 'roundFrame02', 'sensor', 'shade01'],
        mouth: ['bite', 'diagram', 'grill01', 'grill02', 'grill03', 'smile01', 'smile02', 'square01', 'square02'],
        primaryColor: ['0a5b83', '1c799f', '69d2e7', 'f88c49', 'f9c9b6', 'fc909f']
      },
      personas: {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9'],
        eyes: ['open', 'sleep', 'wink'],
        hair: ['long01', 'long02', 'long03', 'short01', 'short02', 'short03', 'short04'],
        hairColor: ['0e0e0e', '3eac2c', '6a4e35', '85c2c6', 'a55728', 'e5d7a3']
      },
      lorelei: {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9']
      },
      adventurer: {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9']
      },
      'big-ears': {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9']
      },
      'pixel-art': {
        backgroundColor: ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1d4f9', 'c0e8f9']
      }
    };
  }
  
  /**
   * Renderiza el Avatar Builder
   */
  render() {
    const html = `
      <div class="avatar-builder">
        <div class="avatar-preview">
          <img id="avatar-preview-img" src="${this.getAvatarUrl()}" alt="Avatar Preview" />
        </div>
        
        <div class="avatar-controls">
          <div class="form-group">
            <label class="form-label">Estilo de Avatar</label>
            <select id="avatar-style" class="form-control">
              ${this.styles.map(style => `
                <option value="${style.id}" ${this.currentConfig.style === style.id ? 'selected' : ''}>
                  ${style.name} - ${style.description}
                </option>
              `).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label class="form-label">Nombre/Semilla (para generar avatar único)</label>
            <input type="text" id="avatar-seed" class="form-control" value="${this.currentConfig.seed}" placeholder="Ej: Juan Pérez">
            <small class="form-text text-muted">Cada nombre genera un avatar único</small>
          </div>
          
          <div id="avatar-options" class="avatar-options">
            <!-- Las opciones se cargarán dinámicamente según el estilo -->
          </div>
          
          <div class="avatar-actions">
            <button type="button" id="generate-random-avatar" class="btn btn-secondary">
              🎲 Generar Aleatorio
            </button>
            <button type="button" id="reset-avatar" class="btn btn-outline-secondary">
              🔄 Resetear
            </button>
          </div>
          
          <input type="hidden" id="avatar-url" value="${this.getAvatarUrl()}" />
        </div>
      </div>
    `;
    
    this.container.innerHTML = html;
    this.setupEvents();
    this.renderStyleOptions();
  }
  
  /**
   * Configura los eventos del Avatar Builder
   */
  setupEvents() {
    // Cambio de estilo
    const styleSelect = this.container.querySelector('#avatar-style');
    if (styleSelect) {
      styleSelect.addEventListener('change', (e) => {
        this.currentConfig.style = e.target.value;
        this.currentConfig.options = {};
        this.renderStyleOptions();
        this.updatePreview();
      });
    }
    
    // Cambio de semilla
    const seedInput = this.container.querySelector('#avatar-seed');
    if (seedInput) {
      seedInput.addEventListener('input', (e) => {
        this.currentConfig.seed = e.target.value;
        this.updatePreview();
      });
    }
    
    // Generar aleatorio
    const randomBtn = this.container.querySelector('#generate-random-avatar');
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        this.generateRandom();
      });
    }
    
    // Resetear
    const resetBtn = this.container.querySelector('#reset-avatar');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.reset();
      });
    }
  }
  
  /**
   * Renderiza las opciones de personalización según el estilo
   */
  renderStyleOptions() {
    const optionsContainer = this.container.querySelector('#avatar-options');
    if (!optionsContainer) return;
    
    const options = this.styleOptions[this.currentConfig.style];
    if (!options) {
      optionsContainer.innerHTML = '<p class="text-muted">Este estilo no tiene opciones adicionales</p>';
      return;
    }
    
    let html = '<h4>Personalizar</h4>';
    
    for (const [key, values] of Object.entries(options)) {
      html += `
        <div class="form-group">
          <label class="form-label">${this.formatLabel(key)}</label>
          <select class="form-control avatar-option" data-option="${key}">
            <option value="">Por defecto</option>
            ${values.map(value => `
              <option value="${value}" ${this.currentConfig.options[key] === value ? 'selected' : ''}>
                ${this.formatValue(value)}
              </option>
            `).join('')}
          </select>
        </div>
      `;
    }
    
    optionsContainer.innerHTML = html;
    
    // Configurar eventos para las opciones
    const optionSelects = optionsContainer.querySelectorAll('.avatar-option');
    optionSelects.forEach(select => {
      select.addEventListener('change', (e) => {
        const option = e.target.dataset.option;
        const value = e.target.value;
        
        if (value) {
          this.currentConfig.options[option] = value;
        } else {
          delete this.currentConfig.options[option];
        }
        
        this.updatePreview();
      });
    });
  }
  
  /**
   * Genera un avatar aleatorio
   */
  generateRandom() {
    // Generar semilla aleatoria
    this.currentConfig.seed = Math.random().toString(36).substring(7);
    
    // Seleccionar opciones aleatorias
    const options = this.styleOptions[this.currentConfig.style];
    if (options) {
      this.currentConfig.options = {};
      for (const [key, values] of Object.entries(options)) {
        const randomIndex = Math.floor(Math.random() * values.length);
        this.currentConfig.options[key] = values[randomIndex];
      }
    }
    
    // Actualizar UI
    const seedInput = this.container.querySelector('#avatar-seed');
    if (seedInput) {
      seedInput.value = this.currentConfig.seed;
    }
    
    this.renderStyleOptions();
    this.updatePreview();
  }
  
  /**
   * Resetea la configuración
   */
  reset() {
    this.currentConfig = {
      style: 'avataaars',
      seed: '',
      options: {}
    };
    
    const styleSelect = this.container.querySelector('#avatar-style');
    const seedInput = this.container.querySelector('#avatar-seed');
    
    if (styleSelect) styleSelect.value = 'avataaars';
    if (seedInput) seedInput.value = '';
    
    this.renderStyleOptions();
    this.updatePreview();
  }
  
  /**
   * Actualiza la vista previa del avatar
   */
  updatePreview() {
    const previewImg = this.container.querySelector('#avatar-preview-img');
    const hiddenInput = this.container.querySelector('#avatar-url');
    const url = this.getAvatarUrl();
    
    if (previewImg) {
      previewImg.src = url;
    }
    
    if (hiddenInput) {
      hiddenInput.value = url;
    }
  }
  
  /**
   * Genera la URL del avatar con DiceBear
   */
  getAvatarUrl() {
    const baseUrl = 'https://api.dicebear.com/7.x';
    const style = this.currentConfig.style;
    const seed = this.currentConfig.seed || 'default';
    
    // Construir parámetros
    const params = new URLSearchParams();
    params.append('seed', seed);
    
    for (const [key, value] of Object.entries(this.currentConfig.options)) {
      if (value) {
        params.append(key, value);
      }
    }
    
    return `${baseUrl}/${style}/svg?${params.toString()}`;
  }
  
  /**
   * Obtiene la configuración actual del avatar
   */
  getConfig() {
    return {
      ...this.currentConfig,
      url: this.getAvatarUrl()
    };
  }
  
  /**
   * Carga una configuración de avatar
   */
  loadConfig(config) {
    if (config) {
      this.currentConfig = {
        style: config.style || 'avataaars',
        seed: config.seed || '',
        options: config.options || {}
      };
      
      this.render();
    }
  }
  
  /**
   * Formatea el nombre de una opción para mostrar
   */
  formatLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Formatea el valor de una opción para mostrar
   */
  formatValue(value) {
    return value
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}
