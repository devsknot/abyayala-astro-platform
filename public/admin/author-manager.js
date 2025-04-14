/**
 * Gestor de autores para el panel de administración
 * Permite listar, crear, editar y eliminar autores
 */
class AuthorManager {
  constructor() {
    this.contentManager = new ContentManager();
    this.authors = [];
    this.currentAuthor = null;
    this.isEditing = false;
  }

  /**
   * Inicializa el gestor de autores
   * @param {HTMLElement} container - Elemento contenedor
   */
  async init(container) {
    this.container = container;
    this.render();
    await this.loadAuthors();
  }

  /**
   * Renderiza la interfaz del gestor de autores
   */
  render() {
    this.container.innerHTML = `
      <div class="p-4">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Gestión de Autores</h2>
          <button id="new-author-btn" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            Nuevo Autor
          </button>
        </div>
        
        <!-- Formulario de autor -->
        <div id="author-form" class="mb-8 p-4 bg-white rounded shadow-md hidden">
          <h3 id="form-title" class="text-xl font-semibold mb-4">Nuevo Autor</h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" id="author-name" class="w-full p-2 border rounded" placeholder="Nombre del autor">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input type="text" id="author-slug" class="w-full p-2 border rounded" placeholder="slug-del-autor">
              <p class="text-xs text-gray-500 mt-1">Identificador único para URLs (solo letras, números y guiones)</p>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
            <textarea id="author-bio" class="w-full p-2 border rounded" rows="4" placeholder="Breve biografía del autor"></textarea>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="author-email" class="w-full p-2 border rounded" placeholder="email@ejemplo.com">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Avatar (URL)</label>
              <input type="text" id="author-avatar" class="w-full p-2 border rounded" placeholder="https://ejemplo.com/imagen.jpg">
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Redes Sociales (JSON)</label>
            <textarea id="author-social" class="w-full p-2 border rounded" rows="3" placeholder='{"twitter": "@usuario", "instagram": "usuario"}'></textarea>
            <p class="text-xs text-gray-500 mt-1">Formato JSON con las redes sociales del autor</p>
          </div>
          
          <div class="flex justify-end space-x-2">
            <button id="cancel-author-btn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
              Cancelar
            </button>
            <button id="save-author-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Guardar
            </button>
          </div>
        </div>
        
        <!-- Mensaje de estado -->
        <div id="status-message" class="mb-4 hidden"></div>
        
        <!-- Lista de autores -->
        <div id="authors-list" class="bg-white rounded shadow-md overflow-hidden">
          <div class="p-4 bg-gray-50 border-b">
            <h3 class="font-semibold">Autores Registrados</h3>
          </div>
          <div id="authors-table-container" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículos</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody id="authors-table-body" class="bg-white divide-y divide-gray-200">
                <!-- Aquí se cargarán los autores -->
                <tr>
                  <td colspan="5" class="px-6 py-4 text-center text-gray-500">Cargando autores...</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    // Agregar event listeners
    this.addEventListeners();
  }

  /**
   * Agrega event listeners a los elementos de la interfaz
   */
  addEventListeners() {
    // Botón para crear nuevo autor
    document.getElementById('new-author-btn').addEventListener('click', () => {
      this.showAuthorForm();
    });
    
    // Botón para cancelar formulario
    document.getElementById('cancel-author-btn').addEventListener('click', () => {
      this.hideAuthorForm();
    });
    
    // Botón para guardar autor
    document.getElementById('save-author-btn').addEventListener('click', () => {
      this.saveAuthor();
    });
    
    // Generar slug automáticamente desde el nombre
    document.getElementById('author-name').addEventListener('input', (e) => {
      if (!this.isEditing) {
        const nameInput = e.target;
        const slugInput = document.getElementById('author-slug');
        slugInput.value = this.generateSlug(nameInput.value);
      }
    });
  }

  /**
   * Carga la lista de autores desde la API
   */
  async loadAuthors() {
    try {
      this.showStatusMessage('Cargando autores...', 'info');
      
      const authors = await this.contentManager.getAuthors();
      this.authors = authors;
      
      this.renderAuthorsList();
      this.hideStatusMessage();
    } catch (error) {
      console.error('Error al cargar autores:', error);
      this.showStatusMessage('Error al cargar autores: ' + error.message, 'error');
    }
  }

  /**
   * Renderiza la lista de autores en la tabla
   */
  renderAuthorsList() {
    const tableBody = document.getElementById('authors-table-body');
    
    if (!this.authors || this.authors.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay autores registrados</td>
        </tr>
      `;
      return;
    }
    
    tableBody.innerHTML = this.authors.map(author => `
      <tr>
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            ${author.avatar ? `<img class="h-10 w-10 rounded-full mr-3" src="${author.avatar}" alt="${author.name}">` : ''}
            <div>
              <div class="font-medium text-gray-900">${author.name}</div>
              ${author.bio ? `<div class="text-xs text-gray-500 truncate max-w-xs">${author.bio.substring(0, 50)}${author.bio.length > 50 ? '...' : ''}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${author.slug}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${author.email || '-'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${author.articles ? author.articles.length : '0'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button class="text-blue-600 hover:text-blue-900 mr-3 edit-author" data-slug="${author.slug}">Editar</button>
          <button class="text-red-600 hover:text-red-900 delete-author" data-slug="${author.slug}">Eliminar</button>
        </td>
      </tr>
    `).join('');
    
    // Agregar event listeners a los botones de acción
    document.querySelectorAll('.edit-author').forEach(button => {
      button.addEventListener('click', (e) => {
        const slug = e.target.getAttribute('data-slug');
        this.editAuthor(slug);
      });
    });
    
    document.querySelectorAll('.delete-author').forEach(button => {
      button.addEventListener('click', (e) => {
        const slug = e.target.getAttribute('data-slug');
        this.confirmDeleteAuthor(slug);
      });
    });
  }

  /**
   * Muestra el formulario para crear/editar un autor
   * @param {Object} author - Autor a editar (opcional)
   */
  showAuthorForm(author = null) {
    const form = document.getElementById('author-form');
    const formTitle = document.getElementById('form-title');
    
    // Limpiar formulario
    document.getElementById('author-name').value = '';
    document.getElementById('author-slug').value = '';
    document.getElementById('author-bio').value = '';
    document.getElementById('author-email').value = '';
    document.getElementById('author-avatar').value = '';
    document.getElementById('author-social').value = '';
    
    if (author) {
      // Modo edición
      this.isEditing = true;
      this.currentAuthor = author;
      formTitle.textContent = `Editar Autor: ${author.name}`;
      
      // Llenar formulario con datos del autor
      document.getElementById('author-name').value = author.name || '';
      document.getElementById('author-slug').value = author.slug || '';
      document.getElementById('author-bio').value = author.bio || '';
      document.getElementById('author-email').value = author.email || '';
      document.getElementById('author-avatar').value = author.avatar || '';
      
      // Convertir social_media a JSON si es necesario
      if (author.social_media) {
        try {
          const socialMedia = typeof author.social_media === 'string' 
            ? JSON.parse(author.social_media) 
            : author.social_media;
          document.getElementById('author-social').value = JSON.stringify(socialMedia, null, 2);
        } catch (e) {
          document.getElementById('author-social').value = author.social_media || '';
        }
      }
    } else {
      // Modo creación
      this.isEditing = false;
      this.currentAuthor = null;
      formTitle.textContent = 'Nuevo Autor';
    }
    
    // Mostrar formulario
    form.classList.remove('hidden');
    
    // Hacer scroll al formulario
    form.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Oculta el formulario de autor
   */
  hideAuthorForm() {
    document.getElementById('author-form').classList.add('hidden');
    this.isEditing = false;
    this.currentAuthor = null;
  }

  /**
   * Guarda un autor (crea o actualiza)
   */
  async saveAuthor() {
    try {
      // Obtener datos del formulario
      const authorData = {
        name: document.getElementById('author-name').value.trim(),
        slug: document.getElementById('author-slug').value.trim(),
        bio: document.getElementById('author-bio').value.trim(),
        email: document.getElementById('author-email').value.trim(),
        avatar: document.getElementById('author-avatar').value.trim(),
        social_media: document.getElementById('author-social').value.trim()
      };
      
      // Validar datos
      if (!authorData.name) {
        this.showStatusMessage('El nombre del autor es obligatorio', 'error');
        return;
      }
      
      if (!authorData.slug) {
        authorData.slug = this.generateSlug(authorData.name);
      }
      
      // Validar formato del slug
      if (!/^[a-z0-9-]+$/.test(authorData.slug)) {
        this.showStatusMessage('El slug solo puede contener letras minúsculas, números y guiones', 'error');
        return;
      }
      
      // Validar JSON de redes sociales
      if (authorData.social_media) {
        try {
          JSON.parse(authorData.social_media);
        } catch (e) {
          this.showStatusMessage('El formato de redes sociales debe ser JSON válido', 'error');
          return;
        }
      }
      
      this.showStatusMessage('Guardando autor...', 'info');
      
      let result;
      let activityType;
      
      if (this.isEditing && this.currentAuthor) {
        // Actualizar autor existente
        result = await this.contentManager.updateAuthor(this.currentAuthor.slug, authorData);
        activityType = 'edit';
        this.showStatusMessage(`Autor "${authorData.name}" actualizado correctamente`, 'success');
      } else {
        // Crear nuevo autor
        result = await this.contentManager.createAuthor(authorData);
        activityType = 'create';
        this.showStatusMessage(`Autor "${authorData.name}" creado correctamente`, 'success');
      }
      
      // Registrar la actividad
      try {
        await this.contentManager.logActivity({
          type: activityType,
          entity_type: 'author',
          entity_id: authorData.slug,
          entity_title: authorData.name,
          user_name: 'Admin',
          details: {
            email: authorData.email,
            bio_length: authorData.bio ? authorData.bio.length : 0
          }
        });
      } catch (activityError) {
        console.error('Error al registrar actividad de autor:', activityError);
        // No interrumpir el flujo si falla el registro de actividad
      }
      
      // Ocultar formulario y recargar lista
      this.hideAuthorForm();
      await this.loadAuthors();
    } catch (error) {
      console.error('Error al guardar autor:', error);
      this.showStatusMessage('Error al guardar autor: ' + error.message, 'error');
    }
  }

  /**
   * Edita un autor existente
   * @param {string} slug - Slug del autor a editar
   */
  async editAuthor(slug) {
    try {
      this.showStatusMessage('Cargando datos del autor...', 'info');
      
      // Buscar autor en la lista cargada
      let author = this.authors.find(a => a.slug === slug);
      
      // Si no está en la lista, obtenerlo de la API
      if (!author) {
        author = await this.contentManager.getAuthor(slug);
      }
      
      if (author) {
        this.showAuthorForm(author);
        this.hideStatusMessage();
      } else {
        this.showStatusMessage('Autor no encontrado', 'error');
      }
    } catch (error) {
      console.error('Error al cargar autor para edición:', error);
      this.showStatusMessage('Error al cargar autor: ' + error.message, 'error');
    }
  }

  /**
   * Muestra confirmación para eliminar un autor
   * @param {string} slug - Slug del autor a eliminar
   */
  confirmDeleteAuthor(slug) {
    const author = this.authors.find(a => a.slug === slug);
    
    if (!author) {
      this.showStatusMessage('Autor no encontrado', 'error');
      return;
    }
    
    if (confirm(`¿Estás seguro de que deseas eliminar al autor "${author.name}"?`)) {
      this.deleteAuthor(slug);
    }
  }

  /**
   * Elimina un autor
   * @param {string} slug - Slug del autor a eliminar
   */
  async deleteAuthor(slug) {
    try {
      this.showStatusMessage('Eliminando autor...', 'info');
      
      // Obtener información del autor antes de eliminarlo
      const author = this.authors.find(a => a.slug === slug);
      const authorName = author ? author.name : 'Autor desconocido';
      
      const result = await this.contentManager.deleteAuthor(slug);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Registrar la actividad
      try {
        await this.contentManager.logActivity({
          type: 'delete',
          entity_type: 'author',
          entity_id: slug,
          entity_title: authorName,
          user_name: 'Admin',
          details: {
            articles_count: author && author.articles ? author.articles.length : 0
          }
        });
      } catch (activityError) {
        console.error('Error al registrar actividad de eliminación de autor:', activityError);
        // No interrumpir el flujo si falla el registro de actividad
      }
      
      this.showStatusMessage('Autor eliminado correctamente', 'success');
      await this.loadAuthors();
    } catch (error) {
      console.error('Error al eliminar autor:', error);
      this.showStatusMessage('Error al eliminar autor: ' + error.message, 'error');
    }
  }

  /**
   * Genera un slug a partir de un texto
   * @param {string} text - Texto para generar el slug
   * @returns {string} Slug generado
   */
  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
      .replace(/\s+/g, '-')     // Reemplazar espacios por guiones
      .replace(/-+/g, '-')      // Eliminar guiones duplicados
      .trim();
  }

  /**
   * Muestra un mensaje de estado
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo de mensaje (success, error, info)
   */
  showStatusMessage(message, type = 'info') {
    const statusMessage = document.getElementById('status-message');
    
    // Definir clases según el tipo
    let classes = 'p-4 mb-4 rounded';
    
    switch (type) {
      case 'success':
        classes += ' bg-green-100 text-green-800 border border-green-200';
        break;
      case 'error':
        classes += ' bg-red-100 text-red-800 border border-red-200';
        break;
      default:
        classes += ' bg-blue-100 text-blue-800 border border-blue-200';
    }
    
    statusMessage.className = classes;
    statusMessage.textContent = message;
    statusMessage.classList.remove('hidden');
    
    // Ocultar mensaje después de 5 segundos si es éxito
    if (type === 'success') {
      setTimeout(() => {
        this.hideStatusMessage();
      }, 5000);
    }
  }

  /**
   * Oculta el mensaje de estado
   */
  hideStatusMessage() {
    document.getElementById('status-message').classList.add('hidden');
  }
}

// Exportar la clase
export default AuthorManager;
