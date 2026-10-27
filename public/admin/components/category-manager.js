// Gestor de categorías para el CMS
import { notifications } from './notification.js';
import { escapeHtml } from '../utils/html.js';
import { icon } from '../utils/icons.js';
import { slugify, scrollIntoViewSafe } from '../utils/format.js';

export class CategoryManager {
  constructor(contentManager) {
    this.contentManager = contentManager;
    this.categories = [];
    this.container = null;
    this.isLoading = false;
    this.currentEditingCategory = null;
  }

  /**
   * Inicializa el gestor.
   * @param {HTMLElement|string} target - contenedor o id del contenedor
   */
  async init(target) {
    this.container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!this.container) {
      console.error('Contenedor del gestor de categorías no encontrado');
      return;
    }

    this.render();
    this.attachEventListeners();
    await this.loadCategories();
  }

  // Cargar categorías desde la API y pintar la tabla
  async loadCategories() {
    this.setLoading(true);
    try {
      const categories = await this.contentManager.getCategories();
      this.categories = Array.isArray(categories) ? categories : [];
      this.categories.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
    } catch (error) {
      notifications.error(`Error al cargar categorías: ${error.message}`);
      this.categories = [];
    } finally {
      this.setLoading(false);
    }
    this.renderTable();
    return this.categories;
  }

  setLoading(loading) {
    this.isLoading = loading;
    if (!this.container) return;
    const saveButton = this.container.querySelector('#saveCategory');
    if (saveButton) saveButton.disabled = loading;
    const deleteButton = this.container.querySelector('#deleteCategory');
    if (deleteButton) deleteButton.disabled = loading;
    this.container.querySelector('.category-manager')?.setAttribute('aria-busy', String(loading));
  }

  render() {
    this.container.innerHTML = `
      <div class="category-manager">
        <div class="categories-list">
          <div class="page-header">
            <div>
              <h2 class="page-title">Categorías</h2>
              <p class="page-subtitle">Organizan los artículos en las secciones del sitio.</p>
            </div>
            <div class="page-actions">
              <button type="button" id="createCategoryBtn" class="btn btn-primary">${icon('plus', { size: 18 })}<span>Nueva categoría</span></button>
            </div>
          </div>

          <div class="card table-card">
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Slug</th>
                    <th scope="col" class="hide-sm">Descripción</th>
                    <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody id="categoriesTableBody">
                  ${'<tr aria-hidden="true"><td colspan="4"><span class="skeleton skeleton-row"></span></td></tr>'.repeat(4)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="category-editor" hidden>
          <div class="page-header">
            <div class="page-header-main">
              <button type="button" class="back-to-list-btn btn btn-ghost btn-sm">${icon('arrowLeft', { size: 18 })}<span>Volver a la lista</span></button>
              <h3 class="page-title category-form-title">Nueva categoría</h3>
            </div>
          </div>

          <form id="categoryForm" class="card form-card" novalidate>
            <div class="card-body">
              <div class="form-field">
                <label for="categoryName" class="form-label">Nombre <span class="required" aria-hidden="true">*</span></label>
                <input type="text" id="categoryName" class="form-input" required autocomplete="off">
              </div>

              <div class="form-field">
                <label for="categorySlug" class="form-label">Slug <span class="required" aria-hidden="true">*</span></label>
                <input type="text" id="categorySlug" class="form-input font-mono" required autocomplete="off">
                <p class="form-help" id="categorySlugHelp">Identificador único para la URL (solo letras, números y guiones).</p>
              </div>

              <div class="form-field mb-0">
                <label for="categoryDescription" class="form-label">Descripción</label>
                <textarea id="categoryDescription" class="form-textarea" rows="3"></textarea>
              </div>
            </div>

            <div class="card-footer form-actions">
              <button type="button" id="deleteCategory" class="btn btn-danger-outline mr-auto" hidden>${icon('trash', { size: 18 })}<span>Eliminar</span></button>
              <button type="button" id="cancelEditCategory" class="btn btn-secondary">Cancelar</button>
              <button type="submit" id="saveCategory" class="btn btn-primary">${icon('check', { size: 18 })}<span>Guardar categoría</span></button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderTable() {
    const body = this.container && this.container.querySelector('#categoriesTableBody');
    if (!body) return;

    if (this.categories.length === 0) {
      body.innerHTML = `
        <tr><td colspan="4">
          <div class="empty-state">
            <span class="empty-state-icon">${icon('categories', { size: 28 })}</span>
            <p class="empty-state-title">No hay categorías</p>
            <p class="empty-state-text">Crea la primera con el botón «Nueva categoría».</p>
          </div>
        </td></tr>
      `;
      return;
    }

    body.innerHTML = this.categories.map(category => {
      const id = escapeHtml(category.id || '');
      const name = escapeHtml(category.name || 'Sin nombre');
      return `
        <tr data-slug="${id}">
          <td class="font-medium">${name}</td>
          <td><code class="code-pill">${id}</code></td>
          <td class="hide-sm text-muted cell-clamp">${escapeHtml(category.description || '—')}</td>
          <td class="text-right nowrap">
            <button type="button" class="btn btn-ghost btn-sm edit-category" data-slug="${id}" aria-label="Editar ${name}">${icon('edit', { size: 16 })}<span>Editar</span></button>
            <button type="button" class="btn btn-ghost btn-sm text-danger delete-category" data-slug="${id}" aria-label="Eliminar ${name}">${icon('trash', { size: 16 })}<span class="hide-sm">Eliminar</span></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  showCategoryEditor() {
    this.container.querySelector('.categories-list').hidden = true;
    const editor = this.container.querySelector('.category-editor');
    editor.hidden = false;
    scrollIntoViewSafe(editor);
    this.container.querySelector('#categoryName')?.focus();
  }

  showCategoriesList() {
    this.container.querySelector('.categories-list').hidden = false;
    this.container.querySelector('.category-editor').hidden = true;
    this.resetForm();
  }

  attachEventListeners() {
    const $ = (selector) => this.container.querySelector(selector);

    $('#createCategoryBtn').addEventListener('click', () => {
      this.resetForm();
      this.showCategoryEditor();
    });
    $('.back-to-list-btn').addEventListener('click', () => this.showCategoriesList());
    $('#cancelEditCategory').addEventListener('click', () => this.showCategoriesList());
    $('#deleteCategory').addEventListener('click', () => {
      if (this.currentEditingCategory) this.confirmDeleteCategory(this.currentEditingCategory.id);
    });
    $('#categoryForm').addEventListener('submit', (e) => this.handleSaveCategory(e));

    // Slug automático a partir del nombre (solo categorías nuevas y si no se editó a mano)
    const nameInput = $('#categoryName');
    const slugInput = $('#categorySlug');
    nameInput.addEventListener('input', () => {
      if (!this.currentEditingCategory && slugInput.dataset.edited !== 'true') {
        slugInput.value = this.generateSlug(nameInput.value);
      }
    });
    slugInput.addEventListener('input', () => {
      slugInput.dataset.edited = slugInput.value ? 'true' : 'false';
    });

    // Delegación para editar / eliminar desde la tabla
    $('#categoriesTableBody').addEventListener('click', (e) => {
      const editButton = e.target.closest('.edit-category');
      if (editButton) {
        this.editCategory(editButton.dataset.slug);
        return;
      }
      const deleteButton = e.target.closest('.delete-category');
      if (deleteButton) this.confirmDeleteCategory(deleteButton.dataset.slug);
    });
  }

  // Quita tildes: "Agroecología" → "agroecologia"
  generateSlug(name) {
    return slugify(name);
  }

  async handleSaveCategory(e) {
    e.preventDefault();
    if (this.isLoading) return;

    const nameInput = this.container.querySelector('#categoryName');
    const slugInput = this.container.querySelector('#categorySlug');
    const descriptionInput = this.container.querySelector('#categoryDescription');

    const name = nameInput.value.trim();
    const slug = slugInput.value.trim() || this.generateSlug(name);
    const categoryData = { name, slug, description: descriptionInput.value.trim() };

    if (!categoryData.name || !categoryData.slug) {
      notifications.error('El nombre y el slug son obligatorios');
      (categoryData.name ? slugInput : nameInput).focus();
      return;
    }

    this.setLoading(true);
    try {
      if (this.currentEditingCategory) {
        await this.contentManager.updateCategory(this.currentEditingCategory.id, categoryData);
        notifications.success('Categoría actualizada correctamente');
      } else {
        await this.contentManager.createCategory(categoryData);
        notifications.success('Categoría creada correctamente');
      }
      this.showCategoriesList();
      await this.loadCategories();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      notifications.error(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  editCategory(slug) {
    // En la base de datos, el campo 'id' es el slug
    const category = this.categories.find(c => c.id === slug);
    if (!category) {
      notifications.error('Categoría no encontrada');
      return;
    }

    this.resetForm();
    this.currentEditingCategory = category;

    this.container.querySelector('.category-form-title').textContent = 'Editar categoría';
    this.container.querySelector('#categoryName').value = category.name || '';
    const slugInput = this.container.querySelector('#categorySlug');
    // El id no se puede cambiar: lo referencian los artículos
    slugInput.value = category.id || '';
    slugInput.readOnly = true;
    this.container.querySelector('#categorySlugHelp').textContent = 'El slug no se puede cambiar: lo usan los artículos de esta categoría.';
    this.container.querySelector('#categoryDescription').value = category.description || '';
    this.container.querySelector('#deleteCategory').hidden = false;

    this.showCategoryEditor();
  }

  async confirmDeleteCategory(slug) {
    const category = this.categories.find(c => c.id === slug);
    if (!category) {
      notifications.error('Categoría no encontrada');
      return;
    }

    const confirmed = await notifications.confirm(
      `¿Eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );
    if (confirmed) await this.deleteCategory(slug);
  }

  async deleteCategory(slug) {
    this.setLoading(true);
    try {
      await this.contentManager.deleteCategory(slug);
      notifications.success('Categoría eliminada correctamente');
      this.showCategoriesList();
      await this.loadCategories();
    } catch (error) {
      if (error.status === 409 || /utilizad|en uso|in use/i.test(error.message || '')) {
        notifications.error('No se puede eliminar la categoría porque la usan algunos artículos. Cambia primero la categoría de esos artículos.');
      } else {
        notifications.error(`Error al eliminar la categoría: ${error.message}`);
      }
    } finally {
      this.setLoading(false);
    }
  }

  resetForm() {
    this.container.querySelector('#categoryForm')?.reset();
    const title = this.container.querySelector('.category-form-title');
    if (title) title.textContent = 'Nueva categoría';
    const deleteButton = this.container.querySelector('#deleteCategory');
    if (deleteButton) deleteButton.hidden = true;
    const slugInput = this.container.querySelector('#categorySlug');
    if (slugInput) {
      slugInput.readOnly = false;
      slugInput.dataset.edited = 'false';
    }
    const help = this.container.querySelector('#categorySlugHelp');
    if (help) help.textContent = 'Identificador único para la URL (solo letras, números y guiones).';
    this.currentEditingCategory = null;
  }
}
