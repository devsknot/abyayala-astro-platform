// Gestor de categorías para el CMS
import { notifications } from './notification.js';

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
      notifications.error(`Error al cargar categorías: ${error.message}`);
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
        <!-- Header con título y botón -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Gestión de Categorías</h2>
          <button id="createCategoryBtn" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300">
            Crear Nueva Categoría
          </button>
        </div>
        
        <!-- Indicador de carga -->
        <div class="loading-indicator flex justify-center items-center py-8" style="display: none;">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
        
        <!-- Vista de lista de categorías -->
        <div class="categories-list active">
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
        
        <!-- Vista de formulario para crear/editar categorías -->
        <div class="category-editor" style="display: none;">
          <div class="mb-4">
            <button class="back-to-list-btn flex items-center text-blue-600 hover:text-blue-800 transition duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              Volver a la lista
            </button>
          </div>
          
          <h3 class="text-xl font-bold mb-4 category-form-title">Crear Nueva Categoría</h3>
          
          <form id="categoryForm" class="bg-gray-50 p-6 rounded-md shadow-sm">
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
            
            <div class="flex justify-between mt-6">
              <button type="submit" id="saveCategory" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300">
                Guardar Categoría
              </button>
              <button type="button" id="deleteCategory" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-300" style="display: none;">
                Eliminar Categoría
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Renderizar tabla de categorías
  renderCategoriesTable() {
    if (this.categories.length === 0) {
      return '';
    }
    
    console.log('Renderizando tabla de categorías:', this.categories);
    
    return this.categories.map(category => {
      // Validar que la categoría tenga un slug válido
      if (!category.slug) {
        console.error('Categoría sin slug:', category);
        category.slug = this.generateSlug(category.name || 'categoria');
      }
      
      return `
        <tr class="hover:bg-gray-50" data-slug="${category.slug}" data-id="${category.id || ''}">
          <td class="py-3 px-4 border-b">${category.name || 'Sin nombre'}</td>
          <td class="py-3 px-4 border-b">${category.slug}</td>
          <td class="py-3 px-4 border-b">${category.description || '-'}</td>
          <td class="py-3 px-4 border-b text-center">
            <button class="edit-category bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded-md text-xs mr-2 transition duration-300" data-slug="${category.slug}">
              Editar
            </button>
            <button class="delete-category bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded-md text-xs transition duration-300" data-slug="${category.slug}">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Mostrar el editor de categorías
  showCategoryEditor() {
    try {
      console.log('Mostrando editor de categorías...');
      
      const categoriesList = this.container.querySelector('.categories-list');
      const categoryEditor = this.container.querySelector('.category-editor');
      
      // Ocultar la lista de categorías
      if (categoriesList) {
        categoriesList.classList.remove('active');
        categoriesList.style.display = 'none';
      }
      
      // Mostrar el editor
      if (categoryEditor) {
        categoryEditor.style.display = 'block';
        categoryEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      console.log('Editor de categorías mostrado correctamente');
    } catch (error) {
      console.error('Error al mostrar editor de categorías:', error);
    }
  }
  
  // Mostrar la lista de categorías
  showCategoriesList() {
    try {
      console.log('Mostrando lista de categorías...');
      
      const categoriesList = this.container.querySelector('.categories-list');
      const categoryEditor = this.container.querySelector('.category-editor');
      
      // Mostrar la lista de categorías
      if (categoriesList) {
        categoriesList.classList.add('active');
        categoriesList.style.display = 'block';
      }
      
      // Ocultar el editor
      if (categoryEditor) {
        categoryEditor.style.display = 'none';
      }
      
      // Resetear el formulario
      this.resetForm();
      
      console.log('Lista de categorías mostrada correctamente');
    } catch (error) {
      console.error('Error al mostrar lista de categorías:', error);
    }
  }
  
  // Adjuntar event listeners
  attachEventListeners() {
    if (!this.container) return;
    
    // Botón para crear nueva categoría
    const createCategoryBtn = this.container.querySelector('#createCategoryBtn');
    if (createCategoryBtn) {
      createCategoryBtn.addEventListener('click', () => {
        this.resetForm();
        this.showCategoryEditor();
      });
    }
    
    // Botón para volver a la lista
    const backToListBtn = this.container.querySelector('.back-to-list-btn');
    if (backToListBtn) {
      backToListBtn.addEventListener('click', () => this.showCategoriesList());
    }
    
    // Formulario de categoría
    const categoryForm = this.container.querySelector('#categoryForm');
    if (categoryForm) {
      categoryForm.addEventListener('submit', (e) => this.handleSaveCategory(e));
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
    
    // Delegación de eventos para botones de editar y eliminar
    const categoriesTable = this.container.querySelector('#categoriesTableBody');
    if (categoriesTable) {
      categoriesTable.addEventListener('click', (e) => {
        // Si se hizo clic en un botón de editar
        if (e.target.classList.contains('edit-category') || e.target.closest('.edit-category')) {
          const button = e.target.classList.contains('edit-category') ? e.target : e.target.closest('.edit-category');
          const slug = button.dataset.slug;
          
          if (!slug) {
            console.error('No se encontró el slug en el botón de editar');
            notifications.error('Error al editar: No se pudo identificar la categoría');
            return;
          }
          
          console.log(`Editando categoría con slug: ${slug}`);
          this.editCategory(slug);
        }
        
        // Si se hizo clic en un botón de eliminar
        if (e.target.classList.contains('delete-category') || e.target.closest('.delete-category')) {
          const button = e.target.classList.contains('delete-category') ? e.target : e.target.closest('.delete-category');
          const slug = button.dataset.slug;
          
          if (!slug) {
            console.error('No se encontró el slug en el botón de eliminar');
            notifications.error('Error al eliminar: No se pudo identificar la categoría');
            return;
          }
          
          console.log(`Confirmando eliminación de categoría con slug: ${slug}`);
          this.confirmDeleteCategory(slug);
        }
      });
    }
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
      notifications.error('El nombre y el slug son obligatorios');
      return;
    }
    
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      if (this.currentEditingCategory) {
        // Actualizar categoría existente
        await this.contentManager.updateCategory(this.currentEditingCategory.slug, categoryData);
        notifications.success('Categoría actualizada correctamente');
      } else {
        // Crear nueva categoría
        await this.contentManager.createCategory(categoryData);
        notifications.success('Categoría creada correctamente');
      }
      
      // Recargar categorías y volver a la lista
      await this.loadCategories();
      this.render();
      this.attachEventListeners();
      this.showCategoriesList();
    } catch (error) {
      notifications.error(error.message);
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
        notifications.error('Categoría no encontrada');
        return;
      }
      
      // Guardar la categoría que estamos editando
      this.currentEditingCategory = category;
      
      // Mostrar el editor de categorías
      this.showCategoryEditor();
      
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
      
      // Mostrar botón de eliminar
      const deleteButton = this.container.querySelector('#deleteCategory');
      if (deleteButton) {
        deleteButton.style.display = 'block';
        deleteButton.addEventListener('click', () => this.confirmDeleteCategory(slug));
      }
      
      console.log(`Categoría '${category.name}' cargada para edición`);
    } catch (error) {
      notifications.error(`Error al cargar la categoría: ${error.message}`);
    }
  }

  // Confirmar eliminación de categoría
  async confirmDeleteCategory(slug) {
    const category = this.categories.find(c => c.slug === slug);
    if (!category) {
      notifications.error('Categoría no encontrada');
      return;
    }
    
    const confirmed = await notifications.confirm(
      `¿Estás seguro de que deseas eliminar la categoría "${category.name}"? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );
    
    if (confirmed) {
      this.deleteCategory(slug);
    }
  }

  // Eliminar categoría
  async deleteCategory(slug) {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      await this.contentManager.deleteCategory(slug);
      
      notifications.success('Categoría eliminada correctamente');
      
      // Recargar categorías
      await this.loadCategories();
      this.render();
      this.attachEventListeners();
    } catch (error) {
      // Mostrar mensaje específico si la categoría está en uso
      if (error.message.includes('está siendo utilizada')) {
        notifications.error('No se puede eliminar la categoría porque está siendo utilizada en artículos. Debes cambiar la categoría de esos artículos primero.');
      } else {
        notifications.error(`Error al eliminar la categoría: ${error.message}`);
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
    
    // Ocultar botón de eliminar
    const deleteButton = this.container.querySelector('#deleteCategory');
    if (deleteButton) {
      deleteButton.style.display = 'none';
      // Eliminar event listeners anteriores
      deleteButton.replaceWith(deleteButton.cloneNode(true));
    }
    
    // Limpiar categoría en edición
    this.currentEditingCategory = null;
    
    console.log('Formulario de categoría reseteado');
  }
}
