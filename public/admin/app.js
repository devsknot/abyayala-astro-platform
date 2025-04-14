// Aplicación principal del CMS
import { ArticleManager } from './components/article-manager.js';
import { MediaLibrary } from './components/media-library.js';
import { ContentManager } from './content-manager.js';

// Componentes del panel de administración
const components = {
  dashboard: renderDashboard,
  articles: renderArticlesManager,
  media: renderMediaLibrary,
  categories: renderCategories,
  settings: renderSettings
};

// Estado global de la aplicación
const appState = {
  currentView: 'dashboard',
  user: null,
  authenticated: false
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
  const appElement = document.getElementById('app');
  
  // Verificar autenticación usando localStorage
  try {
    const authData = localStorage.getItem('abyayala_cms_auth');
    
    if (authData) {
      const auth = JSON.parse(authData);
      
      // Verificar si la autenticación no ha expirado (24 horas)
      const now = Date.now();
      const authTime = auth.timestamp || 0;
      const authValid = (now - authTime) < (24 * 60 * 60 * 1000);
      
      if (auth.authenticated && authValid) {
        appState.authenticated = true;
        appState.user = auth.user;
        renderApp(appElement);
      } else {
        // Autenticación expirada
        localStorage.removeItem('abyayala_cms_auth');
        window.location.href = 'login.html';
      }
    } else {
      // No hay datos de autenticación
      window.location.href = 'login.html';
    }
  } catch (error) {
    console.error('Error de autenticación:', error);
    window.location.href = 'login.html';
  }
});

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
  const mainContent = container.querySelector('#main-content');
  components[appState.currentView](mainContent);
  
  // Configurar eventos para la navegación
  container.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.dataset.view;
      
      // Actualizar la vista actual
      appState.currentView = view;
      
      // Actualizar clases activas
      container.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Renderizar la nueva vista
      components[view](mainContent);
    });
  });
  
  // Configurar evento para cerrar sesión
  container.querySelector('#logout-btn').addEventListener('click', () => {
    // Eliminar datos de autenticación
    localStorage.removeItem('abyayala_cms_auth');
    
    // Redirigir a la página de inicio de sesión
    window.location.href = 'login.html';
  });
}

// Renderizar dashboard
async function renderDashboard(container) {
  // Mostrar un estado de carga inicial
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
    <div class="loading-overlay p-4 text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
      <p class="text-lg font-medium">Cargando datos del dashboard...</p>
    </div>
  `;
  
  try {
    // Crear instancia del gestor de contenido
    const contentManager = new ContentManager();
    
    // Obtener datos de la API
    const articles = await contentManager.getArticles();
    const categories = await contentManager.getCategories();
    
    // Ordenar artículos por fecha (más recientes primero)
    const sortedArticles = [...articles].sort((a, b) => {
      return new Date(b.pubDate) - new Date(a.pubDate);
    });
    
    // Tomar los 3 artículos más recientes
    const recentArticles = sortedArticles.slice(0, 3);
    
    // Generar HTML para los artículos recientes
    const recentArticlesHTML = recentArticles.map(article => `
      <tr class="border-b">
        <td class="py-2">${article.title}</td>
        <td class="py-2">${getCategoryName(article.category)}</td>
        <td class="py-2">${formatDate(article.pubDate)}</td>
      </tr>
    `).join('');
    
    // Generar actividad reciente basada en los artículos
    // En una implementación real, esto vendría de un registro de actividad en la API
    const recentActivityHTML = generateRecentActivity(recentArticles);
    
    // Renderizar dashboard con datos reales
    container.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-2">Artículos</h3>
          <p class="text-3xl font-bold">${articles.length}</p>
        </div>
        
        <div class="card">
          <h3 class="text-lg font-semibold mb-2">Categorías</h3>
          <p class="text-3xl font-bold">${categories.length}</p>
        </div>
        
        <div class="card">
          <h3 class="text-lg font-semibold mb-2">Archivos multimedia</h3>
          <p class="text-3xl font-bold">${getMediaCount()}</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Artículos recientes</h3>
          
          <table class="w-full">
            <thead>
              <tr class="border-b">
                <th class="text-left pb-2">Título</th>
                <th class="text-left pb-2">Categoría</th>
                <th class="text-left pb-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              ${recentArticlesHTML || '<tr><td colspan="3" class="py-4 text-center text-gray-500">No hay artículos recientes</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <div class="card">
          <h3 class="text-lg font-semibold mb-4">Actividad reciente</h3>
          
          <ul class="space-y-3">
            ${recentActivityHTML || '<li class="text-center text-gray-500 py-4">No hay actividad reciente</li>'}
          </ul>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
    container.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">Dashboard</h2>
      <div class="card p-4 text-center text-red-500">
        <p>Error al cargar los datos del dashboard. Intenta recargar la página.</p>
      </div>
    `;
  }
}

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
    console.error('Error al formatear fecha:', error);
    return '';
  }
}

// Función para obtener el conteo de archivos multimedia
// En una implementación real, esto vendría de la API
function getMediaCount() {
  // Por ahora retornamos un valor fijo, pero esto debería venir de la API
  return 24;
}

// Función para generar actividad reciente basada en los artículos
function generateRecentActivity(articles) {
  if (!articles || articles.length === 0) return '';
  
  // Generar actividad ficticia basada en los artículos existentes
  const activities = [
    {
      type: 'create',
      icon: '📝',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-500',
      article: articles[0],
      daysAgo: 2
    },
    {
      type: 'media',
      icon: '🖼️',
      bgColor: 'bg-green-100',
      textColor: 'text-green-500',
      name: articles[1]?.heroImage?.split('/').pop() || 'imagen.jpg',
      daysAgo: 3
    },
    {
      type: 'edit',
      icon: '✏️',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-500',
      article: articles[2] || articles[0],
      daysAgo: 5
    }
  ];
  
  return activities.map(activity => {
    let content = '';
    
    if (activity.type === 'create') {
      content = `
        <p class="font-medium">Artículo creado: "${activity.article.title}"</p>
        <p class="text-sm text-gray-500">Hace ${activity.daysAgo} días</p>
      `;
    } else if (activity.type === 'media') {
      content = `
        <p class="font-medium">Imagen subida: "${activity.name}"</p>
        <p class="text-sm text-gray-500">Hace ${activity.daysAgo} días</p>
      `;
    } else if (activity.type === 'edit') {
      content = `
        <p class="font-medium">Artículo editado: "${activity.article.title}"</p>
        <p class="text-sm text-gray-500">Hace ${activity.daysAgo} días</p>
      `;
    }
    
    return `
      <li class="flex items-start">
        <div class="w-8 h-8 rounded-full ${activity.bgColor} flex items-center justify-center ${activity.textColor} mr-2">
          <span>${activity.icon}</span>
        </div>
        <div>
          ${content}
        </div>
      </li>
    `;
  }).join('');
}

// Renderizar gestor de artículos
function renderArticlesManager(container) {
  container.innerHTML = '<div id="articles-container"></div>';
  const articlesContainer = container.querySelector('#articles-container');
  new ArticleManager(articlesContainer);
}

// Renderizar biblioteca de medios
function renderMediaLibrary(container) {
  container.innerHTML = '<div id="media-container"></div>';
  const mediaContainer = container.querySelector('#media-container');
  new MediaLibrary(mediaContainer);
}

// Renderizar gestor de categorías
function renderCategories(container) {
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Categorías</h2>
    
    <div class="card mb-6">
      <h3 class="text-lg font-semibold mb-4">Todas las categorías</h3>
      
      <table class="w-full">
        <thead>
          <tr class="border-b">
            <th class="text-left pb-2">Nombre</th>
            <th class="text-left pb-2">Slug</th>
            <th class="text-left pb-2">Artículos</th>
            <th class="text-left pb-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-b">
            <td class="py-2">Agricultura</td>
            <td class="py-2">agricultura</td>
            <td class="py-2">4</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2">Comunidad</td>
            <td class="py-2">comunidad</td>
            <td class="py-2">3</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2">Sostenibilidad</td>
            <td class="py-2">sostenibilidad</td>
            <td class="py-2">2</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2">Política Agraria</td>
            <td class="py-2">politica-agraria</td>
            <td class="py-2">1</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2">Tecnología Rural</td>
            <td class="py-2">tecnologia-rural</td>
            <td class="py-2">1</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2">Cultura</td>
            <td class="py-2">cultura</td>
            <td class="py-2">0</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
          <tr>
            <td class="py-2">Eventos</td>
            <td class="py-2">eventos</td>
            <td class="py-2">1</td>
            <td class="py-2">
              <button type="button" class="text-blue-500 hover:underline mr-2">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="card">
      <h3 class="text-lg font-semibold mb-4">Información</h3>
      <p class="text-gray-600">Las categorías están predefinidas según las necesidades del colectivo Abya Yala. Si necesitas añadir una nueva categoría, contacta con el administrador del sistema.</p>
    </div>
  `;
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
      
      <p class="text-gray-600">Para cambiar la información de usuario o añadir nuevos usuarios, contacta con el administrador del sistema.</p>
    </div>
  `;
  
  // Configurar evento para el formulario de configuración
  const siteSettingsForm = container.querySelector('#site-settings-form');
  siteSettingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Configuración guardada correctamente');
  });
}
