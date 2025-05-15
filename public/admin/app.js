// Aplicación principal del CMS
// Evitar importaciones estáticas y usar importaciones dinámicas para mayor compatibilidad

// Función para actualizar el estado de carga (definida en index.html)
const updateLoadingStatus = window.updateLoadingStatus || function(msg) { console.log(msg); };
const showDebugInfo = window.showDebugInfo || function(msg) { console.log(msg); };

// Usar la URL base global o crearla si no existe
window.appBaseUrl = window.appBaseUrl || window.location.origin;
const baseUrl = window.appBaseUrl;

// Señalar que la app ha comenzado a inicializarse
showDebugInfo('Iniciando la carga del CMS...');

// Almacenar versiones de los componentes cargados
window.cmsComponents = {};

// Helper para importar módulos dinámicamente con manejo de errores
async function importModule(url) {
  updateLoadingStatus(`Importando: ${url.split('/').pop()}`);
  try {
    return await import(url);
  } catch (error) {
    showDebugInfo(`Error al importar ${url}: ${error.message}`);
    // Devolver un módulo vacío para no romper el flujo
    return { default: {}, error: error.message };
  }
}

// Estado global de la aplicación
const appState = {
  currentView: 'dashboard',
  user: null,
  authenticated: false,
  componentsLoaded: false
};

// Componentes del panel de administración (se definirán dinámicamente)
let components = {};

// Rutas de los archivos de componentes
const moduleUrls = {
  contentManager: `${baseUrl}/admin/content-manager.js`,
  notifications: `${baseUrl}/admin/components/notification.js`,
  articleManager: `${baseUrl}/admin/components/article-manager.js`,
  mediaLibrary: `${baseUrl}/admin/components/media-library.js`,
  categoryManager: `${baseUrl}/admin/components/category-manager.js`,
  bulkImportManager: `${baseUrl}/admin/components/bulk-import-manager.js`,
  authorManager: `${baseUrl}/admin/author-manager.js`
};

// Función principal de inicialización
async function initializeApp() {
  try {
    // Primero cargar el módulo de notificaciones que es crítico
    updateLoadingStatus('Cargando módulo de notificaciones...');
    const notificationModule = await importModule(moduleUrls.notifications);
    if (notificationModule.error) {
      showDebugInfo('No se pudo cargar el módulo de notificaciones. Usando módulo de respaldo.');
      
      // Si falla, crear un módulo de notificaciones mínimo de respaldo
      window.cmsComponents.notifications = {
        success: (msg) => { console.log('SUCCESS:', msg); alert(msg); },
        error: (msg) => { console.error('ERROR:', msg); alert('Error: ' + msg); },
        warning: (msg) => { console.warn('WARNING:', msg); alert('Advertencia: ' + msg); },
        confirm: (msg) => { return confirm(msg); }
      };
    } else {
      // Guardar la referencia a las notificaciones
      window.cmsComponents.notifications = notificationModule.notifications || notificationModule.default;
    }
    
    // Definir el acceso directo a notificaciones
    const notifications = window.cmsComponents.notifications;
    
    // Verificar autenticación usando localStorage
    updateLoadingStatus('Verificando autenticación...');
    const authData = localStorage.getItem('abyayala_cms_auth');
    
    if (!authData) {
      // No hay datos de autenticación
      updateLoadingStatus('No hay sesión activa, redirigiendo a login...');
      setTimeout(() => {
        window.location.href = `${baseUrl}/admin/login.html`;
      }, 1000);
      return;
    }
    
    try {
      const auth = JSON.parse(authData);
      
      // Verificar si la autenticación no ha expirado (24 horas)
      const now = Date.now();
      const authTime = auth.timestamp || 0;
      const authValid = (now - authTime) < (24 * 60 * 60 * 1000);
      
      if (!auth.authenticated || !authValid) {
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
      appState.authenticated = true;
      appState.user = auth.user;
      
      // Cargar resto de componentes y renderizar la aplicación
      await loadComponentModules();
      renderApp(document.getElementById('app'));
      
      // Marcar la app como inicializada
      window.appInitialized = true;
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

// Función para cargar todos los módulos de componentes
async function loadComponentModules() {
  updateLoadingStatus('Cargando componentes del CMS...');
  
  try {
    // Cargar el ContentManager primero ya que otros dependen de él
    const contentManagerModule = await importModule(moduleUrls.contentManager);
    window.cmsComponents.ContentManager = contentManagerModule.ContentManager || 
                                          contentManagerModule.default;
    
    // Cargar el resto de módulos
    const [articleModule, mediaModule, categoryModule, bulkImportModule, authorModule] = await Promise.allSettled([
      importModule(moduleUrls.articleManager),
      importModule(moduleUrls.mediaLibrary),
      importModule(moduleUrls.categoryManager),
      importModule(moduleUrls.bulkImportManager),
      importModule(moduleUrls.authorManager)
    ]);
    
    // Guardar referencias a los componentes exitosamente cargados
    if (articleModule.status === 'fulfilled') {
      window.cmsComponents.ArticleManager = articleModule.value.ArticleManager || 
                                            articleModule.value.default;
    }
    
    if (mediaModule.status === 'fulfilled') {
      window.cmsComponents.MediaLibrary = mediaModule.value.MediaLibrary || 
                                          mediaModule.value.default;
    }
    
    if (categoryModule.status === 'fulfilled') {
      window.cmsComponents.CategoryManager = categoryModule.value.CategoryManager || 
                                             categoryModule.value.default;
    }
    
    if (bulkImportModule.status === 'fulfilled') {
      window.cmsComponents.BulkImportManager = bulkImportModule.value.BulkImportManager || 
                                                bulkImportModule.value.default;
    }
    
    if (authorModule.status === 'fulfilled') {
      window.cmsComponents.AuthorManager = authorModule.value.AuthorManager || 
                                            authorModule.value.default;
    }
    
    // Crear componentes UI para cada vista
    components = {
      dashboard: renderDashboard,
      articles: renderArticlesManager,
      media: renderMediaLibrary,
      categories: renderCategories,
      settings: renderSettings,
      bulkImport: renderBulkImport,
      authors: renderAuthors
    };
    
    appState.componentsLoaded = true;
    updateLoadingStatus('Componentes cargados correctamente.');
  } catch (error) {
    showDebugInfo(`Error al cargar componentes: ${error.message}`);
    throw new Error(`Error al cargar componentes: ${error.message}`);
  }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// Renderizar la aplicación completa
function renderApp(container) {
  container.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <!-- Sidebar -->
      <div class="sidebar w-64 h-full bg-white shadow-md">
        <div class="p-4 border-b">
          <h1 class="text-xl font-bold">Abya Yala CMS</h1>
        </div>
        
        <nav class="mt-4">
          <a href="#dashboard" data-view="dashboard" class="sidebar-link ${appState.currentView === 'dashboard' ? 'active' : ''}">
            <span class="mr-2">📊</span> Dashboard
          </a>
          <a href="#articles" data-view="articles" class="sidebar-link ${appState.currentView === 'articles' ? 'active' : ''}">
            <span class="mr-2">📝</span> Artículos
          </a>
          <a href="#media" data-view="media" class="sidebar-link ${appState.currentView === 'media' ? 'active' : ''}">
            <span class="mr-2">🖼️</span> Multimedia
          </a>
          <a href="#categories" data-view="categories" class="sidebar-link ${appState.currentView === 'categories' ? 'active' : ''}">
            <span class="mr-2">🏷️</span> Categorías
          </a>
          <a href="#settings" data-view="settings" class="sidebar-link ${appState.currentView === 'settings' ? 'active' : ''}">
            <span class="mr-2">⚙️</span> Configuración
          </a>
          <a href="#bulkImport" data-view="bulkImport" class="sidebar-link ${appState.currentView === 'bulkImport' ? 'active' : ''}">
            <span class="mr-2">📈</span> Carga masiva
          </a>
          <a href="#authors" data-view="authors" class="sidebar-link ${appState.currentView === 'authors' ? 'active' : ''}">
            <span class="mr-2">👥</span> Autores
          </a>
        </nav>
        
        <div class="mt-auto p-4 border-t">
          <div class="flex items-center mb-2">
            <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white mr-2">
              ${appState.user?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <div class="font-medium">${appState.user?.name || 'Administrador'}</div>
              <div class="text-xs text-gray-500">${appState.user?.email || 'admin@abyayala.org'}</div>
            </div>
          </div>
          <button id="logout-btn" class="text-red-500 hover:underline text-sm">Cerrar sesión</button>
        </div>
      </div>
      
      <!-- Main content -->
      <div class="flex-1 overflow-auto p-6" id="main-content">
        <!-- El contenido se renderizará aquí -->
      </div>
    </div>
  `;
  
  // Renderizar la vista actual
  const mainContent = document.getElementById('main-content');
  if (components[appState.currentView]) {
    components[appState.currentView](mainContent);
  } else {
    // Vista no encontrada, mostrar dashboard por defecto
    components.dashboard(mainContent);
  }
  
  // Configurar eventos de navegación
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      
      if (view && components[view]) {
        // Actualizar estado
        appState.currentView = view;
        
        // Actualizar clases activas
        document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        
        // Renderizar la vista
        components[view](mainContent);
        
        // Actualizar la URL
        window.location.hash = view;
      }
    });
  });
  
  // Configurar evento de cierre de sesión
  document.getElementById('logout-btn').addEventListener('click', async () => {
    // Pedir confirmación
    const notifications = window.cmsComponents.notifications;
    const confirmed = await notifications.confirm('¿Estás seguro de que deseas cerrar sesión?');
    if (!confirmed) return;
    
    // Limpiar datos de autenticación
    localStorage.removeItem('abyayala_cms_auth');
    
    // Mostrar notificación
    notifications.success('Has cerrado sesión correctamente');
    
    // Redirigir a la página de login
    setTimeout(() => {
      window.location.href = `${baseUrl}/admin/login.html`;
    }, 1000);
  });
  
  // Manejar cambios en el hash de la URL
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash && components[hash]) {
      // Actualizar estado
      appState.currentView = hash;
      
      // Actualizar clases activas
      document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      document.querySelector(`[data-view="${hash}"]`)?.classList.add('active');
      
      // Renderizar la vista
      components[hash](mainContent);
    }
  });
}

// Función para renderizar el dashboard
async function renderDashboard(container) {
  try {
    // Acceder a componentes cargados dinámicamente
    const { ContentManager } = window.cmsComponents;
    const notifications = window.cmsComponents.notifications;
    
    // Mostrar indicador de carga
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
        <div class="animate-pulse">
          <div class="bg-gray-200 h-8 w-1/4 mb-4 rounded"></div>
          <div class="bg-gray-200 h-40 mb-6 rounded"></div>
          <div class="bg-gray-200 h-8 w-1/4 mb-4 rounded"></div>
          <div class="bg-gray-200 h-40 rounded"></div>
        </div>
      </div>
    `;
    
    // Verificar si el componente está disponible
    if (!ContentManager) {
      throw new Error('El componente ContentManager no está disponible');
    }
    
    // Crear instancia del gestor de contenido
    const contentManager = new ContentManager();
    
    // Obtener artículos y actividades recientes con manejo de errores individual
    let articles = [];
    let activities = [];

    try {
      articles = await contentManager.getArticles();
      showDebugInfo(`Artículos cargados: ${articles.length}`);
    } catch (articleError) {
      showDebugInfo(`Error al cargar artículos: ${articleError.message}`);
      if (notifications) notifications.warning('No se pudieron cargar todos los artículos.');
    }
    
    try {
      activities = await contentManager.getActivities(5);
      showDebugInfo(`Actividades cargadas: ${activities.length}`);
    } catch (activityError) {
      showDebugInfo('Las actividades son opcionales, continuando sin ellas');
      // Las actividades son opcionales, continuamos sin ellas
    }
    
    // Renderizar el dashboard con los datos obtenidos
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <!-- Estadísticas -->
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="font-semibold text-lg mb-2">Artículos</h3>
            <p class="text-3xl font-bold">${articles.length}</p>
          </div>
          
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="font-semibold text-lg mb-2">Categorías</h3>
            <p class="text-3xl font-bold">7</p>
          </div>
          
          <div class="bg-white rounded-lg shadow p-4">
            <h3 class="font-semibold text-lg mb-2">Archivos</h3>
            <p class="text-3xl font-bold">${getMediaCount()}</p>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Artículos recientes -->
          <div class="bg-white rounded-lg shadow">
            <div class="border-b p-4">
              <h3 class="font-semibold text-lg">Artículos recientes</h3>
            </div>
            <div class="p-4">
              <table class="min-w-full">
                <thead>
                  <tr>
                    <th class="text-left pb-2">Título</th>
                    <th class="text-left pb-2">Categoría</th>
                    <th class="text-left pb-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  ${renderRecentArticles(articles.slice(0, 5))}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Actividad reciente -->
          <div class="bg-white rounded-lg shadow">
            <div class="border-b p-4">
              <h3 class="font-semibold text-lg">Actividad reciente</h3>
            </div>
            <div class="p-4">
              <div class="space-y-4">
                ${renderRecentActivities(activities)}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error al renderizar dashboard:', error);
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
        <div class="bg-red-100 text-red-700 p-4 rounded">
          Error al cargar el dashboard: ${error.message}
        </div>
      </div>
    `;
  }
}

// Función para renderizar artículos recientes
function renderRecentArticles(articles) {
  if (!articles || articles.length === 0) {
    return `
      <tr>
        <td colspan="3" class="py-2 text-gray-500">No hay artículos recientes</td>
      </tr>
    `;
  }
  
  return articles.map(article => `
    <tr>
      <td class="py-2">
        <a href="#articles" data-article="${article.slug}" class="text-blue-600 hover:underline article-link">
          ${article.title}
        </a>
      </td>
      <td class="py-2">${getCategoryName(article.category)}</td>
      <td class="py-2">${formatDate(article.pubDate)}</td>
    </tr>
  `).join('');
}

// Función para renderizar actividades recientes
function renderRecentActivities(activities) {
  if (!activities || activities.length === 0) {
    return `<div class="text-gray-500">No hay actividad reciente</div>`;
  }
  
  return activities.map(activity => {
    let icon = '📝';
    let bgColor = 'bg-blue-100';
    let textColor = 'text-blue-500';
    
    // Determinar icono y colores según el tipo de actividad
    switch (activity.type) {
      case 'create':
        icon = '📝';
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-500';
        break;
      case 'edit':
        icon = '✏️';
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-500';
        break;
      case 'delete':
        icon = '🗑️';
        bgColor = 'bg-red-100';
        textColor = 'text-red-500';
        break;
      case 'media_upload':
        icon = '🖼️';
        bgColor = 'bg-green-100';
        textColor = 'text-green-500';
        break;
      case 'bulk_import':
        icon = '📊';
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-500';
        break;
      default:
        icon = '🔔';
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-500';
    }
    
    // Generar contenido según el tipo de actividad y entidad
    let content = '';
    
    switch (activity.entity_type) {
      case 'article':
        if (activity.type === 'create') {
          content = `Artículo creado: "${activity.entity_title}"`;
        } else if (activity.type === 'edit') {
          content = `Artículo editado: "${activity.entity_title}"`;
        } else if (activity.type === 'delete') {
          content = `Artículo eliminado: "${activity.entity_title}"`;
        } else if (activity.type === 'bulk_import') {
          const details = typeof activity.details === 'string' 
            ? JSON.parse(activity.details) 
            : activity.details;
          const total = details?.total_articles || 0;
          const processed = details?.processed_articles || 0;
          content = `Importación masiva: ${processed} de ${total} artículos`;
        }
        break;
      
      case 'media':
        if (activity.type === 'media_upload') {
          content = `Archivo subido: "${activity.entity_title}"`;
        } else if (activity.type === 'delete') {
          content = `Archivo eliminado: "${activity.entity_title}"`;
        }
        break;
      
      case 'author':
        if (activity.type === 'create') {
          content = `Autor creado: "${activity.entity_title}"`;
        } else if (activity.type === 'edit') {
          content = `Autor editado: "${activity.entity_title}"`;
        } else if (activity.type === 'delete') {
          content = `Autor eliminado: "${activity.entity_title}"`;
        }
        break;
      
      default:
        content = `Actividad: ${activity.type} - ${activity.entity_title}`;
    }
    
    // Formatear la fecha relativa
    const relativeTime = activity.relative_time || 'Hace un momento';
    
    return `
      <div class="flex items-start">
        <div class="${bgColor} ${textColor} p-2 rounded-lg mr-3">
          <span class="text-xl">${icon}</span>
        </div>
        <div class="flex-1">
          <p class="font-medium">${content}</p>
          <p class="text-sm text-gray-500">${relativeTime}</p>
          ${activity.user_name ? `<p class="text-xs text-gray-400">Por: ${activity.user_name}</p>` : ''}
        </div>
      </div>
    `;
  });
}

// Renderizar gestor de artículos
function renderArticlesManager(container) {
  try {
    // Acceder a componentes cargados dinámicamente
    const { ArticleManager, ContentManager } = window.cmsComponents;
    const notifications = window.cmsComponents.notifications;
    
    // Verificar que los componentes existen
    if (!ArticleManager || !ContentManager) {
      showDebugInfo('Componentes para artículos no disponibles. ArticleManager: ' + 
                   (ArticleManager ? 'OK' : 'No disponible') + 
                   ', ContentManager: ' + (ContentManager ? 'OK' : 'No disponible'));
      container.innerHTML = `
        <div class="p-4">
          <h2 class="text-2xl font-bold mb-6">Gestor de Artículos</h2>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-yellow-700">Algunos componentes no están disponibles. Estamos trabajando en ello.</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Verificar si ya hay una instancia creada
    if (!window.articleManager) {
      showDebugInfo('Creando instancia de ArticleManager');
      // Crear instancia
      window.articleManager = new ArticleManager(container, {
        onSave: () => notifications.success('Artículo guardado correctamente'),
        onError: (error) => notifications.error(`Error: ${error}`),
        onDelete: () => notifications.success('Artículo eliminado correctamente'),
        contentManager: new ContentManager()
      });
    }
    
    // Renderizar la lista de artículos
    window.articleManager.renderArticlesList();
  } catch (error) {
    showDebugInfo(`Error al renderizar gestor de artículos: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Gestor de Artículos</h2>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el componente: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

function renderMediaLibrary(container) {
  try {
    // Acceder a componentes cargados dinámicamente
    const { MediaLibrary, ContentManager } = window.cmsComponents;
    const notifications = window.cmsComponents.notifications;
    
    // Verificar que los componentes existen
    if (!MediaLibrary || !ContentManager) {
      showDebugInfo('Componentes para medios no disponibles');
      container.innerHTML = `
        <div class="p-4">
          <h2 class="text-2xl font-bold mb-6">Biblioteca de Medios</h2>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-yellow-700">Algunos componentes no están disponibles. Estamos trabajando en ello.</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Verificar si ya hay una instancia creada
    if (!window.mediaLibrary) {
      showDebugInfo('Creando instancia de MediaLibrary');
      // Crear instancia
      window.mediaLibrary = new MediaLibrary(container, {
        onUpload: () => notifications.success('Archivo subido correctamente'),
        onError: (error) => notifications.error(`Error: ${error}`),
        onDelete: () => notifications.success('Archivo eliminado correctamente'),
        contentManager: new ContentManager()
      });
    }
    
    // Renderizar la biblioteca de medios
    window.mediaLibrary.render();
  } catch (error) {
    showDebugInfo(`Error al renderizar biblioteca de medios: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Biblioteca de Medios</h2>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el componente: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

function renderCategories(container) {
  try {
    // Acceder a componentes cargados dinámicamente
    const { CategoryManager, ContentManager } = window.cmsComponents;
    const notifications = window.cmsComponents.notifications;
    
    // Verificar que los componentes existen
    if (!CategoryManager || !ContentManager) {
      showDebugInfo('Componentes para categorías no disponibles');
      container.innerHTML = `
        <div class="p-4">
          <h2 class="text-2xl font-bold mb-6">Gestor de Categorías</h2>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-yellow-700">Algunos componentes no están disponibles. Estamos trabajando en ello.</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Verificar si ya hay una instancia creada
    if (!window.categoryManager) {
      showDebugInfo('Creando instancia de CategoryManager');
      // Crear instancia
      window.categoryManager = new CategoryManager(container, {
        onSave: () => notifications.success('Categoría guardada correctamente'),
        onError: (error) => notifications.error(`Error: ${error}`),
        onDelete: () => notifications.success('Categoría eliminada correctamente'),
        contentManager: new ContentManager()
      });
    }
    
    // Renderizar el gestor de categorías
    window.categoryManager.render();
  } catch (error) {
    showDebugInfo(`Error al renderizar gestor de categorías: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Gestor de Categorías</h2>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el componente: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Renderizar configuración
function renderSettings(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Configuración</h2>
    
    <div class="card mb-6">
      <h3 class="text-lg font-semibold mb-4">Información del sitio</h3>
      
      <form id="site-settings-form">
        <div class="form-group">
          <label for="site-title" class="form-label">Título del sitio</label>
          <input type="text" id="site-title" class="form-input" value="Abya Yala - Colectivo Agrario">
        </div>
        
        <div class="form-group">
          <label for="site-description" class="form-label">Descripción del sitio</label>
          <textarea id="site-description" class="form-input" rows="2">Plataforma de noticias del colectivo agrario Abya Yala. Información sobre agricultura, sostenibilidad, comunidad y más.</textarea>
        </div>
        
        <div class="form-group">
          <label for="site-keywords" class="form-label">Palabras clave (SEO)</label>
          <input type="text" id="site-keywords" class="form-input" value="agricultura, sostenibilidad, comunidad, colectivo agrario, abya yala">
          <small class="text-gray-500">Separadas por comas</small>
        </div>
        
        <div class="flex justify-end mt-6">
          <button type="submit" class="btn-primary">Guardar cambios</button>
        </div>
      </form>
    </div>
    
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">Información de usuario</h3>
      
      <div class="mb-4">
        <p><strong>Nombre:</strong> ${appState.user?.name || 'Administrador'}</p>
        <p><strong>Correo electrónico:</strong> ${appState.user?.email || 'admin@abyayala.org'}</p>
        <p><strong>Rol:</strong> ${appState.user?.role || 'Administrador'}</p>
      </div>
      
    </div>
  `;
}

// Renderizar herramienta de carga masiva
function renderBulkImport(container) {
  try {
    // Acceder a componentes cargados dinámicamente
    const { BulkImportManager, ContentManager } = window.cmsComponents;
    const notifications = window.cmsComponents.notifications;
    
    // Verificar que los componentes existen
    if (!BulkImportManager || !ContentManager) {
      showDebugInfo('Componentes para carga masiva no disponibles');
      container.innerHTML = `
        <div class="p-4">
          <h2 class="text-2xl font-bold mb-6">Carga Masiva</h2>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-yellow-700">Algunos componentes no están disponibles. Estamos trabajando en ello.</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Verificar si ya hay una instancia creada
    if (!window.bulkImportManager) {
      showDebugInfo('Creando instancia de BulkImportManager');
      // Crear instancia
      window.bulkImportManager = new BulkImportManager(container, {
        onComplete: () => notifications.success('Carga masiva completada'),
        onError: (error) => notifications.error(`Error: ${error}`),
        contentManager: new ContentManager()
      });
    }
    
    // Renderizar el gestor de carga masiva
    window.bulkImportManager.render();
  } catch (error) {
    showDebugInfo(`Error al renderizar gestor de carga masiva: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Carga Masiva</h2>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el componente: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Renderizar gestor de autores
function renderAuthors(container) {
  try {
    // Acceder a componentes cargados dinámicamente
    const { AuthorManager, ContentManager } = window.cmsComponents;
    const notifications = window.cmsComponents.notifications;
    
    // Verificar que los componentes existen
    if (!AuthorManager || !ContentManager) {
      showDebugInfo('Componentes para autores no disponibles');
      container.innerHTML = `
        <div class="p-4">
          <h2 class="text-2xl font-bold mb-6">Gestor de Autores</h2>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p class="text-yellow-700">Algunos componentes no están disponibles. Estamos trabajando en ello.</p>
          </div>
        </div>
      `;
      return;
    }
    
    // Verificar si ya hay una instancia creada
    if (!window.authorManager) {
      showDebugInfo('Creando instancia de AuthorManager');
      // Crear instancia
      window.authorManager = new AuthorManager(container, {
        onSave: () => notifications.success('Autor guardado correctamente'),
        onError: (error) => notifications.error(`Error: ${error}`),
        onDelete: () => notifications.success('Autor eliminado correctamente'),
        contentManager: new ContentManager()
      });
    }
    
    // Renderizar el gestor de autores
    window.authorManager.render();
  } catch (error) {
    showDebugInfo(`Error al renderizar gestor de autores: ${error.message}`);
    container.innerHTML = `
      <div class="p-4">
        <h2 class="text-2xl font-bold mb-6">Gestor de Autores</h2>
        <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p class="text-red-700">Error al cargar el componente: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Funciones auxiliares para el CMS

// Función auxiliar para obtener el nombre de la categoría
function getCategoryName(slug) {
  const categories = {
    'agricultura': 'Agricultura',
    'comunidad': 'Comunidad',
    'sostenibilidad': 'Sostenibilidad',
    'politica-agraria': 'Política Agraria',
    'tecnologia-rural': 'Tecnología Rural',
    'cultura': 'Cultura',
    'eventos': 'Eventos'
  };
  
  return categories[slug] || slug;
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    // Formatear fecha como "DD MMM YYYY" en español
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (error) {
    showDebugInfo(`Error al formatear fecha: ${error.message}`);
    return '';
  }
}

// Indicar que el script ha terminado de cargar
showDebugInfo('Script app.js cargado completamente');
window.appInitialized = true;

// Fin del archivo app.js
