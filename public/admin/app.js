// Aplicación principal del panel de administración.
// La autenticación la hace Cloudflare Access: aquí solo se consulta la sesión
// con /api/auth/me para saber quién es el usuario y cuándo vence su sesión.
import { getSession, notifySessionExpired } from './utils/api.js';
import { escapeHtml } from './utils/html.js';
import { icon } from './utils/icons.js';
import { formatDateTime, formatRelative, initials, toDate } from './utils/format.js';
import { notifications } from './components/notification.js';
import { ContentManager } from './content-manager.js';
import { MediaManager } from './media-manager.js';

const LOGOUT_URL = '/cdn-cgi/access/logout';
const MOBILE_QUERY = '(max-width: 899px)';
const SESSION_WARNING_MS = 10 * 60 * 1000;
const SESSION_CHECK_MS = 30 * 1000;

const VIEWS = {
  dashboard: { title: 'Inicio', label: 'Inicio', icon: 'dashboard', load: loadDashboard },
  articles: { title: 'Artículos', label: 'Artículos', icon: 'articles', load: loadArticlesManager },
  media: { title: 'Multimedia', label: 'Multimedia', icon: 'media', load: loadMediaLibrary },
  categories: { title: 'Categorías', label: 'Categorías', icon: 'categories', load: loadCategoriesManager },
  authors: { title: 'Autores', label: 'Autores', icon: 'authors', load: loadAuthorsManager },
  import: { title: 'Importación masiva', label: 'Importación masiva', icon: 'import', load: loadBulkImport },
  settings: { title: 'Cuenta y sistema', label: 'Configuración', icon: 'settings', load: loadSettings }
};

const appState = {
  user: null,
  currentView: null,
  // Se incrementa en cada cambio de vista: una carga que termina tarde no pisa la vista actual
  viewToken: 0,
  activeComponent: null
};

// Estado de la sesión de Cloudflare Access (un único temporizador)
const sessionState = {
  expiresAt: null,
  timer: null,
  warningToast: null,
  expired: false
};

// Instancias compartidas por todas las vistas
const contentManager = new ContentManager();
const mediaManager = new MediaManager();

init();

async function init() {
  const app = document.getElementById('app');
  let result;
  try {
    result = await getSession();
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    renderMessage(app, 'No se pudo verificar la sesión', 'El servidor no respondió. Inténtalo de nuevo en unos minutos.', 'Reintentar');
    return;
  }

  if (!result) {
    renderMessage(app, 'Necesitas iniciar sesión', 'Tu sesión no está activa o expiró.', 'Iniciar sesión');
    return;
  }

  appState.user = result.user || { email: '', name: '' };
  renderApp(app);
  startSessionMonitor(result.session && result.session.expiresAt);

  const initialView = location.hash.slice(1);
  showView(VIEWS[initialView] ? initialView : 'dashboard');
}

function renderMessage(container, title, text, actionLabel) {
  container.innerHTML = `
    <div class="splash">
      <img src="/images/logo-login.png" alt="" class="splash-logo" width="70" height="90">
      <h1 class="splash-title"></h1>
      <p class="splash-text"></p>
      <a href="/admin/" class="btn btn-primary"></a>
    </div>
  `;
  container.querySelector('.splash-title').textContent = title;
  container.querySelector('.splash-text').textContent = text;
  container.querySelector('a').textContent = actionLabel;
}

function displayName() {
  const user = appState.user || {};
  return user.name || user.email || 'Administrador';
}

function renderApp(container) {
  const user = appState.user || {};
  const name = displayName();

  container.innerHTML = `
    <a href="#main-content" class="skip-link">Saltar al contenido</a>
    <div class="app-shell">
      <aside class="sidebar" id="sidebar" aria-label="Navegación principal">
        <div class="sidebar-brand">
          <img src="/images/logo-login.png" alt="" class="sidebar-logo" width="28" height="36">
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-name">Abya Yala</span>
            <span class="sidebar-brand-sub">Panel editorial</span>
          </div>
          <button type="button" class="btn-icon sidebar-close" aria-label="Cerrar menú">${icon('close')}</button>
        </div>

        <nav class="sidebar-nav">
          ${Object.entries(VIEWS).map(([key, view]) => `
            <a href="#${key}" data-view="${key}" class="nav-link">
              ${icon(view.icon)}
              <span>${escapeHtml(view.label)}</span>
            </a>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <a href="/" target="_blank" rel="noopener" class="nav-link">
            ${icon('external')}
            <span>Ver sitio</span>
          </a>
          <button type="button" class="nav-link nav-link-danger" data-action="logout">
            ${icon('logout')}
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      <div class="sidebar-backdrop" hidden></div>

      <div class="app-main">
        <header class="topbar">
          <button type="button" class="btn-icon menu-toggle" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir menú">
            ${icon('menu')}
          </button>
          <h1 class="topbar-title" id="view-title"></h1>

          <div class="user-menu">
            <button type="button" class="user-chip" aria-haspopup="true" aria-expanded="false" aria-controls="user-menu-panel">
              <span class="avatar" aria-hidden="true">${escapeHtml(initials(name))}</span>
              <span class="user-chip-name">${escapeHtml(name)}</span>
              ${icon('chevronDown', { size: 16 })}
            </button>
            <div class="user-menu-panel" id="user-menu-panel" hidden>
              <div class="user-menu-header">
                <span class="avatar avatar-lg" aria-hidden="true">${escapeHtml(initials(name))}</span>
                <div class="min-w-0">
                  <p class="user-menu-name">${escapeHtml(user.name || 'Sin nombre')}</p>
                  <p class="user-menu-email">${escapeHtml(user.email || '')}</p>
                </div>
              </div>
              <div class="user-menu-session">
                ${icon('clock', { size: 16 })}
                <span data-session-expiry></span>
              </div>
              <div class="user-menu-actions">
                <a href="#settings" class="menu-item" data-view="settings">${icon('settings', { size: 18 })}<span>Cuenta y sesión</span></a>
                <button type="button" class="menu-item menu-item-danger" data-action="logout">${icon('logout', { size: 18 })}<span>Cerrar sesión</span></button>
              </div>
            </div>
          </div>
        </header>

        <main class="app-content" id="main-content" tabindex="-1"></main>
      </div>
    </div>
  `;

  setupShellEvents(container);
}

function setupShellEvents(container) {
  const sidebar = container.querySelector('#sidebar');
  const backdrop = container.querySelector('.sidebar-backdrop');
  const menuToggle = container.querySelector('.menu-toggle');
  const userChip = container.querySelector('.user-chip');
  const userPanel = container.querySelector('#user-menu-panel');

  const setSidebarOpen = (open) => {
    sidebar.classList.toggle('is-open', open);
    backdrop.hidden = !open;
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('has-drawer', open);
    if (open) sidebar.querySelector('.nav-link.active, .nav-link')?.focus();
  };

  const setUserMenuOpen = (open) => {
    userPanel.hidden = !open;
    userChip.setAttribute('aria-expanded', String(open));
  };

  menuToggle.addEventListener('click', () => setSidebarOpen(!sidebar.classList.contains('is-open')));
  container.querySelector('.sidebar-close').addEventListener('click', () => {
    setSidebarOpen(false);
    menuToggle.focus();
  });
  backdrop.addEventListener('click', () => setSidebarOpen(false));

  userChip.addEventListener('click', (event) => {
    event.stopPropagation();
    setUserMenuOpen(userPanel.hidden);
  });

  document.addEventListener('click', (event) => {
    if (!userPanel.hidden && !event.target.closest('.user-menu')) setUserMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!userPanel.hidden) {
      setUserMenuOpen(false);
      userChip.focus();
    }
    if (sidebar.classList.contains('is-open')) {
      setSidebarOpen(false);
      menuToggle.focus();
    }
  });

  // Navegación (barra lateral y menú de usuario) por delegación
  container.addEventListener('click', (event) => {
    // Solo la navegación del shell; las vistas gestionan sus propios data-view
    const viewLink = event.target.closest('.sidebar [data-view], .user-menu [data-view]');
    if (viewLink && VIEWS[viewLink.dataset.view]) {
      event.preventDefault();
      setUserMenuOpen(false);
      if (window.matchMedia(MOBILE_QUERY).matches) setSidebarOpen(false);
      showView(viewLink.dataset.view);
      return;
    }

    if (event.target.closest('.sidebar [data-action="logout"], .user-menu [data-action="logout"]')) {
      setUserMenuOpen(false);
      confirmLogout();
    }
  });

  window.addEventListener('hashchange', () => {
    const view = location.hash.slice(1);
    if (VIEWS[view] && view !== appState.currentView) showView(view);
  });

  // Al pasar a escritorio, cerrar el cajón móvil
  window.matchMedia(MOBILE_QUERY).addEventListener('change', (event) => {
    if (!event.matches) setSidebarOpen(false);
  });
}

async function confirmLogout() {
  const confirmed = await notifications.confirm('¿Quieres cerrar la sesión del panel?', 'Cerrar sesión', 'Cancelar', { title: 'Cerrar sesión' });
  if (confirmed) window.location.href = LOGOUT_URL;
}

/**
 * Cambia de vista.
 * @param {string} viewName
 * @param {Record<string, unknown>} [params] - intención opcional (p. ej. { action: 'edit', slug })
 */
async function showView(viewName, params = {}) {
  const key = VIEWS[viewName] ? viewName : 'dashboard';
  const view = VIEWS[key];
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
  appState.currentView = key;

  if (location.hash.slice(1) !== key) history.replaceState(null, '', `#${key}`);

  document.querySelectorAll('.sidebar .nav-link[data-view]').forEach(link => {
    const active = link.dataset.view === key;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.getElementById('view-title').textContent = view.title;
  document.title = `${view.title} · Abya Yala`;

  // Cada vista se monta en un contenedor propio; si el usuario cambia de vista
  // mientras carga, el contenedor viejo queda fuera del DOM y se descarta.
  const main = document.getElementById('main-content');
  const viewContainer = document.createElement('div');
  viewContainer.className = 'view';
  viewContainer.innerHTML = `
    <div class="view-loading" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <span>Cargando ${escapeHtml(view.title.toLowerCase())}…</span>
    </div>
  `;
  main.replaceChildren(viewContainer);
  main.scrollTop = 0;
  window.scrollTo(0, 0);

  const isCurrent = () => token === appState.viewToken;

  try {
    const component = await view.load(viewContainer, isCurrent, params || {});
    if (!isCurrent()) {
      if (component && typeof component.destroy === 'function') component.destroy();
      return;
    }
    appState.activeComponent = component || null;
  } catch (error) {
    if (!isCurrent()) return;
    console.error(`Error al cargar la vista ${key}:`, error);
    viewContainer.innerHTML = `
      <div class="state-card state-error" role="alert">
        <span class="state-icon">${icon('error', { size: 28 })}</span>
        <h2 class="state-title">No se pudo cargar esta sección</h2>
        <p class="state-text"></p>
        <button type="button" class="btn btn-primary retry-btn">${icon('refresh', { size: 18 })}<span>Reintentar</span></button>
      </div>
    `;
    viewContainer.querySelector('.state-text').textContent = error.message || 'Error desconocido';
    viewContainer.querySelector('.retry-btn').addEventListener('click', () => showView(key, params));
  }
}

// === Sesión ===

function startSessionMonitor(expiresAtIso) {
  stopSessionMonitor();
  sessionState.expiresAt = toDate(expiresAtIso);
  sessionState.expired = false;
  updateSessionDisplays();
  if (!sessionState.expiresAt) return;

  sessionState.timer = setInterval(checkSession, SESSION_CHECK_MS);
  // Los navegadores congelan los temporizadores en pestañas en segundo plano:
  // al volver a la pestaña se comprueba de inmediato.
  document.addEventListener('visibilitychange', onVisibilityChange);
  checkSession();
}

function stopSessionMonitor() {
  if (sessionState.timer) clearInterval(sessionState.timer);
  sessionState.timer = null;
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') checkSession();
}

function checkSession() {
  if (!sessionState.expiresAt || sessionState.expired) return;
  const remaining = sessionState.expiresAt.getTime() - Date.now();

  if (remaining <= 0) {
    sessionState.expired = true;
    stopSessionMonitor();
    if (sessionState.warningToast) notifications.close(sessionState.warningToast);
    sessionState.warningToast = null;
    notifySessionExpired();
  } else if (remaining <= SESSION_WARNING_MS && !sessionState.warningToast) {
    sessionState.warningToast = notifications.warning(
      'Tu sesión vence pronto. Guarda tu trabajo y recarga la página para renovarla.',
      0
    );
  }
  updateSessionDisplays();
}

/** Texto de vencimiento de la sesión para la UI. */
function sessionExpiryText() {
  const expiresAt = sessionState.expiresAt;
  if (!expiresAt) return 'Vencimiento de la sesión no disponible';
  if (sessionState.expired || expiresAt.getTime() <= Date.now()) return `Sesión vencida ${formatRelative(expiresAt)}`;
  return `La sesión vence ${formatRelative(expiresAt)}`;
}

/** Actualiza todos los elementos [data-session-expiry] del documento. */
function updateSessionDisplays() {
  const text = sessionExpiryText();
  const expiresAt = sessionState.expiresAt;
  const remaining = expiresAt ? expiresAt.getTime() - Date.now() : null;
  document.querySelectorAll('[data-session-expiry]').forEach(element => {
    element.textContent = text;
    element.title = expiresAt ? formatDateTime(expiresAt) : '';
    element.classList.toggle('is-warning', remaining !== null && remaining > 0 && remaining <= SESSION_WARNING_MS);
    element.classList.toggle('is-expired', remaining !== null && remaining <= 0);
  });
}

// === Vistas ===

async function loadDashboard(container, isCurrent) {
  const { Dashboard } = await import('./components/dashboard.js');
  if (!isCurrent()) return null;
  const dashboard = new Dashboard(container, {
    user: appState.user,
    navigate: (view, params) => showView(view, params)
  });
  dashboard.init();
  return dashboard;
}

async function loadArticlesManager(container, isCurrent, params) {
  const { ArticleManager } = await import('./components/article-manager/index.js');
  if (!isCurrent()) return null;

  container.innerHTML = '';
  const articleManager = new ArticleManager(container, {
    contentManager,
    mediaManager,
    notificationManager: notifications,
    initialCategory: typeof params.category === 'string' ? params.category : ''
  });
  await articleManager.init();
  if (!isCurrent()) return articleManager;

  // Intención recibida desde el dashboard
  if (params.action === 'new') articleManager.createArticle();
  else if (params.action === 'edit' && params.slug) articleManager.editArticle(String(params.slug));
  return articleManager;
}

async function loadMediaLibrary(container, isCurrent, params) {
  const { MediaLibrary } = await import('./components/media-library.js');
  if (!isCurrent()) return null;
  const library = new MediaLibrary(container, null, { mediaManager, contentManager });

  if (params.action === 'upload' && library.fileUpload) {
    // Abrir el selector solo si el clic del usuario sigue "vivo"; si no, enfocar el botón
    const activation = navigator.userActivation;
    if (!activation || activation.isActive) library.fileUpload.click();
    else library.fileUpload.closest('label')?.focus();
  }
  return library;
}

async function loadCategoriesManager(container, isCurrent) {
  const { CategoryManager } = await import('./components/category-manager.js');
  if (!isCurrent()) return null;

  const categoryManager = new CategoryManager(contentManager);
  await categoryManager.init(container);
  return categoryManager;
}

async function loadAuthorsManager(container, isCurrent) {
  const { AuthorManager } = await import('./components/author-manager.js');
  if (!isCurrent()) return null;

  const authorManager = new AuthorManager(contentManager);
  await authorManager.init(container);
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
  const name = displayName();
  const expiresAt = sessionState.expiresAt;

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Cuenta y sesión</h2>
        <p class="page-subtitle">Quién eres en el panel y cómo funciona el acceso.</p>
      </div>
    </div>

    <div class="settings-grid">
      <section class="card" aria-labelledby="account-title">
        <div class="card-header">
          <h3 class="card-title" id="account-title">${icon('user', { size: 18 })}<span>Tu cuenta</span></h3>
        </div>
        <div class="card-body">
          <div class="account-row">
            <span class="avatar avatar-xl" aria-hidden="true">${escapeHtml(initials(name))}</span>
            <div class="min-w-0">
              <p class="account-name">${escapeHtml(user.name || 'Sin nombre')}</p>
              <p class="account-email">${escapeHtml(user.email || 'Correo no disponible')}</p>
            </div>
          </div>

          <dl class="detail-list">
            <div>
              <dt>Estado de la sesión</dt>
              <dd><span class="session-pill" data-session-expiry></span></dd>
            </div>
            <div>
              <dt>Fecha de vencimiento</dt>
              <dd>${escapeHtml(expiresAt ? formatDateTime(expiresAt) : 'No disponible')}</dd>
            </div>
          </dl>

          <div class="card-actions">
            <a href="${LOGOUT_URL}" class="btn btn-danger-outline">${icon('logout', { size: 18 })}<span>Cerrar sesión</span></a>
          </div>
        </div>
      </section>

      <section class="card" aria-labelledby="access-title">
        <div class="card-header">
          <h3 class="card-title" id="access-title">${icon('shield', { size: 18 })}<span>Cómo funciona el acceso</span></h3>
        </div>
        <div class="card-body prose-sm">
          <p>El acceso al panel lo gestiona <strong>Cloudflare Access</strong>: al entrar te identificas con tu correo y Cloudflare emite una sesión con fecha de vencimiento. El panel no guarda contraseñas.</p>
          <p>Cuando la sesión está por vencer verás un aviso. Guarda tu trabajo y recarga la página para volver a identificarte.</p>
          <p>Para dar acceso a otra persona, añade su correo a la política de la aplicación en <strong>Cloudflare Zero Trust</strong>.</p>
        </div>
      </section>

      <section class="card settings-wide" aria-labelledby="about-title">
        <div class="card-header">
          <h3 class="card-title" id="about-title">${icon('database', { size: 18 })}<span>Acerca del sistema</span></h3>
        </div>
        <div class="card-body">
          <ul class="stack-list">
            <li><span class="badge badge-blue">Astro</span><span>Sitio y API, desplegados en Cloudflare Pages.</span></li>
            <li><span class="badge badge-blue">Cloudflare D1</span><span>Base de datos de artículos, autores, categorías y actividad.</span></li>
            <li><span class="badge badge-blue">Cloudflare R2</span><span>Almacenamiento de imágenes y archivos multimedia.</span></li>
            <li><span class="badge badge-blue">Drizzle ORM</span><span>Esquema de la base de datos y migraciones.</span></li>
            <li><span class="badge badge-blue">TinyMCE</span><span>Editor de contenido de los artículos.</span></li>
          </ul>
        </div>
      </section>
    </div>
  `;
  updateSessionDisplays();
  return null;
}
