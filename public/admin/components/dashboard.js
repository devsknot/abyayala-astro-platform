// Dashboard del panel: consume GET /api/admin/stats.
// Gráficos en HTML/CSS puro (sin librerías externas) con alternativa en tabla para lectores de pantalla.
import { apiRequest } from '../utils/api.js';
import { escapeHtml } from '../utils/html.js';
import { icon } from '../utils/icons.js';
import { formatBytes, formatNumber, formatRelative, formatDateTime } from '../utils/format.js';

const STATS_URL = '/api/admin/stats';

// Indicadores de salud: texto corto + explicación + gravedad cuando hay casos
const HEALTH_ITEMS = [
  {
    key: 'legacyBrokenImage',
    label: 'Imágenes heredadas rotas',
    help: 'La imagen destacada apunta a media/uploads/…, una ruta importada de Blogger que ya no existe.',
    severity: 'critical'
  },
  {
    key: 'uncategorized',
    label: 'Sin categoría válida',
    help: 'La categoría está vacía o no existe en la lista de categorías.',
    severity: 'critical'
  },
  {
    key: 'withoutAuthor',
    label: 'Sin autor válido',
    help: 'No tienen autor asignado o el autor ya no existe.',
    severity: 'warning'
  },
  {
    key: 'withoutImage',
    label: 'Sin imagen destacada',
    help: 'Se muestran sin portada en listados y al compartir en redes.',
    severity: 'warning'
  },
  {
    key: 'withoutDescription',
    label: 'Sin descripción',
    help: 'Falta el resumen que usan los listados, los buscadores y las redes sociales.',
    severity: 'warning'
  },
  {
    key: 'base64Images',
    label: 'Imágenes incrustadas (base64)',
    help: 'Imágenes pegadas dentro del HTML: hacen el artículo pesado. Conviene subirlas a la biblioteca.',
    severity: 'warning'
  }
];

const ACTION_VERBS = {
  create: 'creó',
  edit: 'editó',
  update: 'editó',
  delete: 'eliminó',
  media_upload: 'subió',
  media_delete: 'eliminó',
  bulk_import: 'hizo una importación masiva'
};

const ENTITY_LABELS = {
  article: 'el artículo',
  author: 'el autor',
  category: 'la categoría',
  media: 'el archivo'
};

const ACTIVITY_ICONS = {
  create: 'plus',
  edit: 'edit',
  update: 'edit',
  delete: 'trash',
  media_upload: 'upload',
  media_delete: 'trash',
  bulk_import: 'import'
};

function firstName(user) {
  const name = (user && (user.name || '')).trim();
  if (name) return name.split(/\s+/)[0];
  const email = (user && user.email) || '';
  return email ? email.split('@')[0] : '';
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 6) return 'Buenas noches';
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function plural(n, singular, pluralForm) {
  return `${formatNumber(n)} ${n === 1 ? singular : pluralForm}`;
}

export class Dashboard {
  /**
   * @param {HTMLElement} container
   * @param {{ user?: { name?: string, email?: string }, navigate: (view: string, params?: object) => void }} options
   */
  constructor(container, { user, navigate }) {
    this.container = container;
    this.user = user || {};
    this.navigate = navigate;
    this.controller = null;
    this.destroyed = false;
    this.stats = null;
    this.onClick = this.onClick.bind(this);
  }

  init() {
    const name = firstName(this.user);
    this.container.innerHTML = `
      <div class="dashboard">
        <div class="page-header">
          <div>
            <h2 class="page-title">${escapeHtml(greeting())}${name ? `, ${escapeHtml(name)}` : ''}</h2>
            <p class="page-subtitle dashboard-updated">Resumen del contenido del sitio.</p>
          </div>
          <div class="page-actions">
            <button type="button" class="btn btn-primary" data-action="new-article">${icon('plus', { size: 18 })}<span>Nuevo artículo</span></button>
            <button type="button" class="btn btn-secondary" data-action="upload">${icon('upload', { size: 18 })}<span>Subir imagen</span></button>
            <a href="/" target="_blank" rel="noopener" class="btn btn-ghost">${icon('external', { size: 18 })}<span>Ver sitio</span><span class="sr-only"> (se abre en una pestaña nueva)</span></a>
          </div>
        </div>
        <div class="dashboard-body" aria-live="polite"></div>
      </div>
    `;
    this.body = this.container.querySelector('.dashboard-body');
    this.container.addEventListener('click', this.onClick);
    this.load();
  }

  destroy() {
    this.destroyed = true;
    if (this.controller) this.controller.abort();
    this.container.removeEventListener('click', this.onClick);
  }

  async load() {
    if (this.controller) this.controller.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.renderSkeleton();

    try {
      const data = await apiRequest(STATS_URL, { signal: controller.signal });
      if (this.destroyed || controller.signal.aborted) return;
      if (!data || !data.totals) throw new Error('Respuesta inesperada del servidor');
      this.stats = data;
      this.renderStats(data);
    } catch (error) {
      if (error.name === 'AbortError' || this.destroyed) return;
      console.error('Error al cargar estadísticas:', error);
      this.renderError(error);
    }
  }

  onClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target || !this.container.contains(target)) return;
    const { action, slug, category } = target.dataset;

    switch (action) {
      case 'new-article':
        this.navigate('articles', { action: 'new' });
        break;
      case 'upload':
        this.navigate('media', { action: 'upload' });
        break;
      case 'retry':
        this.load();
        break;
      case 'edit-article':
        if (slug) this.navigate('articles', { action: 'edit', slug });
        break;
      case 'filter-category':
        this.navigate('articles', { category: category || '' });
        break;
      case 'open-view':
        if (target.dataset.view) this.navigate(target.dataset.view);
        break;
      default:
        break;
    }
  }

  // === Estados ===

  renderSkeleton() {
    this.body.setAttribute('aria-busy', 'true');
    this.body.innerHTML = `
      <span class="sr-only" role="status">Cargando estadísticas…</span>
      <div class="kpi-grid" aria-hidden="true">
        ${'<div class="kpi skeleton-card"><span class="skeleton skeleton-text w-1/2"></span><span class="skeleton skeleton-title"></span></div>'.repeat(4)}
      </div>
      <div class="dashboard-grid" aria-hidden="true">
        <div class="card span-1"><div class="card-body">${'<span class="skeleton skeleton-row"></span>'.repeat(6)}</div></div>
        <div class="card span-2"><div class="card-body"><span class="skeleton skeleton-chart"></span></div></div>
        <div class="card span-half"><div class="card-body">${'<span class="skeleton skeleton-row"></span>'.repeat(5)}</div></div>
        <div class="card span-half"><div class="card-body">${'<span class="skeleton skeleton-row"></span>'.repeat(5)}</div></div>
      </div>
    `;
  }

  renderError(error) {
    this.body.removeAttribute('aria-busy');
    const notAvailable = error && error.status === 404;
    this.body.innerHTML = `
      <div class="state-card state-error" role="alert">
        <span class="state-icon">${icon('alert', { size: 28 })}</span>
        <h3 class="state-title">${notAvailable ? 'Las estadísticas aún no están disponibles' : 'No se pudieron cargar las estadísticas'}</h3>
        <p class="state-text"></p>
        <button type="button" class="btn btn-primary" data-action="retry">${icon('refresh', { size: 18 })}<span>Reintentar</span></button>
      </div>
    `;
    this.body.querySelector('.state-text').textContent = notAvailable
      ? 'El servicio de estadísticas no respondió (404). Puedes seguir usando el resto del panel.'
      : (error && error.message) || 'Error desconocido';
  }

  renderStats(data) {
    this.body.removeAttribute('aria-busy');
    const updated = this.container.querySelector('.dashboard-updated');
    if (updated && data.generatedAt) {
      updated.textContent = `Resumen del contenido del sitio · actualizado ${formatRelative(data.generatedAt)}`;
      updated.title = formatDateTime(data.generatedAt);
    }

    this.body.innerHTML = `
      ${this.renderKpis(data.totals || {})}
      <div class="dashboard-grid">
        ${this.renderHealth(data.health || {})}
        ${this.renderYears(Array.isArray(data.byYear) ? data.byYear : [])}
        ${this.renderCategories(Array.isArray(data.byCategory) ? data.byCategory : [])}
        ${this.renderRecent(Array.isArray(data.recentArticles) ? data.recentArticles : [])}
        ${this.renderActivity(Array.isArray(data.recentActivity) ? data.recentActivity : [])}
        ${this.renderLargest(Array.isArray(data.largestArticles) ? data.largestArticles : [])}
      </div>
    `;
  }

  // === Secciones ===

  renderKpis(totals) {
    const media = totals.media || {};
    const mediaCount = num(media.count);
    const mediaSize = formatBytes(num(media.bytes));
    const tiles = [
      { label: 'Artículos', value: formatNumber(num(totals.articles)), icon: 'articles', tone: 'blue', view: 'articles' },
      { label: 'Autores', value: formatNumber(num(totals.authors)), icon: 'authors', tone: 'green', view: 'authors' },
      { label: 'Categorías', value: formatNumber(num(totals.categories)), icon: 'categories', tone: 'ochre', view: 'categories' },
      {
        label: 'Archivos multimedia',
        value: `${formatNumber(mediaCount)}${media.truncated ? '+' : ''}`,
        meta: `${mediaSize || '0 B'}${media.truncated ? ' · recuento parcial' : ''}`,
        icon: 'media',
        tone: 'slate',
        view: 'media'
      }
    ];

    return `
      <div class="kpi-grid">
        ${tiles.map(tile => `
          <button type="button" class="kpi kpi-${tile.tone}" data-action="open-view" data-view="${tile.view}">
            <span class="kpi-icon">${icon(tile.icon, { size: 22 })}</span>
            <span class="kpi-text">
              <span class="kpi-label">${escapeHtml(tile.label)}</span>
              <span class="kpi-value">${escapeHtml(tile.value)}</span>
              ${tile.meta ? `<span class="kpi-meta">${escapeHtml(tile.meta)}</span>` : ''}
            </span>
          </button>
        `).join('')}
      </div>
    `;
  }

  renderHealth(health) {
    const items = HEALTH_ITEMS.map(item => ({ ...item, count: num(health[item.key]) }));
    const issues = items.filter(item => item.count > 0).length;

    const rows = items.map(item => {
      const ok = item.count === 0;
      const tone = ok ? 'ok' : item.severity;
      const statusLabel = ok ? 'Correcto' : (item.severity === 'critical' ? 'Requiere atención' : 'Revisar');
      const inner = `
        <span class="health-status health-${tone}">${icon(ok ? 'check' : 'alert', { size: 16 })}<span class="sr-only">${statusLabel}:</span></span>
        <span class="health-text">
          <span class="health-label">${escapeHtml(item.label)}</span>
          <span class="health-help">${escapeHtml(item.help)}</span>
        </span>
        <span class="health-count health-count-${tone}">${escapeHtml(formatNumber(item.count))}</span>
      `;
      return ok
        ? `<li class="health-item">${inner}</li>`
        : `<li><button type="button" class="health-item is-actionable" data-action="open-view" data-view="articles" title="Abrir la lista de artículos">${inner}</button></li>`;
    }).join('');

    return `
      <section class="card span-1" aria-labelledby="health-title">
        <div class="card-header">
          <h3 class="card-title" id="health-title">${icon('shield', { size: 18 })}<span>Salud del contenido</span></h3>
          <span class="badge ${issues ? 'badge-warning' : 'badge-success'}">${issues ? `${issues} por revisar` : 'Todo en orden'}</span>
        </div>
        <ul class="health-list">${rows}</ul>
      </section>
    `;
  }

  renderYears(byYear) {
    const rows = byYear
      .map(row => ({ year: String(row.year ?? ''), count: num(row.count) }))
      .filter(row => row.year);
    const total = rows.reduce((sum, row) => sum + row.count, 0);

    if (rows.length === 0) {
      return this.emptyCard('span-2', 'years-title', 'Artículos por año', 'activity', 'Todavía no hay artículos con fecha de publicación.');
    }

    const max = Math.max(...rows.map(row => row.count), 1);
    const maxRow = rows.reduce((best, row) => (row.count > best.count ? row : best), rows[0]);
    const lastRow = rows[rows.length - 1];

    const columns = rows.map(row => {
      const height = row.count === 0 ? 0 : Math.max(2, Math.round((row.count / max) * 100));
      const label = `${row.year}: ${plural(row.count, 'artículo', 'artículos')}`;
      // Etiqueta directa solo en el máximo y el último año (el resto, en el tooltip)
      const showValue = row === maxRow || row === lastRow;
      return `
        <div class="vbar" tabindex="0" role="img" aria-label="${escapeHtml(label)}" data-tip="${escapeHtml(label)}">
          <span class="vbar-value ${showValue ? '' : 'is-hidden'}">${escapeHtml(formatNumber(row.count))}</span>
          <span class="vbar-track"><span class="vbar-fill" style="height:${height}%"></span></span>
          <span class="vbar-label">${escapeHtml(row.year)}</span>
        </div>
      `;
    }).join('');

    return `
      <section class="card span-2" aria-labelledby="years-title">
        <div class="card-header">
          <h3 class="card-title" id="years-title">${icon('activity', { size: 18 })}<span>Artículos por año</span></h3>
          <span class="card-meta">${escapeHtml(plural(total, 'artículo', 'artículos'))} con fecha</span>
        </div>
        <div class="card-body">
          <div class="vbar-chart" role="group" aria-label="Artículos publicados por año">${columns}</div>
        </div>
      </section>
    `;
  }

  renderCategories(byCategory) {
    const rows = byCategory.map(row => ({
      id: String(row.id ?? ''),
      name: String(row.name || row.id || 'Sin nombre'),
      count: num(row.count)
    }));

    if (rows.length === 0) {
      return this.emptyCard('span-half', 'cat-title', 'Artículos por categoría', 'categories', 'No hay categorías creadas.');
    }

    const max = Math.max(...rows.map(row => row.count), 1);
    const items = rows.map(row => {
      const width = row.count === 0 ? 0 : Math.max(1, Math.round((row.count / max) * 100));
      const label = `${row.name}: ${plural(row.count, 'artículo', 'artículos')}`;
      return `
        <li>
          <button type="button" class="hbar" data-action="filter-category" data-category="${escapeHtml(row.id)}" aria-label="${escapeHtml(label)}. Ver artículos de esta categoría">
            <span class="hbar-name">${escapeHtml(row.name)}</span>
            <span class="hbar-track" aria-hidden="true"><span class="hbar-fill" style="width:${width}%"></span></span>
            <span class="hbar-value ${row.count === 0 ? 'is-zero' : ''}" aria-hidden="true">${escapeHtml(formatNumber(row.count))}</span>
          </button>
        </li>
      `;
    }).join('');

    return `
      <section class="card span-half" aria-labelledby="cat-title">
        <div class="card-header">
          <h3 class="card-title" id="cat-title">${icon('categories', { size: 18 })}<span>Artículos por categoría</span></h3>
          <span class="card-meta">${escapeHtml(plural(rows.length, 'categoría', 'categorías'))}</span>
        </div>
        <div class="card-body">
          <ul class="hbar-list">${items}</ul>
        </div>
      </section>
    `;
  }

  renderRecent(articles) {
    if (articles.length === 0) {
      return this.emptyCard('span-half', 'recent-title', 'Editados recientemente', 'edit', 'Aún no se ha editado ningún artículo.');
    }

    const items = articles.map(article => {
      const slug = String(article.slug || '');
      const title = article.title || slug || 'Sin título';
      const edited = article.updated_at ? `Editado ${formatRelative(article.updated_at)}` : '';
      const meta = [article.category, edited].filter(Boolean).join(' · ');
      return `
        <li class="list-row">
          <button type="button" class="list-main" data-action="edit-article" data-slug="${escapeHtml(slug)}">
            <span class="list-title">${escapeHtml(title)}</span>
            <span class="list-meta" title="${escapeHtml(formatDateTime(article.updated_at))}">${escapeHtml(meta)}</span>
          </button>
          <a class="btn-icon btn-icon-sm" href="/news/${encodeURIComponent(slug)}" target="_blank" rel="noopener" aria-label="Ver «${escapeHtml(title)}» en el sitio (pestaña nueva)">${icon('external', { size: 16 })}</a>
        </li>
      `;
    }).join('');

    return `
      <section class="card span-half" aria-labelledby="recent-title">
        <div class="card-header">
          <h3 class="card-title" id="recent-title">${icon('edit', { size: 18 })}<span>Editados recientemente</span></h3>
          <button type="button" class="btn btn-link" data-action="open-view" data-view="articles">Ver todos</button>
        </div>
        <ul class="list">${items}</ul>
      </section>
    `;
  }

  renderActivity(activities) {
    if (activities.length === 0) {
      return this.emptyCard('span-half', 'activity-title', 'Actividad reciente', 'activity', 'Todavía no hay actividad registrada.');
    }

    const items = activities.map(activity => {
      const type = String(activity.type || '');
      const verb = ACTION_VERBS[type] || type || 'modificó';
      const entity = type === 'bulk_import' ? '' : (ENTITY_LABELS[activity.entity_type] || '');
      const title = type === 'bulk_import' ? '' : (activity.entity_title || '');
      const when = activity.relative_time || formatRelative(activity.created_at);
      const tone = /delete/.test(type) ? 'danger' : (type === 'create' || type === 'media_upload' || type === 'bulk_import' ? 'success' : 'info');
      return `
        <li class="feed-item">
          <span class="feed-icon feed-${tone}">${icon(ACTIVITY_ICONS[type] || 'activity', { size: 16 })}</span>
          <div class="feed-text">
            <p><strong>${escapeHtml(activity.user_name || 'Alguien')}</strong> ${escapeHtml(verb)}${entity ? ` ${escapeHtml(entity)}` : ''}${title ? ` <span class="feed-entity">«${escapeHtml(title)}»</span>` : ''}</p>
            <time class="feed-time" datetime="${escapeHtml(activity.created_at || '')}" title="${escapeHtml(formatDateTime(activity.created_at))}">${escapeHtml(when)}</time>
          </div>
        </li>
      `;
    }).join('');

    return `
      <section class="card span-half" aria-labelledby="activity-title">
        <div class="card-header">
          <h3 class="card-title" id="activity-title">${icon('activity', { size: 18 })}<span>Actividad reciente</span></h3>
        </div>
        <ul class="feed">${items}</ul>
      </section>
    `;
  }

  renderLargest(articles) {
    if (articles.length === 0) return '';
    const items = articles.map(article => {
      const slug = String(article.slug || '');
      const kb = num(article.kb);
      return `
        <li class="list-row">
          <button type="button" class="list-main" data-action="edit-article" data-slug="${escapeHtml(slug)}">
            <span class="list-title">${escapeHtml(article.title || slug || 'Sin título')}</span>
          </button>
          <span class="badge ${kb >= 500 ? 'badge-warning' : 'badge-neutral'}">${escapeHtml(formatNumber(Math.round(kb)))} KB</span>
        </li>
      `;
    }).join('');

    return `
      <section class="card span-half" aria-labelledby="largest-title">
        <div class="card-header">
          <h3 class="card-title" id="largest-title">${icon('file', { size: 18 })}<span>Artículos más pesados</span></h3>
          <span class="card-meta">Tamaño del contenido HTML</span>
        </div>
        <ul class="list">${items}</ul>
      </section>
    `;
  }

  // === Auxiliares ===

  emptyCard(span, id, title, iconName, text) {
    return `
      <section class="card ${span}" aria-labelledby="${id}">
        <div class="card-header">
          <h3 class="card-title" id="${id}">${icon(iconName, { size: 18 })}<span>${escapeHtml(title)}</span></h3>
        </div>
        <div class="empty-state empty-state-sm"><p>${escapeHtml(text)}</p></div>
      </section>
    `;
  }
}
