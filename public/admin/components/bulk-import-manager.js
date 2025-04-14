// Gestor de importación masiva de artículos
import { ContentManager } from '../content-manager.js';
import { MediaManager } from '../media-manager.js';
import { notifications } from './notification.js';

export class BulkImportManager {
  constructor() {
    this.contentManager = new ContentManager();
    this.mediaManager = new MediaManager();
    this.container = null;
    this.jsonData = null;
    this.importInProgress = false;
    this.processedItems = 0;
    this.totalItems = 0;
    this.errors = [];
    this.duplicateHandling = 'skip'; // 'skip', 'overwrite', 'rename'
    this.selectedCategories = [];
    this.validateImages = true;
  }

  // Inicializar el componente
  async init(container) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  // Renderizar la interfaz
  render() {
    this.container.innerHTML = `
      <div class="bulk-import-manager">
        <div class="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 class="text-2xl font-bold mb-4">Carga Masiva de Artículos</h2>
          <p class="text-gray-600 mb-6">
            Importa múltiples artículos desde un archivo JSON. El sistema procesará el contenido y las imágenes asociadas.
          </p>
          
          <!-- Área de carga de archivos -->
          <div id="file-drop-area" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:bg-gray-50 transition-colors">
            <div class="file-upload-icon text-4xl mb-2">📤</div>
            <p class="mb-2">Arrastra y suelta un archivo JSON aquí</p>
            <p class="text-sm text-gray-500 mb-4">o</p>
            <label class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg cursor-pointer transition-colors">
              Seleccionar archivo
              <input type="file" id="file-input" accept=".json" class="hidden">
            </label>
          </div>
          
          <!-- Opciones de configuración -->
          <div id="import-options" class="mb-6 hidden">
            <h3 class="text-xl font-semibold mb-3">Opciones de importación</h3>
            
            <!-- Manejo de duplicados -->
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Manejo de duplicados:</label>
              <div class="flex space-x-4">
                <label class="inline-flex items-center">
                  <input type="radio" name="duplicate-handling" value="skip" checked class="form-radio">
                  <span class="ml-2">Omitir</span>
                </label>
                <label class="inline-flex items-center">
                  <input type="radio" name="duplicate-handling" value="overwrite" class="form-radio">
                  <span class="ml-2">Sobrescribir</span>
                </label>
                <label class="inline-flex items-center">
                  <input type="radio" name="duplicate-handling" value="rename" class="form-radio">
                  <span class="ml-2">Renombrar</span>
                </label>
              </div>
            </div>
            
            <!-- Filtro de categorías -->
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Filtrar por categorías:</label>
              <div id="category-filters" class="grid grid-cols-3 gap-2">
                <!-- Se llenará dinámicamente -->
              </div>
            </div>
            
            <!-- Validación de imágenes -->
            <div class="mb-4">
              <label class="inline-flex items-center">
                <input type="checkbox" id="validate-images" checked class="form-checkbox">
                <span class="ml-2">Validar URLs de imágenes</span>
              </label>
            </div>
          </div>
          
          <!-- Previsualización de datos -->
          <div id="data-preview" class="mb-6 hidden">
            <h3 class="text-xl font-semibold mb-3">Previsualización</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr>
                    <th class="py-2 px-4 border-b">Título</th>
                    <th class="py-2 px-4 border-b">Categoría</th>
                    <th class="py-2 px-4 border-b">Fecha</th>
                    <th class="py-2 px-4 border-b">Imagen</th>
                  </tr>
                </thead>
                <tbody id="preview-table-body">
                  <!-- Se llenará dinámicamente -->
                </tbody>
              </table>
            </div>
            <div class="mt-2 text-sm text-gray-600">
              <span id="total-articles-count">0</span> artículos encontrados
            </div>
          </div>
          
          <!-- Progreso de importación -->
          <div id="import-progress" class="mb-6 hidden">
            <h3 class="text-xl font-semibold mb-3">Progreso de importación</h3>
            <div class="w-full bg-gray-200 rounded-full h-4 mb-2">
              <div id="progress-bar" class="bg-green-500 h-4 rounded-full" style="width: 0%"></div>
            </div>
            <div class="flex justify-between text-sm text-gray-600">
              <span id="processed-count">0</span>
              <span id="total-count">0</span>
            </div>
            <div id="current-item" class="mt-2 text-sm text-gray-600"></div>
          </div>
          
          <!-- Resultados -->
          <div id="import-results" class="mb-6 hidden">
            <h3 class="text-xl font-semibold mb-3">Resultados</h3>
            <div class="p-4 rounded-lg mb-4" id="results-summary">
              <!-- Se llenará dinámicamente -->
            </div>
            <div id="error-list" class="hidden">
              <h4 class="font-semibold mb-2">Errores encontrados:</h4>
              <ul class="list-disc pl-5 text-red-600">
                <!-- Se llenará dinámicamente -->
              </ul>
            </div>
          </div>
          
          <!-- Botones de acción -->
          <div class="flex justify-end space-x-3">
            <button id="preview-btn" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors hidden">
              Previsualizar
            </button>
            <button id="import-btn" class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors hidden">
              Importar
            </button>
            <button id="cancel-btn" class="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors hidden">
              Cancelar
            </button>
            <button id="clear-btn" class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors hidden">
              Limpiar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Adjuntar event listeners
  attachEventListeners() {
    const fileDropArea = document.getElementById('file-drop-area');
    const fileInput = document.getElementById('file-input');
    const previewBtn = document.getElementById('preview-btn');
    const importBtn = document.getElementById('import-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Eventos de arrastrar y soltar
    fileDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropArea.classList.add('border-green-500');
    });
    
    fileDropArea.addEventListener('dragleave', () => {
      fileDropArea.classList.remove('border-green-500');
    });
    
    fileDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropArea.classList.remove('border-green-500');
      
      if (e.dataTransfer.files.length) {
        this.handleFileSelection(e.dataTransfer.files[0]);
      }
    });
    
    // Evento de selección de archivo
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.handleFileSelection(e.target.files[0]);
      }
    });
    
    // Eventos de botones
    previewBtn.addEventListener('click', () => this.previewData());
    importBtn.addEventListener('click', () => this.startImport());
    cancelBtn.addEventListener('click', () => this.cancelImport());
    clearBtn.addEventListener('click', () => this.resetForm());
    
    // Eventos de opciones
    document.querySelectorAll('input[name="duplicate-handling"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.duplicateHandling = e.target.value;
      });
    });
    
    document.getElementById('validate-images').addEventListener('change', (e) => {
      this.validateImages = e.target.checked;
    });
    
    // Cargar categorías
    this.loadCategories();
  }

  // Manejar la selección de archivo
  async handleFileSelection(file) {
    if (file.type !== 'application/json') {
      notifications.error('Por favor, selecciona un archivo JSON válido.');
      return;
    }
    
    try {
      const fileContent = await this.readFileContent(file);
      this.jsonData = JSON.parse(fileContent);
      
      // Validar estructura del JSON
      if (!this.validateJsonStructure(this.jsonData)) {
        notifications.error('El archivo JSON no tiene la estructura correcta.');
        return;
      }
      
      // Mostrar opciones y botón de previsualización
      document.getElementById('import-options').classList.remove('hidden');
      document.getElementById('preview-btn').classList.remove('hidden');
      document.getElementById('clear-btn').classList.remove('hidden');
      
      notifications.success('Archivo cargado correctamente.');
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      notifications.error('Error al procesar el archivo JSON.');
    }
  }

  // Leer el contenido del archivo
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = (error) => {
        reject(error);
      };
      
      reader.readAsText(file);
    });
  }

  // Validar la estructura del JSON
  validateJsonStructure(data) {
    // Verificar que tenga la propiedad articles
    if (!data.articles || !Array.isArray(data.articles) || data.articles.length === 0) {
      return false;
    }
    
    // Verificar que cada artículo tenga las propiedades necesarias
    for (const article of data.articles) {
      if (!article.title || !article.content || !article.category) {
        return false;
      }
    }
    
    return true;
  }

  // Cargar categorías disponibles
  async loadCategories() {
    try {
      const categories = await this.contentManager.getCategories();
      const categoryFilters = document.getElementById('category-filters');
      
      if (categories && categories.length > 0) {
        categoryFilters.innerHTML = categories.map(category => `
          <label class="inline-flex items-center">
            <input type="checkbox" value="${category.id}" class="category-checkbox form-checkbox">
            <span class="ml-2">${category.name}</span>
          </label>
        `).join('');
        
        // Event listeners para checkboxes de categorías
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
          checkbox.addEventListener('change', () => {
            this.selectedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked'))
              .map(cb => cb.value);
          });
        });
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }

  // Previsualizar datos
  previewData() {
    if (!this.jsonData) return;
    
    const previewTableBody = document.getElementById('preview-table-body');
    const totalArticlesCount = document.getElementById('total-articles-count');
    
    // Filtrar artículos por categoría si es necesario
    let articlesToShow = this.jsonData.articles;
    
    if (this.selectedCategories.length > 0) {
      articlesToShow = articlesToShow.filter(article => 
        this.selectedCategories.includes(article.category)
      );
    }
    
    // Mostrar hasta 10 artículos en la previsualización
    const previewArticles = articlesToShow.slice(0, 10);
    
    previewTableBody.innerHTML = previewArticles.map(article => `
      <tr>
        <td class="py-2 px-4 border-b">${article.title}</td>
        <td class="py-2 px-4 border-b">${article.category}</td>
        <td class="py-2 px-4 border-b">${new Date(article.pubDate).toLocaleDateString()}</td>
        <td class="py-2 px-4 border-b">
          ${article.featured_image ? 
            `<img src="${article.featured_image}" alt="Vista previa" class="h-10 w-auto">` : 
            'Sin imagen'}
        </td>
      </tr>
    `).join('');
    
    totalArticlesCount.textContent = articlesToShow.length;
    
    // Mostrar sección de previsualización y botón de importación
    document.getElementById('data-preview').classList.remove('hidden');
    document.getElementById('import-btn').classList.remove('hidden');
  }

  // Iniciar importación
  async startImport() {
    if (!this.jsonData || this.importInProgress) return;
    
    this.importInProgress = true;
    this.processedItems = 0;
    this.errors = [];
    
    // Filtrar artículos por categoría si es necesario
    let articlesToImport = this.jsonData.articles;
    
    if (this.selectedCategories.length > 0) {
      articlesToImport = articlesToImport.filter(article => 
        this.selectedCategories.includes(article.category)
      );
    }
    
    this.totalItems = articlesToImport.length;
    
    // Configurar UI para mostrar progreso
    document.getElementById('import-progress').classList.remove('hidden');
    document.getElementById('import-results').classList.add('hidden');
    document.getElementById('preview-btn').classList.add('hidden');
    document.getElementById('import-btn').classList.add('hidden');
    document.getElementById('cancel-btn').classList.remove('hidden');
    
    document.getElementById('total-count').textContent = this.totalItems;
    
    try {
      // Preparar datos para la importación
      const importData = {
        articles: articlesToImport,
        options: {
          duplicateHandling: this.duplicateHandling,
          validateImages: this.validateImages
        }
      };
      
      // Realizar la importación masiva
      const result = await this.contentManager.bulkImportArticles(importData);
      
      if (result.error) {
        this.errors.push({
          title: 'Error general',
          error: result.error
        });
      } else {
        // Actualizar contadores
        this.processedItems = result.processed;
        
        // Añadir errores si los hay
        if (result.errors && result.errors.length > 0) {
          this.errors = result.errors;
        }
        
        // Actualizar barra de progreso al 100%
        const progressBar = document.getElementById('progress-bar');
        const processedCount = document.getElementById('processed-count');
        
        progressBar.style.width = '100%';
        processedCount.textContent = this.processedItems;
      }
    } catch (error) {
      console.error('Error durante la importación:', error);
      this.errors.push({
        title: 'Error de conexión',
        error: error.message || 'Error desconocido durante la importación'
      });
    }
    
    // Mostrar resultados
    this.showResults();
  }

  // Mostrar resultados de la importación
  showResults() {
    this.importInProgress = false;
    
    document.getElementById('import-progress').classList.add('hidden');
    document.getElementById('import-results').classList.remove('hidden');
    document.getElementById('cancel-btn').classList.add('hidden');
    document.getElementById('clear-btn').classList.remove('hidden');
    
    const resultsSummary = document.getElementById('results-summary');
    const errorList = document.getElementById('error-list');
    
    const successCount = this.processedItems - this.errors.length;
    
    if (successCount === this.totalItems) {
      resultsSummary.innerHTML = `
        <div class="text-green-600">
          <p class="font-bold">Importación completada con éxito</p>
          <p>Se importaron ${successCount} artículos correctamente.</p>
        </div>
      `;
      resultsSummary.className = 'p-4 rounded-lg mb-4 bg-green-100';
    } else if (successCount > 0) {
      resultsSummary.innerHTML = `
        <div class="text-yellow-600">
          <p class="font-bold">Importación completada con advertencias</p>
          <p>Se importaron ${successCount} artículos correctamente.</p>
          <p>Se encontraron ${this.errors.length} errores.</p>
        </div>
      `;
      resultsSummary.className = 'p-4 rounded-lg mb-4 bg-yellow-100';
    } else {
      resultsSummary.innerHTML = `
        <div class="text-red-600">
          <p class="font-bold">Error en la importación</p>
          <p>No se pudo importar ningún artículo.</p>
          <p>Se encontraron ${this.errors.length} errores.</p>
        </div>
      `;
      resultsSummary.className = 'p-4 rounded-lg mb-4 bg-red-100';
    }
    
    // Mostrar lista de errores si hay alguno
    if (this.errors.length > 0) {
      errorList.classList.remove('hidden');
      const errorListUl = errorList.querySelector('ul');
      
      errorListUl.innerHTML = this.errors.map(error => `
        <li>
          <strong>${error.title}:</strong> ${error.error}
        </li>
      `).join('');
    } else {
      errorList.classList.add('hidden');
    }
    
    notifications.success('Proceso de importación finalizado.');
  }

  // Cancelar importación
  cancelImport() {
    if (!this.importInProgress) return;
    
    this.importInProgress = false;
    notifications.warning('Importación cancelada por el usuario.');
    
    // Mostrar resultados parciales
    this.showResults();
  }

  // Reiniciar formulario
  resetForm() {
    this.jsonData = null;
    this.processedItems = 0;
    this.totalItems = 0;
    this.errors = [];
    this.duplicateHandling = 'skip';
    this.selectedCategories = [];
    this.validateImages = true;
    
    // Resetear UI
    document.getElementById('import-options').classList.add('hidden');
    document.getElementById('data-preview').classList.add('hidden');
    document.getElementById('import-progress').classList.add('hidden');
    document.getElementById('import-results').classList.add('hidden');
    document.getElementById('preview-btn').classList.add('hidden');
    document.getElementById('import-btn').classList.add('hidden');
    document.getElementById('cancel-btn').classList.add('hidden');
    document.getElementById('clear-btn').classList.add('hidden');
    
    document.querySelector('input[value="skip"]').checked = true;
    document.getElementById('validate-images').checked = true;
    
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    this.render();
    this.attachEventListeners();
  }
}
