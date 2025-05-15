// Aplicación principal del CMS - Versión simplificada
// Esta versión se enfoca solo en la autenticación básica y mostrar el panel

// Función para actualizar el estado de carga (definida en index.html)
const updateLoadingStatus = window.updateLoadingStatus || function(msg) { console.log(msg); };
const showDebugInfo = window.showDebugInfo || function(msg) { console.log(msg); };

// Usar la URL base global o crearla si no existe
window.appBaseUrl = window.appBaseUrl || window.location.origin;
const baseUrl = window.appBaseUrl;

// Señalar que la app ha comenzado a inicializarse
showDebugInfo('Iniciando la carga del CMS...');

// Estado global de la aplicación
const appState = {
  currentView: 'dashboard',
  user: null,
  authenticated: false
};

// Sistema de notificaciones básico
const notifications = {
  success: (msg) => { console.log('SUCCESS:', msg); alert(msg); },
  error: (msg) => { console.error('ERROR:', msg); alert('Error: ' + msg); },
  warning: (msg) => { console.warn('WARNING:', msg); alert('Advertencia: ' + msg); },
  info: (msg) => { console.info('INFO:', msg); alert('Info: ' + msg); }
};

// Función principal de inicialización (expuesta globalmente)
window.initializeApp = async function() {
  try {
    showDebugInfo('Iniciando función initializeApp');
    
    // Verificar autenticación usando localStorage
    updateLoadingStatus('Verificando autenticación...');
    showDebugInfo('Buscando datos de autenticación en localStorage');
    const authData = localStorage.getItem('abyayala_cms_auth');
    
    if (!authData) {
      showDebugInfo('No se encontraron datos de autenticación');
      // No hay datos de autenticación
      updateLoadingStatus('No hay sesión activa, redirigiendo a login...');
      setTimeout(() => {
        window.location.href = `${baseUrl}/admin/login.html`;
      }, 1000);
      return;
    }
    
    showDebugInfo('Datos de autenticación encontrados, procesando...');
    
    try {
      showDebugInfo('Parseando datos de autenticación');
      const auth = JSON.parse(authData);
      showDebugInfo('Datos parseados correctamente');
      
      // Verificar si la autenticación no ha expirado (24 horas)
      const now = Date.now();
      const authTime = auth.timestamp || 0;
      const authValid = (now - authTime) < (24 * 60 * 60 * 1000);
      showDebugInfo(`Verificando validez: timestamp=${authTime}, ahora=${now}, válido=${authValid}`);
      
      if (!auth.authenticated || !authValid) {
        showDebugInfo('Autenticación inválida o expirada');
        // Autenticación inválida o expirada
        localStorage.removeItem('abyayala_cms_auth');
        notifications.warning('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        
        updateLoadingStatus('Sesión expirada, redirigiendo a login...');
        setTimeout(() => {
          window.location.href = `${baseUrl}/admin/login.html`;
        }, 1000);
        return;
      }
      
      // Actualizar estado con datos de autenticación
      showDebugInfo('Autenticación válida, actualizando estado');
      appState.authenticated = true;
      appState.user = auth.user;
      showDebugInfo(`Usuario autenticado: ${auth.user?.name || 'Sin nombre'}`);
      
      // Renderizar la aplicación
      showDebugInfo('Preparando renderizado de la aplicación');
      const appContainer = document.getElementById('app');
      showDebugInfo('Contenedor encontrado: ' + (appContainer ? 'Sí' : 'No'));
      
      if (appContainer) {
        showDebugInfo('Llamando a renderApp');
        renderApp(appContainer);
        showDebugInfo('renderApp completado');
      } else {
        showDebugInfo('ERROR: No se encontró el contenedor #app');
      }
      
      // Marcar la app como inicializada
      window.appInitialized = true;
      updateLoadingStatus('Panel de administración cargado.');
      showDebugInfo('Inicialización completada con éxito');
    } catch (authError) {
      showDebugInfo(`Error al procesar autenticación: ${authError.message}`);
      localStorage.removeItem('abyayala_cms_auth');
      window.location.href = `${baseUrl}/admin/login.html`;
    }
  } catch (error) {
    showDebugInfo(`Error fatal en inicialización: ${error.message}`);
    updateLoadingStatus(`Error al inicializar: ${error.message}`);
  }
}

// Ya no iniciamos la aplicación con DOMContentLoaded
// La inicialización se maneja desde index.html después de cargar el script

// Renderizar la aplicación completa
function renderApp(container) {
  try {
    showDebugInfo('Iniciando renderizado de la aplicación');
    
    // Primero, ocultar el indicador de carga
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
      showDebugInfo('Ocultando indicador de carga');
      loadingElement.style.display = 'none';
    } else {
      showDebugInfo('No se encontró el indicador de carga para ocultarlo');
    }
    
    // Renderizar la interfaz principal
    showDebugInfo('Estableciendo HTML del contenedor principal');
    container.innerHTML = `
      <div class="flex h-screen bg-gray-100">
        <!-- Sidebar -->
        <div class="sidebar w-64 h-full bg-white shadow-md">
          <div class="p-4 border-b">
            <h1 class="text-xl font-bold">Abya Yala CMS</h1>
          </div>
          
          <nav class="mt-4">
            <a href="#dashboard" data-view="dashboard" class="sidebar-link active">
              <span class="mr-2">📊</span> Dashboard
            </a>
            <a href="#articles" data-view="articles" class="sidebar-link">
              <span class="mr-2">📝</span> Artículos
            </a>
            <a href="#media" data-view="media" class="sidebar-link">
              <span class="mr-2">🖼️</span> Multimedia
            </a>
            <a href="#categories" data-view="categories" class="sidebar-link">
              <span class="mr-2">🏷️</span> Categorías
            </a>
            <a href="#settings" data-view="settings" class="sidebar-link">
              <span class="mr-2">⚙️</span> Configuración
            </a>
          </nav>
          
          <div class="mt-auto p-4 border-t">
            <button id="logout-button" class="text-red-500 hover:text-red-700">
              <span class="mr-2">🚪</span> Cerrar sesión
            </button>
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="flex-1 overflow-auto">
          <header class="bg-white shadow-sm">
            <div class="flex justify-between items-center p-4">
              <h2 class="text-xl font-semibold" id="view-title">Dashboard</h2>
              <div class="flex items-center">
                <span class="text-sm text-gray-600 mr-2">Hola, ${appState.user?.name || 'Administrador'}</span>
                <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  ${(appState.user?.name || 'A').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </header>
          
          <main class="p-6" id="main-content">
            <!-- El contenido principal se cargará aquí -->
            <div class="bg-white rounded-lg shadow-md p-6">
              <h3 class="text-lg font-semibold mb-4">Bienvenido al Panel de Administración</h3>
              <p class="text-gray-600">
                Este es un panel simplificado para solucionar problemas de carga.
                Por favor, verifica que puedes acceder correctamente.
              </p>
              
              <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h4 class="font-medium text-blue-700">Artículos</h4>
                  <p class="text-sm text-blue-600 mt-1">Gestiona el contenido del sitio</p>
                </div>
                
                <div class="bg-green-50 p-4 rounded-lg border border-green-100">
                  <h4 class="font-medium text-green-700">Multimedia</h4>
                  <p class="text-sm text-green-600 mt-1">Administra imágenes y archivos</p>
                </div>
                
                <div class="bg-purple-50 p-4 rounded-lg border border-purple-100">
                  <h4 class="font-medium text-purple-700">Categorías</h4>
                  <p class="text-sm text-purple-600 mt-1">Organiza el contenido</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
    
    showDebugInfo('HTML establecido correctamente');
    
    // Configurar eventos
    showDebugInfo('Configurando eventos de la interfaz');
    setupEvents(container);
    showDebugInfo('Eventos configurados correctamente');
    
    // Actualizar estado de carga
    updateLoadingStatus('Panel de administración cargado correctamente');
  } catch (error) {
    showDebugInfo(`Error en renderApp: ${error.message}`);
    // Mostrar un mensaje de error amigable
    container.innerHTML = `
      <div class="p-8 text-center">
        <h2 class="text-2xl font-bold text-red-600 mb-4">Error al cargar el panel</h2>
        <p class="text-gray-700 mb-6">${error.message}</p>
        <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Intentar nuevamente
        </button>
      </div>
    `;
  }
}

// Configurar eventos de la interfaz
function setupEvents(container) {
  try {
    showDebugInfo('Configurando eventos de la interfaz');
    
    // Manejar clics en enlaces de la barra lateral
    const sidebarLinks = container.querySelectorAll('.sidebar-link');
    showDebugInfo(`Enlaces de navegación encontrados: ${sidebarLinks.length}`);
    
    if (sidebarLinks.length === 0) {
      showDebugInfo('ADVERTENCIA: No se encontraron enlaces de navegación');
    }
    
    sidebarLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        try {
          e.preventDefault();
          
          const viewName = link.textContent.trim();
          showDebugInfo(`Cambiando a vista: ${viewName}`);
          
          // Actualizar enlaces activos
          sidebarLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          
          // Actualizar vista actual
          const view = link.getAttribute('data-view');
          appState.currentView = view;
          
          // Actualizar título
          const titleElement = document.getElementById('view-title');
          if (titleElement) {
            titleElement.textContent = viewName;
          } else {
            showDebugInfo('ERROR: No se encontró el elemento de título');
          }
          
          // Cargar el contenido adecuado según la vista seleccionada
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            // Limpiar el contenido anterior
            mainContent.innerHTML = '';
            
            // Cargar el componente según la vista seleccionada
            switch (view) {
              case 'articles':
                showDebugInfo('Cargando gestor de artículos...');
                loadArticlesManager(mainContent);
                break;
              case 'media':
                showDebugInfo('Cargando biblioteca multimedia...');
                loadMediaLibrary(mainContent);
                break;
              case 'categories':
                showDebugInfo('Cargando gestor de categorías...');
                loadCategoriesManager(mainContent);
                break;
              case 'settings':
                showDebugInfo('Cargando configuración...');
                loadSettings(mainContent);
                break;
              case 'dashboard':
              default:
                // Cargar dashboard por defecto
                mainContent.innerHTML = `
                  <div class="bg-white rounded-lg shadow-md p-6">
                    <h3 class="text-lg font-semibold mb-4">Dashboard</h3>
                    <p class="text-gray-600">
                      Bienvenido al panel de administración de Abya Yala.
                    </p>
                    <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h4 class="font-medium text-blue-700">Artículos</h4>
                        <p class="text-sm text-blue-600 mt-1">Gestiona el contenido del sitio</p>
                      </div>
                      
                      <div class="bg-green-50 p-4 rounded-lg border border-green-100">
                        <h4 class="font-medium text-green-700">Multimedia</h4>
                        <p class="text-sm text-green-600 mt-1">Administra imágenes y archivos</p>
                      </div>
                      
                      <div class="bg-purple-50 p-4 rounded-lg border border-purple-100">
                        <h4 class="font-medium text-purple-700">Categorías</h4>
                        <p class="text-sm text-purple-600 mt-1">Organiza el contenido</p>
                      </div>
                    </div>
                  </div>
                `;
                showDebugInfo(`Vista ${viewName} cargada correctamente`);
              }
          } else {
            showDebugInfo('ERROR: No se encontró el contenedor principal');
          }
        } catch (navError) {
          showDebugInfo(`Error al cambiar de vista: ${navError.message}`);
        }
      });
    });
    
    // Manejar cierre de sesión
    const logoutButton = container.querySelector('#logout-button');
    if (logoutButton) {
      showDebugInfo('Configurando botón de cierre de sesión');
      logoutButton.addEventListener('click', () => {
        try {
          showDebugInfo('Botón de cierre de sesión pulsado');
          if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            showDebugInfo('Cerrando sesión...');
            localStorage.removeItem('abyayala_cms_auth');
            window.location.href = `${baseUrl}/admin/login.html`;
          } else {
            showDebugInfo('Cierre de sesión cancelado');
          }
        } catch (logoutError) {
          showDebugInfo(`Error al cerrar sesión: ${logoutError.message}`);
        }
      });
    } else {
      showDebugInfo('ADVERTENCIA: No se encontró el botón de cierre de sesión');
    }
    
    showDebugInfo('Eventos configurados correctamente');
  } catch (error) {
    showDebugInfo(`Error al configurar eventos: ${error.message}`);
  }
}

// Funciones para cargar los diferentes componentes del panel

// Cargar el gestor de artículos
async function loadArticlesManager(container) {
  try {
    showDebugInfo('Iniciando carga del gestor de artículos');
    container.innerHTML = '<div class="p-4"><div class="loading flex items-center"><div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 mr-3"></div> Cargando gestor de artículos...</div></div>';
    
    // Cargar dinámicamente los módulos necesarios con mejor manejo de errores
    let articleManagerModule, contentManagerModule, mediaManagerModule, notificationsModule;
    
    try {
      articleManagerModule = await import('./components/article-manager.js');
      showDebugInfo('Módulo article-manager.js cargado correctamente');
    } catch (importError) {
      showDebugInfo(`Error al cargar el módulo article-manager.js: ${importError.message}`);
      throw new Error(`Error al importar ArticleManager: ${importError.message}`);
    }
    
    try {
      contentManagerModule = await import('./content-manager.js');
      showDebugInfo('Módulo content-manager.js cargado correctamente');
    } catch (importError) {
      showDebugInfo(`Error al cargar el módulo content-manager.js: ${importError.message}`);
      throw new Error(`Error al importar ContentManager: ${importError.message}`);
    }
    
    try {
      mediaManagerModule = await import('./media-manager.js');
      showDebugInfo('Módulo media-manager.js cargado correctamente');
    } catch (importError) {
      showDebugInfo(`Error al cargar el módulo media-manager.js: ${importError.message}`);
      throw new Error(`Error al importar MediaManager: ${importError.message}`);
    }
    
    try {
      notificationsModule = await import('./components/notification.js');
      showDebugInfo('Módulo notification.js cargado correctamente');
    } catch (importError) {
      showDebugInfo(`Error al cargar el módulo notification.js: ${importError.message}`);
      throw new Error(`Error al importar notificaciones: ${importError.message}`);
    }
    
    // Crear instancia del gestor de artículos
    const ArticleManager = articleManagerModule.ArticleManager;
    const ContentManager = contentManagerModule.ContentManager;
    const MediaManager = mediaManagerModule.MediaManager;
    const notifications = notificationsModule.notifications;
    
    if (!ArticleManager) {
      throw new Error('No se pudo cargar el componente ArticleManager');
    }
    
    // Limpiar el contenedor
    container.innerHTML = '<div id="article-manager-container" class="p-4"></div>';
    const articleContainer = document.getElementById('article-manager-container');
    
    // Crear instancias de los managers necesarios
    const contentManager = new ContentManager();
    const mediaManager = new MediaManager();
    
    // Crear instancia y renderizar con el nuevo formato - con mejor manejo de errores
    let articleManager;
    try {
      articleManager = new ArticleManager(null, {
        contentManager: contentManager,
        mediaManager: mediaManager,
        notificationManager: notifications
      });
      showDebugInfo('Instancia de ArticleManager creada correctamente');
    } catch (constructorError) {
      showDebugInfo(`Error al crear instancia de ArticleManager: ${constructorError.message}`);
      throw new Error(`Error al instanciar ArticleManager: ${constructorError.message}`);
    }
    
    // Renderizar en el contenedor (método asíncrono) con mejor manejo de errores
    try {
      await articleManager.render(articleContainer);
      showDebugInfo('Gestor de artículos inicializado correctamente');
    } catch (renderError) {
      showDebugInfo(`Error al renderizar el gestor de artículos: ${renderError.message}`);
      throw new Error(`Error al renderizar ArticleManager: ${renderError.message}`);
    }
  } catch (error) {
    showDebugInfo(`Error al cargar el gestor de artículos: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el gestor de artículos: ${error.message}</p>
          <button class="mt-2 px-4 py-2 bg-red-500 text-white rounded" onclick="window.location.reload()">Reintentar</button>
        </div>
      </div>
    `;
  }
}

// Cargar la biblioteca multimedia
async function loadMediaLibrary(container) {
  try {
    showDebugInfo('Iniciando carga de la biblioteca multimedia');
    container.innerHTML = '<div class="p-4"><div class="loading flex items-center"><div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 mr-3"></div> Cargando biblioteca multimedia...</div></div>';
    
    // Cargar dinámicamente el módulo MediaLibrary
    const mediaLibraryModule = await import('./components/media-library.js');
    const contentManagerModule = await import('./content-manager.js');
    
    showDebugInfo('Módulos multimedia cargados correctamente');
    
    // Crear instancia de la biblioteca multimedia
    const MediaLibrary = mediaLibraryModule.MediaLibrary;
    const ContentManager = contentManagerModule.ContentManager;
    
    if (!MediaLibrary) {
      throw new Error('No se pudo cargar el componente MediaLibrary');
    }
    
    // Limpiar el contenedor
    container.innerHTML = '<div id="media-library-container" class="p-4"></div>';
    const mediaContainer = document.getElementById('media-library-container');
    
    // Crear instancia y renderizar
    const mediaLibrary = new MediaLibrary(mediaContainer);
    showDebugInfo('Biblioteca multimedia inicializada correctamente');
  } catch (error) {
    showDebugInfo(`Error al cargar la biblioteca multimedia: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar la biblioteca multimedia: ${error.message}</p>
          <button class="mt-2 px-4 py-2 bg-red-500 text-white rounded" onclick="window.location.reload()">Reintentar</button>
        </div>
      </div>
    `;
  }
}

// Cargar el gestor de categorías
async function loadCategoriesManager(container) {
  try {
    showDebugInfo('Iniciando carga del gestor de categorías');
    container.innerHTML = '<div class="p-4"><div class="loading flex items-center"><div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 mr-3"></div> Cargando gestor de categorías...</div></div>';
    
    // Cargar dinámicamente el módulo CategoryManager
    const categoryManagerModule = await import('./components/category-manager.js');
    const contentManagerModule = await import('./content-manager.js');
    
    showDebugInfo('Módulos de categorías cargados correctamente');
    
    // Crear instancia del gestor de categorías
    const CategoryManager = categoryManagerModule.CategoryManager;
    const ContentManager = contentManagerModule.ContentManager;
    
    if (!CategoryManager) {
      throw new Error('No se pudo cargar el componente CategoryManager');
    }
    
    // Limpiar el contenedor
    container.innerHTML = '<div id="category-manager-container" class="p-4"></div>';
    const categoryContainer = document.getElementById('category-manager-container');
    
    // Crear instancia y renderizar
    const categoryManager = new CategoryManager(categoryContainer);
    showDebugInfo('Gestor de categorías inicializado correctamente');
  } catch (error) {
    showDebugInfo(`Error al cargar el gestor de categorías: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el gestor de categorías: ${error.message}</p>
          <button class="mt-2 px-4 py-2 bg-red-500 text-white rounded" onclick="window.location.reload()">Reintentar</button>
        </div>
      </div>
    `;
  }
}

// Cargar la configuración
function loadSettings(container) {
  try {
    showDebugInfo('Cargando configuración');
    
    // Renderizar la configuración (versión simple por ahora)
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Configuración</h2>
        
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 class="text-lg font-semibold mb-4">Información del usuario</h3>
          <div class="mb-4">
            <p><strong>Nombre:</strong> ${appState.user?.name || 'Usuario'}</p>
            <p><strong>Email:</strong> ${appState.user?.email || 'No disponible'}</p>
            <p><strong>Rol:</strong> ${appState.user?.role || 'Administrador'}</p>
          </div>
          
          <p class="text-gray-600">Para cambiar la información de usuario o añadir nuevos usuarios, contacta con el administrador del sistema.</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-md p-6">
          <h3 class="text-lg font-semibold mb-4">Configuración del sitio</h3>
          <form id="site-settings-form" class="space-y-4">
            <div class="form-group">
              <label class="block text-gray-700 mb-2">Título del sitio</label>
              <input type="text" class="w-full p-2 border rounded" value="Abya Yala" disabled>
              <p class="text-sm text-gray-500 mt-1">Esta configuración está bloqueada</p>
            </div>
            
            <div class="form-group">
              <label class="block text-gray-700 mb-2">Descripción</label>
              <textarea class="w-full p-2 border rounded" rows="2" disabled>Plataforma de contenidos sobre agricultura y comunidad</textarea>
              <p class="text-sm text-gray-500 mt-1">Esta configuración está bloqueada</p>
            </div>
            
            <button type="submit" class="px-4 py-2 bg-gray-300 text-gray-700 rounded cursor-not-allowed" disabled>
              Guardar cambios
            </button>
          </form>
        </div>
      </div>
    `;
    
    showDebugInfo('Configuración cargada correctamente');
  } catch (error) {
    showDebugInfo(`Error al cargar la configuración: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar la configuración: ${error.message}</p>
          <button class="mt-2 px-4 py-2 bg-red-500 text-white rounded" onclick="window.location.reload()">Reintentar</button>
        </div>
      </div>
    `;
  }
}

// Indicar que el script ha terminado de cargar
showDebugInfo('Script app.js cargado completamente');
window.appInitialized = true;

// Fin del archivo app.js
