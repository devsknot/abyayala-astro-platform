// Gestor de autores para el CMS
import { notifications } from './notification.js';

export class AuthorManager {
  constructor(contentManager) {
    this.contentManager = contentManager;
    this.authors = [];
    this.container = null;
    this.isLoading = false;
    this.currentEditingAuthor = null;
  }

  // Inicializar el gestor de autores
  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Contenedor #${containerId} no encontrado`);
      return;
    }

    await this.loadAuthors();
    this.render();
    this.attachEventListeners();
  }

  // Cargar autores desde la API
  async loadAuthors() {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      const response = await this.contentManager.getAuthors();
      this.authors = response.authors || [];
      
      // Ordenar autores por nombre
      this.authors.sort((a, b) => a.name.localeCompare(b.name));
      
      console.log('Autores cargados:', this.authors);
      
      this.isLoading = false;
      this.updateLoadingState();
      return this.authors;
    } catch (error) {
      this.isLoading = false;
      this.updateLoadingState();
      notifications.error(`Error al cargar autores: ${error.message}`);
      return [];
    }
  }

  // Actualizar estado de carga
  updateLoadingState() {
    try {
      // Mostrar/ocultar indicador de carga
      const loadingIndicator = this.container.querySelector('.loading-indicator');
      if (loadingIndicator) {
        loadingIndicator.style.display = this.isLoading ? 'flex' : 'none';
      }
      
      // Overlay de carga para bloquear interacciones durante operaciones
      const loadingOverlay = this.container.querySelector('.loading-overlay');
      if (loadingOverlay) {
        loadingOverlay.style.display = this.isLoading ? 'flex' : 'none';
      }
      
      // Deshabilitar/habilitar botones y formularios mientras se carga
      const buttons = this.container.querySelectorAll('button');
      const inputs = this.container.querySelectorAll('input, textarea, select');
      
      buttons.forEach(button => {
        button.disabled = this.isLoading;
      });
      
      inputs.forEach(input => {
        input.disabled = this.isLoading;
      });
      
      console.log(`Estado de carga actualizado: ${this.isLoading ? 'Cargando' : 'Completado'}`);
    } catch (error) {
      console.error('Error al actualizar estado de carga:', error);
    }
  }

  // Renderizar la interfaz de usuario
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="bg-white shadow-md rounded-lg p-6">
        <!-- Header con título y botón -->
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Gestión de Autores</h2>
          <button id="createAuthorBtn" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300">
            Crear Nuevo Autor
          </button>
        </div>
        
        <!-- Overlay de carga para bloquear interacciones durante operaciones -->
        <div class="loading-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" style="display: none;">
          <div class="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
            <p class="text-gray-700">Procesando...</p>
          </div>
        </div>
        
        <!-- Indicador de carga -->
        <div class="loading-indicator flex justify-center items-center py-8" style="display: none;">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
        </div>
        
        <!-- Vista de lista de autores -->
        <div class="authors-list active">
          <div class="overflow-x-auto">
            <table class="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th class="py-3 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Autor</th>
                  <th class="py-3 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Slug</th>
                  <th class="py-3 px-4 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Email</th>
                  <th class="py-3 px-4 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Acciones</th>
                </tr>
              </thead>
              <tbody id="authorsTableBody">
                <!-- La tabla se llenará dinámicamente con renderAuthorsList() -->
              </tbody>
            </table>
          </div>
          <div id="emptyAuthorsMessage" class="text-gray-500 text-center py-4" style="display: none;">
            <p>No hay autores disponibles. ¡Crea el primero!</p>
          </div>
        </div>
        
        <!-- Vista de formulario para crear/editar autores -->
        <div class="author-editor" style="display: none;">
          <div class="mb-4">
            <button class="back-to-list-btn flex items-center text-blue-600 hover:text-blue-800 transition duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              Volver a la lista
            </button>
          </div>
          
          <h3 class="text-xl font-bold mb-4 author-form-title">Crear Nuevo Autor</h3>
          
          <form id="authorForm" class="bg-gray-50 p-6 rounded-md shadow-sm">
            <input type="hidden" id="authorId" value="">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div class="mb-4">
                  <label for="authorName" class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input type="text" id="authorName" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" required>
                </div>
                
                <div class="mb-4">
                  <label for="authorSlug" class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" id="authorSlug" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" required>
                  <p class="text-xs text-gray-500 mt-1" id="slugHelpText">Identificador único para la URL (solo letras, números y guiones)</p>
                </div>
                
                <div class="mb-4">
                  <label for="authorEmail" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" id="authorEmail" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                </div>
              </div>
              
              <div>
                <div class="mb-4">
                  <label for="authorAvatar" class="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                  <input type="text" id="authorAvatar" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                  <div class="mt-2 flex items-center">
                    <div class="avatar-preview w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      <img id="avatarPreview" src="" alt="Avatar Preview" style="display: none; width: 100%; height: 100%; object-fit: cover;">
                      <span class="text-gray-400" id="avatarPlaceholder">Sin avatar</span>
                    </div>
                  </div>
                </div>
                
                <div class="mb-4">
                  <label for="authorBio" class="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
                  <textarea id="authorBio" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" rows="4"></textarea>
                </div>
              </div>
            </div>
            
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Redes Sociales (Opcional)</label>
              <div class="social-media-inputs grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="social_twitter" class="block text-xs text-gray-500 mb-1">Twitter URL</label>
                  <input type="text" id="social_twitter" placeholder="https://twitter.com/usuario" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                </div>
                <div>
                  <label for="social_facebook" class="block text-xs text-gray-500 mb-1">Facebook URL</label>
                  <input type="text" id="social_facebook" placeholder="https://facebook.com/usuario" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                </div>
                <div>
                  <label for="social_instagram" class="block text-xs text-gray-500 mb-1">Instagram URL</label>
                  <input type="text" id="social_instagram" placeholder="https://instagram.com/usuario" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                </div>
                <div>
                  <label for="social_website" class="block text-xs text-gray-500 mb-1">Sitio Web</label>
                  <input type="text" id="social_website" placeholder="https://sitioweb.com" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                </div>
              </div>
            </div>
            
            <div class="flex justify-between mt-6">
              <div>
                <button type="submit" id="saveAuthor" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 mr-2">
                  Guardar Autor
                </button>
                <button type="button" id="cancelEditAuthor" class="bg-gray-400 hover:bg-gray-500 text-white font-medium py-2 px-4 rounded-md transition duration-300">
                  Cancelar
                </button>
              </div>
              <button type="button" id="deleteAuthor" class="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition duration-300" style="display: none;">
                Eliminar Autor
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
    
    // Renderizar la lista de autores
    this.renderAuthorsList();
  }
  
  // Renderizar lista de autores
  renderAuthorsList() {
    try {
      console.log('Renderizando lista de autores...');
      
      const authorsTableBody = this.container.querySelector('#authorsTableBody');
      const emptyAuthorsMessage = this.container.querySelector('#emptyAuthorsMessage');
      
      if (!authorsTableBody) {
        console.error('No se encontró el elemento #authorsTableBody');
        return;
      }
      
      // Limpiar tabla
      authorsTableBody.innerHTML = '';
      
      // Mostrar/ocultar mensaje de lista vacía
      if (emptyAuthorsMessage) {
        emptyAuthorsMessage.style.display = this.authors.length === 0 ? 'block' : 'none';
      }
      
      if (this.authors.length === 0) {
        console.log('No hay autores para mostrar');
        return;
      }
      
      // Crear fragmento para mejor rendimiento
      const fragment = document.createDocumentFragment();
      
      // Agregar cada autor a la tabla
      this.authors.forEach(author => {
        // Verificar que el autor tenga un slug válido
        if (!author.slug) {
          console.error('Autor sin slug:', author);
          // Generar un slug temporal si no existe
          author.slug = this.generateSlug(author.name || 'autor-sin-nombre');
        }
        
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200 hover:bg-gray-50';
        
        row.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
              <div class="flex-shrink-0 h-10 w-10">
                ${author.avatar 
                  ? `<img class="h-10 w-10 rounded-full object-cover" src="${author.avatar}" alt="${author.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'U')}&background=random';">` 
                  : `<div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>`
                }
              </div>
              <div class="ml-4">
                <div class="text-sm font-medium text-gray-900">${author.name || 'Sin nombre'}</div>
              </div>
            </div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-900">${author.slug}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap">
            <div class="text-sm text-gray-500">${author.email || 'Sin email'}</div>
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
            <button class="text-indigo-600 hover:text-indigo-900 mr-3 edit-author" data-slug="${author.slug}">
              Editar
            </button>
            <button class="text-red-600 hover:text-red-900 delete-author" data-slug="${author.slug}">
              Eliminar
            </button>
          </td>
        `;
        
        fragment.appendChild(row);
      });
      
      // Agregar todos los autores a la tabla
      authorsTableBody.appendChild(fragment);
      
      console.log(`${this.authors.length} autores renderizados correctamente`);
    } catch (error) {
      console.error('Error al renderizar lista de autores:', error);
      notifications.error('Error al mostrar la lista de autores');
    }
  }
  
  // Mostrar el editor de autores
  showAuthorEditor() {
    try {
      console.log('Mostrando editor de autores...');
      
      const authorsList = this.container.querySelector('.authors-list');
      const authorEditor = this.container.querySelector('.author-editor');
      
      // Ocultar la lista de autores
      if (authorsList) {
        authorsList.classList.remove('active');
        authorsList.style.display = 'none';
      }
      
      // Mostrar el editor
      if (authorEditor) {
        authorEditor.style.display = 'block';
      }
      
      // Actualizar título del formulario
      const formTitle = this.container.querySelector('.author-form-title');
      if (formTitle && !this.currentEditingAuthor) {
        formTitle.textContent = 'Crear Nuevo Autor';
      }
      
      console.log('Editor de autores mostrado correctamente');
    } catch (error) {
      console.error('Error al mostrar editor de autores:', error);
    }
  }
  
  // Mostrar la lista de autores
  showAuthorsList() {
    try {
      console.log('Mostrando lista de autores...');
      
      const authorsList = this.container.querySelector('.authors-list');
      const authorEditor = this.container.querySelector('.author-editor');
      
      // Mostrar la lista de autores
      if (authorsList) {
        authorsList.classList.add('active');
        authorsList.style.display = 'block';
      }
      
      // Ocultar el editor
      if (authorEditor) {
        authorEditor.style.display = 'none';
      }
      
      // Resetear el formulario
      this.resetForm();
      
      console.log('Lista de autores mostrada correctamente');
    } catch (error) {
      console.error('Error al mostrar lista de autores:', error);
    }
  }
  
  // Adjuntar event listeners
  attachEventListeners() {
    if (!this.container) return;
    
    // Botón para crear nuevo autor
    const createAuthorBtn = this.container.querySelector('#createAuthorBtn');
    if (createAuthorBtn) {
      createAuthorBtn.addEventListener('click', () => {
        this.resetForm();
        this.showAuthorEditor();
      });
    }
    
    // Botón para volver a la lista
    const backToListBtn = this.container.querySelector('.back-to-list-btn');
    if (backToListBtn) {
      backToListBtn.addEventListener('click', () => this.showAuthorsList());
    }
    
    // Botón para cancelar la edición
    const cancelEditBtn = this.container.querySelector('#cancelEditAuthor');
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener('click', () => {
        console.log('Cancelando edición de autor');
        this.showAuthorsList();
      });
    }
    
    // Formulario de autor
    const authorForm = this.container.querySelector('#authorForm');
    if (authorForm) {
      authorForm.addEventListener('submit', (e) => this.handleSaveAuthor(e));
    }
    
    // Generar slug automáticamente desde el nombre
    const nameInput = this.container.querySelector('#authorName');
    const slugInput = this.container.querySelector('#authorSlug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('input', () => {
        // Solo generar slug automáticamente si no estamos editando un autor existente
        // o si el usuario no ha modificado manualmente el slug
        if (!this.currentEditingAuthor || slugInput.value === this.generateSlug(this.currentEditingAuthor.name)) {
          slugInput.value = this.generateSlug(nameInput.value);
        }
      });
    }
    
    // Vista previa del avatar
    const avatarInput = this.container.querySelector('#authorAvatar');
    const avatarPreview = this.container.querySelector('#avatarPreview');
    const avatarPlaceholder = this.container.querySelector('#avatarPlaceholder');
    
    if (avatarInput && avatarPreview && avatarPlaceholder) {
      avatarInput.addEventListener('input', () => {
        const avatarUrl = avatarInput.value.trim();
        if (avatarUrl) {
          avatarPreview.src = avatarUrl;
          avatarPreview.style.display = 'block';
          avatarPlaceholder.style.display = 'none';
          
          // Manejar errores de carga de imagen
          avatarPreview.onerror = () => {
            avatarPreview.style.display = 'none';
            avatarPlaceholder.style.display = 'block';
            console.error('Error al cargar la imagen de avatar');
          };
        } else {
          avatarPreview.style.display = 'none';
          avatarPlaceholder.style.display = 'block';
        }
      });
    }
    
    // Botón para seleccionar imagen
    const selectAvatarBtn = this.container.querySelector('#selectAvatarBtn');
    if (selectAvatarBtn) {
      selectAvatarBtn.addEventListener('click', () => {
        // Aquí se podría implementar la apertura del selector de medios
        console.log('Abrir selector de medios para avatar');
        // Por ahora, simplemente alertamos
        notifications.info('Funcionalidad de selección de imágenes en desarrollo');
      });
    }
    
    // Delegación de eventos para botones de editar y eliminar
    const authorsTable = this.container.querySelector('#authorsTableBody');
    if (authorsTable) {
      authorsTable.addEventListener('click', (e) => {
        // Si se hizo clic en un botón de editar
        if (e.target.classList.contains('edit-author') || e.target.closest('.edit-author')) {
          const button = e.target.classList.contains('edit-author') ? e.target : e.target.closest('.edit-author');
          const slug = button.dataset.slug;
          
          if (!slug) {
            console.error('No se encontró el slug en el botón de editar');
            notifications.error('Error al editar: No se pudo identificar el autor');
            return;
          }
          
          console.log(`Editando autor con slug: ${slug}`);
          this.editAuthor(slug);
        }
        
        // Si se hizo clic en un botón de eliminar
        if (e.target.classList.contains('delete-author') || e.target.closest('.delete-author')) {
          const button = e.target.classList.contains('delete-author') ? e.target : e.target.closest('.delete-author');
          const slug = button.dataset.slug;
          
          if (!slug) {
            console.error('No se encontró el slug en el botón de eliminar');
            notifications.error('Error al eliminar: No se pudo identificar el autor');
            return;
          }
          
          console.log(`Confirmando eliminación de autor con slug: ${slug}`);
          this.confirmDeleteAuthor(slug);
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
  
  // Manejar guardar autor (crear o actualizar)
  async handleSaveAuthor(e) {
    e.preventDefault();
    
    const nameInput = this.container.querySelector('#authorName');
    const slugInput = this.container.querySelector('#authorSlug');
    const emailInput = this.container.querySelector('#authorEmail');
    const bioInput = this.container.querySelector('#authorBio');
    const avatarInput = this.container.querySelector('#authorAvatar');
    
    // Recopilar datos de redes sociales
    const twitterInput = this.container.querySelector('#social_twitter');
    const facebookInput = this.container.querySelector('#social_facebook');
    const instagramInput = this.container.querySelector('#social_instagram');
    const websiteInput = this.container.querySelector('#social_website');
    
    // Crear objeto de redes sociales
    const socialMedia = {};
    if (twitterInput && twitterInput.value) socialMedia.twitter = twitterInput.value.trim();
    if (facebookInput && facebookInput.value) socialMedia.facebook = facebookInput.value.trim();
    if (instagramInput && instagramInput.value) socialMedia.instagram = instagramInput.value.trim();
    if (websiteInput && websiteInput.value) socialMedia.website = websiteInput.value.trim();
    
    const authorData = {
      name: nameInput.value.trim(),
      slug: slugInput.value.trim(),
      email: emailInput.value.trim(),
      bio: bioInput.value.trim(),
      avatar: avatarInput.value.trim(),
      social_media: Object.keys(socialMedia).length > 0 ? socialMedia : null
    };
    
    // Validar datos
    if (!authorData.name || !authorData.slug) {
      notifications.error('El nombre y el slug son obligatorios');
      return;
    }
    
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      if (this.currentEditingAuthor) {
        // Actualizar autor existente
        console.log(`Actualizando autor con slug: ${this.currentEditingAuthor.slug}`, authorData);
        
        // Verificar si se está intentando cambiar el slug
        if (this.currentEditingAuthor.slug !== authorData.slug) {
          // Mostrar advertencia y restaurar el slug original
          console.warn('No se puede cambiar el slug de un autor existente. Se usará el slug original.');
          notifications.warning('No se puede cambiar el slug de un autor existente. Se usará el slug original.');
          authorData.slug = this.currentEditingAuthor.slug;
        }
        
        await this.contentManager.updateAuthor(this.currentEditingAuthor.slug, authorData);
        notifications.success('Autor actualizado correctamente');
      } else {
        // Crear nuevo autor
        console.log('Creando nuevo autor:', authorData);
        await this.contentManager.createAuthor(authorData);
        notifications.success('Autor creado correctamente');
      }
      
      // Recargar autores y volver a la lista
      await this.loadAuthors();
      this.render();
      this.attachEventListeners();
      this.showAuthorsList();
    } catch (error) {
      console.error('Error al guardar autor:', error);
      notifications.error(error.message);
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }
  
  // Editar autor
  async editAuthor(slug) {
    try {
      console.log(`Buscando autor con slug: ${slug}`);
      
      const author = this.authors.find(a => a.slug === slug);
      
      if (!author) {
        console.error(`Autor con slug '${slug}' no encontrado`);
        notifications.error('Autor no encontrado');
        return;
      }
      
      // Guardar el autor que estamos editando
      this.currentEditingAuthor = author;
      
      // Mostrar el editor de autores
      this.showAuthorEditor();
      
      // Actualizar título del formulario
      const formTitle = this.container.querySelector('.author-form-title');
      if (formTitle) {
        formTitle.textContent = 'Editar Autor';
      }
      
      // Llenar formulario con datos del autor
      const nameInput = this.container.querySelector('#authorName');
      const slugInput = this.container.querySelector('#authorSlug');
      const emailInput = this.container.querySelector('#authorEmail');
      const bioInput = this.container.querySelector('#authorBio');
      const avatarInput = this.container.querySelector('#authorAvatar');
      
      if (nameInput) nameInput.value = author.name || '';
      if (slugInput) {
        slugInput.value = author.slug || '';
        // Deshabilitar el campo de slug para evitar intentos de cambio
        slugInput.disabled = true;
        // Agregar un mensaje informativo
        const slugHelpText = this.container.querySelector('#slugHelpText');
        if (slugHelpText) {
          slugHelpText.innerHTML = '<span class="text-yellow-600">El slug no se puede modificar en autores existentes</span>';
        }
      }
      if (emailInput) emailInput.value = author.email || '';
      if (bioInput) bioInput.value = author.bio || '';
      if (avatarInput) avatarInput.value = author.avatar || '';
      
      // Actualizar vista previa del avatar
      const avatarPreview = this.container.querySelector('#avatarPreview');
      const avatarPlaceholder = this.container.querySelector('#avatarPlaceholder');
      
      if (avatarPreview && avatarPlaceholder) {
        if (author.avatar) {
          avatarPreview.src = author.avatar;
          avatarPreview.style.display = 'block';
          avatarPlaceholder.style.display = 'none';
        } else {
          avatarPreview.style.display = 'none';
          avatarPlaceholder.style.display = 'block';
        }
      }
      
      // Llenar datos de redes sociales
      const socialMedia = author.social_media || {};
      
      const twitterInput = this.container.querySelector('#social_twitter');
      const facebookInput = this.container.querySelector('#social_facebook');
      const instagramInput = this.container.querySelector('#social_instagram');
      const websiteInput = this.container.querySelector('#social_website');
      
      if (twitterInput) twitterInput.value = socialMedia.twitter || '';
      if (facebookInput) facebookInput.value = socialMedia.facebook || '';
      if (instagramInput) instagramInput.value = socialMedia.instagram || '';
      if (websiteInput) websiteInput.value = socialMedia.website || '';
      
      // Mostrar botón de eliminar
      const deleteButton = this.container.querySelector('#deleteAuthor');
      if (deleteButton) {
        deleteButton.style.display = 'block';
        deleteButton.addEventListener('click', () => this.confirmDeleteAuthor(slug));
      }
      
      console.log(`Autor '${author.name}' cargado para edición`);
    } catch (error) {
      console.error(`Error al cargar el autor: ${error.message}`);
      notifications.error(`Error al cargar el autor: ${error.message}`);
    }
  }
  
  // Confirmar eliminación de autor
  async confirmDeleteAuthor(slug) {
    console.log(`Confirmando eliminación de autor con slug: ${slug}`);
    
    const author = this.authors.find(a => a.slug === slug);
    
    if (!author) {
      console.error(`Autor con slug '${slug}' no encontrado para eliminar`);
      notifications.error('Autor no encontrado');
      return;
    }
    
    const confirmed = await notifications.confirm(
      `¿Estás seguro de que deseas eliminar el autor "${author.name}"? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );
    
    if (confirmed) {
      this.deleteAuthor(slug);
    }
  }
  
  // Eliminar autor
  async deleteAuthor(slug) {
    try {
      this.isLoading = true;
      this.updateLoadingState();
      
      await this.contentManager.deleteAuthor(slug);
      
      notifications.success('Autor eliminado correctamente');
      
      // Recargar autores
      await this.loadAuthors();
      this.render();
      this.attachEventListeners();
      this.showAuthorsList();
    } catch (error) {
      // Mostrar mensaje específico si el autor está en uso
      if (error.message.includes('está siendo utilizado')) {
        notifications.error('No se puede eliminar el autor porque está siendo utilizado en artículos. Debes cambiar el autor de esos artículos primero.');
      } else {
        notifications.error(`Error al eliminar el autor: ${error.message}`);
      }
    } finally {
      this.isLoading = false;
      this.updateLoadingState();
    }
  }
  
  // Resetear formulario
  resetForm() {
    const authorForm = this.container.querySelector('#authorForm');
    if (authorForm) {
      authorForm.reset();
    }
    
    // Cambiar título del formulario
    const formTitle = this.container.querySelector('.author-form-title');
    if (formTitle) {
      formTitle.textContent = 'Crear Nuevo Autor';
    }
    
    // Habilitar campo de slug para nuevos autores
    const slugInput = this.container.querySelector('#authorSlug');
    const slugHelpText = this.container.querySelector('#slugHelpText');
    if (slugInput) {
      slugInput.disabled = false;
    }
    if (slugHelpText) {
      slugHelpText.innerHTML = 'Identificador único para la URL (solo letras, números y guiones)';
      slugHelpText.className = 'text-xs text-gray-500 mt-1';
    }
    
    // Ocultar botón de eliminar
    const deleteButton = this.container.querySelector('#deleteAuthor');
    if (deleteButton) {
      deleteButton.style.display = 'none';
      // Eliminar event listeners anteriores
      deleteButton.replaceWith(deleteButton.cloneNode(true));
    }
    
    // Resetear vista previa del avatar
    const avatarPreview = this.container.querySelector('#avatarPreview');
    const avatarPlaceholder = this.container.querySelector('#avatarPlaceholder');
    
    if (avatarPreview && avatarPlaceholder) {
      avatarPreview.style.display = 'none';
      avatarPlaceholder.style.display = 'block';
    }
    
    // Limpiar autor en edición
    this.currentEditingAuthor = null;
    
    console.log('Formulario de autor reseteado');
  }
}
