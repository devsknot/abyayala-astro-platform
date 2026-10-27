// Gestor de importación masiva de artículos (POST /api/content/bulk-import)
import { notifications } from './notification.js';
import { escapeHtml, attrUrl } from '../utils/html.js';

export class BulkImportManager {
  /**
   * @param {import('../content-manager.js').ContentManager} contentManager
   */
  constructor(contentManager) {
    this.contentManager = contentManager;
    this.container = null;
    this.jsonData = null;
    this.importInProgress = false;
    this.selectedCategories = [];
  }

  async init(container) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  $(selector) {
    return this.container.querySelector(selector);
  }

  render() {
    this.container.innerHTML = `
      <div class="bulk-import-manager">
        <div class="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 class="text-2xl font-bold mb-4">Carga Masiva de Artículos</h2>
          <p class="text-gray-600 mb-2">
            Importa múltiples artículos desde un archivo JSON con la forma
            <code>{"articles": [{"title", "content", "category", ...}]}</code>.
          </p>
          <p class="text-sm text-gray-500 mb-6">
            Los artículos cuyo slug ya exista se omiten. Los autores que no existan se crean automáticamente.
          </p>

          <div id="file-drop-area" class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6 hover:bg-gray-50 transition-colors">
            <div class="file-upload-icon text-4xl mb-2">📤</div>
            <p class="mb-2">Arrastra y suelta un archivo JSON aquí</p>
            <p class="text-sm text-gray-500 mb-4">o</p>
            <label class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg cursor-pointer transition-colors">
              Seleccionar archivo
              <input type="file" id="file-input" accept=".json,application/json" class="hidden">
            </label>
          </div>

          <div id="import-options" class="mb-6 hidden">
            <h3 class="text-xl font-semibold mb-3">Filtrar por categorías</h3>
            <p class="text-sm text-gray-500 mb-2">Si no marcas ninguna, se importan todas.</p>
            <div id="category-filters" class="grid grid-cols-3 gap-2"></div>
          </div>

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
                <tbody id="preview-table-body"></tbody>
              </table>
            </div>
            <div class="mt-2 text-sm text-gray-600">
              <span id="total-articles-count">0</span> artículos a importar
            </div>
          </div>

          <div id="import-progress" class="mb-6 hidden">
            <p class="text-gray-700">Importando artículos, no cierres esta página...</p>
          </div>

          <div id="import-results" class="mb-6 hidden">
            <h3 class="text-xl font-semibold mb-3">Resultados</h3>
            <div class="p-4 rounded-lg mb-4" id="results-summary"></div>
            <div id="error-list" class="hidden">
              <h4 class="font-semibold mb-2">Errores encontrados:</h4>
              <ul class="list-disc pl-5 text-red-600"></ul>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button type="button" id="preview-btn" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors hidden">Previsualizar</button>
            <button type="button" id="import-btn" class="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors hidden">Importar</button>
            <button type="button" id="clear-btn" class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors hidden">Limpiar</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const dropArea = this.$('#file-drop-area');
    const fileInput = this.$('#file-input');

    dropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropArea.classList.add('border-green-500');
    });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('border-green-500'));
    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('border-green-500');
      if (e.dataTransfer.files.length) this.handleFileSelection(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.handleFileSelection(e.target.files[0]);
    });

    this.$('#preview-btn').addEventListener('click', () => this.previewData());
    this.$('#import-btn').addEventListener('click', () => this.startImport());
    this.$('#clear-btn').addEventListener('click', () => this.resetForm());

    this.$('#category-filters').addEventListener('change', () => {
      this.selectedCategories = Array.from(this.container.querySelectorAll('.category-checkbox:checked'))
        .map(cb => cb.value);
    });

    this.loadCategories();
  }

  async handleFileSelection(file) {
    // En Windows el tipo MIME de un .json puede venir vacío: validar también la extensión
    const looksJson = file.type === 'application/json' || /\.json$/i.test(file.name);
    if (!looksJson) {
      notifications.error('Por favor, selecciona un archivo JSON válido.');
      return;
    }

    try {
      this.jsonData = JSON.parse(await file.text());
      if (!this.validateJsonStructure(this.jsonData)) {
        this.jsonData = null;
        notifications.error('El archivo JSON no tiene la estructura correcta: cada artículo necesita title y content.');
        return;
      }
      this.$('#import-options').classList.remove('hidden');
      this.$('#preview-btn').classList.remove('hidden');
      this.$('#clear-btn').classList.remove('hidden');
      notifications.success('Archivo cargado correctamente.');
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      this.jsonData = null;
      notifications.error('Error al procesar el archivo JSON.');
    }
  }

  validateJsonStructure(data) {
    if (!data || !Array.isArray(data.articles) || data.articles.length === 0) return false;
    return data.articles.every(article => article && article.title && article.content);
  }

  async loadCategories() {
    const categories = await this.contentManager.getCategories();
    const filters = this.$('#category-filters');
    if (!filters || !categories.length) return;
    filters.innerHTML = categories.map(category => `
      <label class="inline-flex items-center">
        <input type="checkbox" value="${escapeHtml(category.id)}" class="category-checkbox form-checkbox">
        <span class="ml-2">${escapeHtml(category.name)}</span>
      </label>
    `).join('');
  }

  getArticlesToImport() {
    if (!this.jsonData) return [];
    const articles = this.jsonData.articles;
    if (this.selectedCategories.length === 0) return articles;
    return articles.filter(article => this.selectedCategories.includes(article.category));
  }

  previewData() {
    const articles = this.getArticlesToImport();
    const formatDate = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
    };

    this.$('#preview-table-body').innerHTML = articles.slice(0, 10).map(article => {
      const image = attrUrl(article.featured_image);
      return `
        <tr>
          <td class="py-2 px-4 border-b">${escapeHtml(article.title)}</td>
          <td class="py-2 px-4 border-b">${escapeHtml(article.category || '—')}</td>
          <td class="py-2 px-4 border-b">${escapeHtml(formatDate(article.pubDate))}</td>
          <td class="py-2 px-4 border-b">${image ? `<img src="${image}" alt="Vista previa" class="h-10 w-auto">` : 'Sin imagen'}</td>
        </tr>
      `;
    }).join('');

    this.$('#total-articles-count').textContent = String(articles.length);
    this.$('#data-preview').classList.remove('hidden');
    this.$('#import-btn').classList.toggle('hidden', articles.length === 0);
  }

  async startImport() {
    if (!this.jsonData || this.importInProgress) return;
    const articles = this.getArticlesToImport();
    if (articles.length === 0) {
      notifications.warning('No hay artículos para importar con el filtro actual.');
      return;
    }

    this.importInProgress = true;
    this.$('#import-progress').classList.remove('hidden');
    this.$('#import-results').classList.add('hidden');
    this.$('#preview-btn').classList.add('hidden');
    this.$('#import-btn').classList.add('hidden');
    this.$('#clear-btn').classList.add('hidden');

    const response = await this.contentManager.bulkImportArticles({ articles });

    let summary;
    if (response.error) {
      summary = { processed: 0, success: [], errors: [{ title: 'Error general', error: response.error }] };
    } else {
      summary = {
        processed: response.processed ?? 0,
        success: Array.isArray(response.successfulArticles) ? response.successfulArticles : [],
        errors: Array.isArray(response.errors) ? response.errors : [],
        authorsCreated: response.authors?.created?.length ?? 0
      };
      await this.contentManager.logActivity({
        type: 'bulk_import',
        entity_type: 'article',
        entity_id: `bulk-import-${Date.now()}`,
        entity_title: 'Importación masiva de artículos',
        details: {
          total_articles: articles.length,
          imported_articles: summary.success.length,
          errors_count: summary.errors.length,
          categories: this.selectedCategories.length > 0 ? this.selectedCategories : ['todas']
        }
      });
    }

    this.showResults(summary, articles.length);
  }

  showResults(summary, total) {
    this.importInProgress = false;
    this.$('#import-progress').classList.add('hidden');
    this.$('#import-results').classList.remove('hidden');
    this.$('#clear-btn').classList.remove('hidden');

    const imported = summary.success.length;
    const errors = summary.errors;
    const resultsSummary = this.$('#results-summary');

    let tone;
    let lines;
    if (imported === total && errors.length === 0) {
      tone = 'green';
      lines = ['Importación completada con éxito', `Se importaron ${imported} artículos.`];
    } else if (imported > 0) {
      tone = 'yellow';
      lines = ['Importación completada con advertencias', `Se importaron ${imported} de ${total} artículos.`, `Errores: ${errors.length}.`];
    } else {
      tone = 'red';
      lines = ['Error en la importación', 'No se pudo importar ningún artículo.', `Errores: ${errors.length}.`];
    }
    if (summary.authorsCreated) lines.push(`Autores creados: ${summary.authorsCreated}.`);

    resultsSummary.className = `p-4 rounded-lg mb-4 bg-${tone}-100 text-${tone}-700`;
    resultsSummary.innerHTML = lines
      .map((line, i) => `<p${i === 0 ? ' class="font-bold"' : ''}>${escapeHtml(line)}</p>`)
      .join('');

    const errorList = this.$('#error-list');
    errorList.classList.toggle('hidden', errors.length === 0);
    errorList.querySelector('ul').innerHTML = errors.map(error => `
      <li><strong>${escapeHtml(error.title || error.slug || 'Artículo')}:</strong> ${escapeHtml(error.error)}</li>
    `).join('');

    if (imported > 0) notifications.success('Proceso de importación finalizado.');
    else notifications.error('La importación no se completó.');
  }

  resetForm() {
    this.jsonData = null;
    this.selectedCategories = [];
    this.render();
    this.attachEventListeners();
  }
}
