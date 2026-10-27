// Aplicación principal del panel de administración.
// La autenticación la hace Cloudflare Access: aquí solo se consulta la sesión
// con /api/auth/me para saber quién es el usuario.
import { getCurrentUser } from './utils/api.js';
import { escapeHtml } from './utils/html.js';
import { notifications } from './components/notification.js';
import { ContentManager } from './content-manager.js';
import { MediaManager } from './media-manager.js';

const LOGOUT_URL = '/cdn-cgi/access/logout';

const VIEWS = {
  dashboard: { title: 'Dashboard', icon: '📊', load: loadDashboard },
  articles: { title: 'Artículos', icon: '📝', load: loadArticlesManager },
  media: { title: 'Multimedia', icon: '🖼️', load: loadMediaLibrary },
  categories: { title: 'Categorías', icon: '🏷️', load: loadCategoriesManager },
  authors: { title: 'Autores', icon: '👤', load: loadAuthorsManager },
  import: { title: 'Importación masiva', icon: '📤', load: loadBulkImport },
  settings: { title: 'Configuración', icon: '⚙️', load: loadSettings }
};

const appState = {
  user: null,
  currentView: null,
  // Se incrementa en cada cambio de vista: una carga que termina tarde no pisa la vista actual
  viewToken: 0,
  activeComponent: null
};

// Instancias compartidas por todas las vistas
const contentManager = new ContentManager();
const mediaManager = new MediaManager();

init();

async function init() {
  const app = document.getElementById('app');
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    renderMessage(app, 'No se pudo verificar la sesión', 'El servidor no respondió. Inténtalo de nuevo en unos minutos.', 'Reintentar');
    return;
  }

  if (!user) {
    renderMessage(app, 'Necesitas iniciar sesión', 'Tu sesión no está activa o expiró.', 'Iniciar sesión');
    return;
  }

  appState.user = user;
  renderApp(app);

  const initialView = location.hash.slice(1);
  showView(VIEWS[initialView] ? initialView : 'dashboard');
}

function renderMessage(container, title, text, actionLabel) {
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-screen text-center">
      <h2 class="text-2xl font-semibold text-gray-800 mb-2"></h2>
      <p class="text-gray-600 mb-6"></p>
      <a href="/admin/" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"></a>
    </div>
  `;
  container.querySelector('h2').textContent = title;
  container.querySelector('p').textContent = text;
  container.querySelector('a').textContent = actionLabel;
}

function renderApp(container) {
  const name = appState.user.name || appState.user.email || 'Administrador';

  container.innerHTML = `
    <div class="flex h-screen bg-gray-100">
      <div class="sidebar w-64 h-full bg-white shadow-md flex flex-col">
        <div class="p-4 border-b">
          <h1 class="text-xl font-bold">Abya Yala CMS</h1>
        </div>

        <nav class="mt-4">
          ${Object.entries(VIEWS).map(([key, view]) => `
            <a href="#${key}" data-view="${key}" class="sidebar-link">
              <span class="mr-2">${view.icon}</span> ${escapeHtml(view.title)}
            </a>
          `).join('')}
        </nav>

        <div class="mt-auto p-4 border-t">
          <button type="button" id="logout-button" class="text-red-500 hover:text-red-700">
            <span class="mr-2">🚪</span> Cerrar sesión
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <header class="bg-white shadow-sm">
          <div class="flex justify-between items-center p-4">
            <h2 class="text-xl font-semibold" id="view-title"></h2>
            <div class="flex items-center">
              <span class="text-sm text-gray-600 mr-2">Hola, ${escapeHtml(name)}</span>
              <div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                ${escapeHtml(name.charAt(0).toUpperCase())}
              </div>
            </div>
          </div>
        </header>

        <main class="p-6" id="main-content"></main>
      </div>
    </div>
  `;

  container.querySelector('nav').addEventListener('click', (event) => {
    const link = event.target.closest('.sidebar-link');
    if (!link) return;
    event.preventDefault();
    showView(link.dataset.view);
  });

  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1);
    if (VIEWS[view] && view !== appState.currentView) showView(view);
  });

  container.querySelector('#logout-button').addEventListener('click', async () => {
    const confirmed = await notifications.confirm('¿Estás seguro de que deseas cerrar sesión?', 'Cerrar sesión', 'Cancelar');
    if (confirmed) window.location.href = LOGOUT_URL;
  });
}

async function showView(viewName) {
  const view = VIEWS[viewName] || VIEWS.dashboard;
  const token = ++appState.viewToken;

  // Liberar el componente anterior (p. ej. la instancia de TinyMCE)
  if (appState.activeComponent && typeof appState.activeComponent.destroy === 'function') {
    try {
      appState.activeComponent.destroy();
    } catch (error) {
      console.error('Error al cerrar la vista anterior:', error);
    }
  }
  appState.activeComponent = null;
  appState.currentView = viewName;

  if (location.hash.slice(1) !== viewName) history.replaceState(null, '', `#${viewName}`);

  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });
  document.getElementById('view-title').textContent = view.title;

  // Cada vista se monta en un contenedor propio; si el usuario cambia de vista
  // mientras carga, el contenedor viejo queda fuera del DOM y se descarta.
  const main = document.getElementById('main-content');
  const viewContainer = document.createElement('div');
  viewContainer.className = 'p-4';
  viewContainer.innerHTML = `
    <div class="flex items-center text-gray-600">
      <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500 mr-3"></div>
      Cargando...
    </div>
  `;
  main.replaceChildren(viewContainer);

  try {
    const component = await view.load(viewContainer, () => token === appState.viewToken);
    if (token !== appState.viewToken) {
      if (component && typeof component.destroy === 'function') component.destroy();
      return;
    }
    appState.activeComponent = component || null;
  } catch (error) {
    if (token !== appState.viewToken) return;
    console.error(`Error al cargar la vista ${viewName}:`, error);
    viewContainer.innerHTML = `
      <div class="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <p class="text-red-700"></p>
        <button type="button" class="mt-2 px-4 py-2 bg-red-500 text-white rounded retry-btn">Reintentar</button>
      </div>
    `;
    viewContainer.querySelector('p').textContent = `Error al cargar ${view.title.toLowerCase()}: ${error.message}`;
    viewContainer.querySelector('.retry-btn').addEventListener('click', () => showView(viewName));
  }
}

// === Vistas ===

async function loadDashboard(container) {
  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-lg font-semibold mb-4">Dashboard</h3>
      <p class="text-gray-600">Bienvenido al panel de administración de Abya Yala.</p>
      <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <a href="#articles" class="block bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h4 class="font-medium text-blue-700">Artículos</h4>
          <p class="text-sm text-blue-600 mt-1">Gestiona el contenido del sitio</p>
        </a>
        <a href="#media" class="block bg-green-50 p-4 rounded-lg border border-green-100">
          <h4 class="font-medium text-green-700">Multimedia</h4>
          <p class="text-sm text-green-600 mt-1">Administra imágenes y archivos</p>
        </a>
        <a href="#categories" class="block bg-purple-50 p-4 rounded-lg border border-purple-100">
          <h4 class="font-medium text-purple-700">Categorías</h4>
          <p class="text-sm text-purple-600 mt-1">Organiza el contenido</p>
        </a>
      </div>
    </div>
  `;
  return null;
}

async function loadArticlesManager(container, isCurrent) {
  const { ArticleManager } = await import('./components/article-manager/index.js');
  if (!isCurrent()) return null;

  container.innerHTML = '';
  const articleManager = new ArticleManager(container, {
    contentManager,
    mediaManager,
    notificationManager: notifications
  });
  await articleManager.init();
  return articleManager;
}

async function loadMediaLibrary(container, isCurrent) {
  const { MediaLibrary } = await import('./components/media-library.js');
  if (!isCurrent()) return null;
  return new MediaLibrary(container, null, { mediaManager, contentManager });
}

async function loadCategoriesManager(container, isCurrent) {
  const { CategoryManager } = await import('./components/category-manager.js');
  if (!isCurrent()) return null;

  container.innerHTML = '<div id="category-manager-container"></div>';
  const categoryManager = new CategoryManager(contentManager);
  await categoryManager.init('category-manager-container');
  return categoryManager;
}

async function loadAuthorsManager(container, isCurrent) {
  const { AuthorManager } = await import('./components/author-manager.js');
  if (!isCurrent()) return null;

  container.innerHTML = '<div id="author-manager-container"></div>';
  const authorManager = new AuthorManager(contentManager);
  await authorManager.init('author-manager-container');
  return authorManager;
}

async function loadBulkImport(container, isCurrent) {
  const { BulkImportManager } = await import('./components/bulk-import-manager.js');
  if (!isCurrent()) return null;

  const bulkImportManager = new BulkImportManager(contentManager);
  await bulkImportManager.init(container);
  return bulkImportManager;
}

async function loadSettings(container) {
  const user = appState.user || {};
  container.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">Configuración</h2>
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 class="text-lg font-semibold mb-4">Información del usuario</h3>
      <div class="mb-4">
        <p><strong>Nombre:</strong> ${escapeHtml(user.name || '—')}</p>
        <p><strong>Email:</strong> ${escapeHtml(user.email || 'No disponible')}</p>
      </div>
      <p class="text-gray-600">El acceso al panel se gestiona con Cloudflare Access. Para dar acceso a otra persona, añade su correo a la política de la aplicación en Cloudflare Zero Trust.</p>
    </div>
  `;
  return null;
}
