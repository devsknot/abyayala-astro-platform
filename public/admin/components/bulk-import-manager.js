// Gestor de importación masiva de artículos (POST /api/content/bulk-import)
import { notifications } from './notification.js';
import { escapeHtml, attrUrl } from '../utils/html.js';
import { icon } from '../utils/icons.js';

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
        <div class="page-header">
          <div>
            <h2 class="page-title">Importación masiva</h2>
            <p class="page-subtitle">Importa varios artículos a la vez desde un archivo JSON.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <div class="callout callout-info">
              ${icon('info', { size: 18 })}
              <div>
                <p>El archivo debe tener la forma <code class="code-pill">{"articles": [{"title", "content", "category", …}]}</code>.</p>
                <p>Los artículos cuyo slug ya exista se omiten. Los autores que no existan se crean automáticamente.</p>
              </div>
            </div>

            <div id="file-drop-area" class="dropzone">
              <span class="dropzone-icon">${icon('import', { size: 28 })}</span>
              <p class="dropzone-title">Arrastra y suelta un archivo JSON aquí</p>
              <p class="dropzone-text">o</p>
              <label class="btn btn-primary file-button" tabindex="0">
                <span>Seleccionar archivo</span>
                <input type="file" id="file-input" accept=".json,application/json" class="sr-only" tabindex="-1">
              </label>
              <p class="dropzone-file" id="selected-file-name" hidden></p>
            </div>

            <div id="import-options" class="section hidden">
              <h3 class="section-title">Filtrar por categorías</h3>
              <p class="form-help">Si no marcas ninguna, se importan todas.</p>
              <div id="category-filters" class="checkbox-grid"></div>
            </div>

            <div id="data-preview" class="section hidden">
              <h3 class="section-title">Previsualización <span class="text-muted font-normal">(primeros 10)</span></h3>
              <div class="table-wrap table-bordered">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Título</th>
                      <th scope="col">Categoría</th>
                      <th scope="col">Fecha</th>
                      <th scope="col">Imagen</th>
                    </tr>
                  </thead>
                  <tbody id="preview-table-body"></tbody>
                </table>
              </div>
              <p class="form-help"><strong id="total-articles-count">0</strong> artículos a importar</p>
            </div>

            <div id="import-progress" class="section hidden">
              <div class="callout callout-warning" role="status">
                <span class="spinner spinner-sm" aria-hidden="true"></span>
                <p>Importando artículos, no cierres esta página…</p>
              </div>
            </div>

            <div id="import-results" class="section hidden">
              <h3 class="section-title">Resultados</h3>
              <div class="callout" id="results-summary" role="status"></div>
              <div id="error-list" class="hidden">
                <h4 class="section-subtitle">Errores encontrados</h4>
                <ul class="error-list"></ul>
              </div>
            </div>
          </div>

          <div class="card-footer form-actions">
            <button type="button" id="clear-btn" class="btn btn-ghost mr-auto hidden">Limpiar</button>
            <button type="button" id="preview-btn" class="btn btn-secondary hidden">Previsualizar</button>
            <button type="button" id="import-btn" class="btn btn-primary hidden">${icon('upload', { size: 18 })}<span>Importar</span></button>
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
      dropArea.classList.add('is-dragover');
    });
    dropArea.addEventListener('dragleave', () => dropArea.classList.remove('is-dragover'));
    dropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      dropArea.classList.remove('is-dragover');
      if (e.dataTransfer.files.length) this.handleFileSelection(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) this.handleFileSelection(e.target.files[0]);
      // Permite volver a elegir el mismo archivo
      fileInput.value = '';
    });
    const fileLabel = fileInput.closest('label');
    fileLabel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });

    this.$('#preview-btn').addEventListener('click', () => this.previewData());
    this.$('#import-btn').addEventListener('click', () => this.startImport());
    this.$('#clear-btn').addEventListener('click', () => this.resetForm());

    this.$('#category-filters').addEventListener('change', () => {
      this.selectedCategories = Array.from(this.container.querySelectorAll('.category-checkbox:checked'))
        .map(cb => cb.value);
      // Mantener la previsualización y el recuento sincronizados con el filtro
      if (!this.$('#data-preview').classList.contains('hidden')) this.previewData();
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
      const fileName = this.$('#selected-file-name');
      fileName.textContent = `${file.name} · ${this.jsonData.articles.length} artículos`;
      fileName.hidden = false;
      // Un archivo nuevo invalida la previsualización y los resultados anteriores
      this.$('#data-preview').classList.add('hidden');
      this.$('#import-results').classList.add('hidden');
      this.$('#import-btn').classList.add('hidden');
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
      <label class="checkbox">
        <input type="checkbox" value="${escapeHtml(category.id)}" class="category-checkbox">
        <span>${escapeHtml(category.name)}</span>
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
          <td>${escapeHtml(article.title)}</td>
          <td>${escapeHtml(article.category || '—')}</td>
          <td>${escapeHtml(formatDate(article.pubDate))}</td>
          <td>${image ? `<img src="${image}" alt="" class="preview-thumb" loading="lazy">` : '<span class="text-muted">Sin imagen</span>'}</td>
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
      tone = 'success';
      lines = ['Importación completada con éxito', `Se importaron ${imported} artículos.`];
    } else if (imported > 0) {
      tone = 'warning';
      lines = ['Importación completada con advertencias', `Se importaron ${imported} de ${total} artículos.`, `Errores: ${errors.length}.`];
    } else {
      tone = 'danger';
      lines = ['Error en la importación', 'No se pudo importar ningún artículo.', `Errores: ${errors.length}.`];
    }
    if (summary.authorsCreated) lines.push(`Autores creados: ${summary.authorsCreated}.`);

    resultsSummary.className = `callout callout-${tone}`;
    resultsSummary.innerHTML = `<div>${lines
      .map((line, i) => `<p${i === 0 ? ' class="font-semibold"' : ''}>${escapeHtml(line)}</p>`)
      .join('')}</div>`;

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
