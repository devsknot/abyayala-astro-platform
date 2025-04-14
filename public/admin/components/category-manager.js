// Gestor de categorías para el CMS
import { showNotification, showConfirmDialog } from './notification.js';

export class CategoryManager {
  constructor(contentManager) {
    this.contentManager = contentManager;
    this.categories = [];
    this.container = null;
    this.isLoading = false;
    this.currentEditingCategory = null;
  }

  // Inicializar el gestor de categorías
  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Contenedor #${containerId} no encontrado`);
      return;
    }

    await this.loadCategories();
    this.render();
    this.attachEventListeners();
  }

  // Cargar categorías desde la API
  async loadCategories() {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      this.categories = await this.contentManager.getCategories();
      
      // Ordenar categorías por nombre
      this.categories.sort((a, b) => a.name.localeCompare(b.name));
      
      this.isLoading = false;
      this.updateLoadingState();
      return this.categories;
    } catch (error) {
      this.isLoading = false;
      this.updateLoadingState();
      showNotification('error', `Error al cargar categorías: ${error.message}`);
      return [];
    }
  }

  // Actualizar estado de carga
  updateLoadingState() {
    const loadingIndicator = this.container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = this.isLoading ? 'flex' : 'none';
    }
    
    const categoryList = this.container.querySelector('.category-list');
    if (categoryList) {
      categoryList.style.display = this.isLoading ? 'none' : 'block';
    }
    
    const categoryForm = this.container.querySelector('.category-form');
    if (categoryForm) {
      categoryForm.style.display = this.isLoading ? 'none' : 'block';
    }
  }

  // Renderizar la interfaz de usuario
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="bg-white shadow-md rounded-lg p-6">
        <h2 class="text-2xl font-bold mb-6 text-gray-800">Gestión de Categorías</h2>
        
        <!-- Indicador de carga -->
        <div class="loading-indicator flex justify-center items-center py-8" style="display: none;">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
        
        <!-- Formulario para crear/editar categorías -->
        <div class="category-form mb-8 bg-gray-50 p-4 rounded-md">
          <h3 class="text-lg font-semibold mb-4 category-form-title">Crear Nueva Categoría</h3>
          <form id="categoryForm">
            <input type="hidden" id="categoryId" value="">
            
            <div class="mb-4">
              <label for="categoryName" class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" id="categoryName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" required>
            </div>
            
            <div class="mb-4">
              <label for="categorySlug" class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input type="text" id="categorySlug" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" required>
              <p class="text-xs text-gray-500 mt-1">Identificador único para la URL (solo letras, números y guiones)</p>
            </div>
            
            <div class="mb-4">
              <label for="categoryDescription" class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea id="categoryDescription" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" rows="3"></textarea>
            </div>
            
            <div class="flex justify-between">
              <button type="submit" id="saveCategory" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300">
                Guardar Categoría
              </button>
              <button type="button" id="cancelEdit" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition duration-300" style="display: none;">
                Cancelar
              </button>
            </div>
          </form>
        </div>
        
        <!-- Lista de categorías -->
        <div class="category-list">
          <h3 class="text-lg font-semibold mb-4">Categorías Existentes</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th class="py-3 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Nombre</th>
                  <th class="py-3 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Slug</th>
                  <th class="py-3 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Descripción</th>
                  <th class="py-3 px-4 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
                </tr>
              </thead>
              <tbody id="categoriesTableBody">
                ${this.renderCategoriesTable()}
              </tbody>
            </table>
          </div>
          ${this.categories.length === 0 ? '<p class="text-gray-500 text-center py-4">No hay categorías disponibles</p>' : ''}
        </div>
      </div>
    `;
  }

  // Renderizar tabla de categorías
  renderCategoriesTable() {
    if (this.categories.length === 0) {
      return '';
    }
    
    return this.categories.map(category => `
      <tr class="hover:bg-gray-50" data-slug="${category.slug}">
        <td class="py-3 px-4 border-b">${category.name}</td>
        <td class="py-3 px-4 border-b">${category.slug}</td>
        <td class="py-3 px-4 border-b">${category.description || '-'}</td>
        <td class="py-3 px-4 border-b text-center">
          <button class="edit-category bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded-md text-xs mr-2 transition duration-300">
            Editar
          </button>
          <button class="delete-category bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded-md text-xs transition duration-300">
            Eliminar
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Adjuntar event listeners
  attachEventListeners() {
    if (!this.container) return;
    
    // Formulario de categoría
    const categoryForm = this.container.querySelector('#categoryForm');
    if (categoryForm) {
      categoryForm.addEventListener('submit', (e) => this.handleSaveCategory(e));
    }
    
    // Botón cancelar edición
    const cancelButton = this.container.querySelector('#cancelEdit');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.resetForm());
    }
    
    // Generar slug automáticamente desde el nombre
    const nameInput = this.container.querySelector('#categoryName');
    const slugInput = this.container.querySelector('#categorySlug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('input', () => {
        // Solo generar slug automáticamente si no estamos editando una categoría existente
        // o si el usuario no ha modificado manualmente el slug
        if (!this.currentEditingCategory || slugInput.value === this.generateSlug(this.currentEditingCategory.name)) {
          slugInput.value = this.generateSlug(nameInput.value);
        }
      });
    }
    
    // Botones de editar y eliminar
    const editButtons = this.container.querySelectorAll('.edit-category');
    const deleteButtons = this.container.querySelectorAll('.delete-category');
    
    editButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const slug = e.target.closest('tr').dataset.slug;
        this.editCategory(slug);
      });
    });
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const slug = e.target.closest('tr').dataset.slug;
        this.confirmDeleteCategory(slug);
      });
    });
  }

  // Generar slug a partir del nombre
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '-')     // Reemplazar espacios por guiones
      .replace(/-+/g, '-')      // Eliminar guiones duplicados
      .trim();                  // Eliminar espacios al inicio y final
  }

  // Manejar guardar categoría (crear o actualizar)
  async handleSaveCategory(e) {
    e.preventDefault();
    
    const nameInput = this.container.querySelector('#categoryName');
    const slugInput = this.container.querySelector('#categorySlug');
    const descriptionInput = this.container.querySelector('#categoryDescription');
    
    const categoryData = {
      name: nameInput.value.trim(),
      slug: slugInput.value.trim(),
      description: descriptionInput.value.trim()
    };
    
    // Validar datos
    if (!categoryData.name || !categoryData.slug) {
      showNotification('error', 'El nombre y el slug son obligatorios');
      return;
    }
    
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      if (this.currentEditingCategory) {
        // Actualizar categoría existente
        await this.contentManager.updateCategory(this.currentEditingCategory.slug, categoryData);
        showNotification('success', 'Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await this.contentManager.createCategory(categoryData);
        showNotification('success', 'Categoría creada correctamente');
      }
      
      // Recargar categorías y resetear formulario
      await this.loadCategories();
      this.resetForm();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      showNotification('error', error.message);
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  // Editar categoría
  async editCategory(slug) {
    try {
      const category = this.categories.find(c => c.slug === slug);
      if (!category) {
        showNotification('error', 'Categoría no encontrada');
        return;
      }
      
      // Guardar la categoría que estamos editando
      this.currentEditingCategory = category;
      
      // Actualizar título del formulario
      const formTitle = this.container.querySelector('.category-form-title');
      if (formTitle) {
        formTitle.textContent = 'Editar Categoría';
      }
      
      // Llenar formulario con datos de la categoría
      const nameInput = this.container.querySelector('#categoryName');
      const slugInput = this.container.querySelector('#categorySlug');
      const descriptionInput = this.container.querySelector('#categoryDescription');
      
      if (nameInput) nameInput.value = category.name;
      if (slugInput) slugInput.value = category.slug;
      if (descriptionInput) descriptionInput.value = category.description || '';
      
      // Mostrar botón cancelar
      const cancelButton = this.container.querySelector('#cancelEdit');
      if (cancelButton) {
        cancelButton.style.display = 'block';
      }
      
      // Hacer scroll al formulario
      this.container.querySelector('.category-form').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      showNotification('error', `Error al cargar la categoría: ${error.message}`);
    }
  }

  // Confirmar eliminación de categoría
  async confirmDeleteCategory(slug) {
    const category = this.categories.find(c => c.slug === slug);
    if (!category) {
      showNotification('error', 'Categoría no encontrada');
      return;
    }
    
    showConfirmDialog({
      title: 'Eliminar Categoría',
      message: `¿Estás seguro de que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      onConfirm: () => this.deleteCategory(slug)
    });
  }

  // Eliminar categoría
  async deleteCategory(slug) {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      await this.contentManager.deleteCategory(slug);
      
      showNotification('success', 'Categoría eliminada correctamente');
      
      // Recargar categorías
      await this.loadCategories();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      // Mostrar mensaje específico si la categoría está en uso
      if (error.message.includes('está siendo utilizada')) {
        showNotification('error', 'No se puede eliminar la categoría porque está siendo utilizada en artículos. Debes cambiar la categoría de esos artículos primero.');
      } else {
        showNotification('error', `Error al eliminar la categoría: ${error.message}`);
      }
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }

  // Resetear formulario
  resetForm() {
    const categoryForm = this.container.querySelector('#categoryForm');
    if (categoryForm) {
      categoryForm.reset();
    }
    
    // Cambiar título del formulario
    const formTitle = this.container.querySelector('.category-form-title');
    if (formTitle) {
      formTitle.textContent = 'Crear Nueva Categoría';
    }
    
    // Ocultar botón cancelar
    const cancelButton = this.container.querySelector('#cancelEdit');
    if (cancelButton) {
      cancelButton.style.display = 'none';
    }
    
    // Limpiar categoría en edición
    this.currentEditingCategory = null;
  }
}
