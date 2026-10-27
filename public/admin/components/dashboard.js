// Dashboard del panel: consume GET /api/admin/stats.
// Gráficos en HTML/CSS puro (sin librerías externas) con alternativa en tabla para lectores de pantalla.
import { apiRequest } from '../utils/api.js';
import { notifications } from './notification.js';
import { escapeHtml } from '../utils/html.js';
import { icon } from '../utils/icons.js';
import { formatBytes, formatNumber, formatRelative, formatDateTime, toDate } from '../utils/format.js';

const STATS_URL = '/api/admin/stats';

// Indicadores de salud: texto corto + explicación + gravedad cuando hay casos.
// `fix` es la reparación de POST /api/admin/maintenance que resuelve el indicador.
const HEALTH_ITEMS = [
  {
    key: 'legacyBrokenImage',
    label: 'Imágenes heredadas rotas',
    help: 'La imagen destacada apunta a media/uploads/…, una ruta importada de Blogger que ya no existe.',
    severity: 'critical',
    fix: 'images'
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
    severity: 'warning',
    fix: 'authors'
  },
  {
    key: 'withoutDescription',
    label: 'Sin descripción',
    help: 'Falta el resumen que usan los listados, los buscadores y las redes sociales.',
    severity: 'warning',
    fix: 'descriptions'
  },
  {
    key: 'base64Images',
    label: 'Imágenes incrustadas (base64)',
    help: 'Imágenes pegadas dentro del HTML: hacen el artículo pesado. Conviene subirlas a la biblioteca.',
    severity: 'warning',
    fix: 'base64'
  },
  {
    key: 'withoutImage',
    label: 'Sin imagen destacada',
    help: 'No tienen ninguna imagen en el contenido y usan la portada genérica. Se les puede poner una desde el editor.',
    severity: 'info'
  }
];

const MAINTENANCE_URL = '/api/admin/maintenance';

const FIX_COPY = {
  images: {
    title: 'Reparar imágenes destacadas',
    intro: 'Para cada artículo con la imagen rota o vacía se busca el archivo en la biblioteca de medios y, si no está, se usa la primera imagen del propio artículo.'
  },
  descriptions: {
    title: 'Generar descripciones',
    intro: 'Se crea un resumen de hasta 160 caracteres con el inicio del texto de cada artículo sin descripción. Después puedes editarlo a mano.'
  },
  authors: {
    title: 'Asignar autor',
    intro: 'Los artículos sin autor válido (casi todos los importados de Blogger) quedarán firmados por el autor que elijas.'
  },
  base64: {
    title: 'Mover imágenes incrustadas a la biblioteca',
    intro: 'Las imágenes pegadas dentro del texto se suben a la biblioteca de medios y el artículo pasa a enlazarlas. El contenido visible no cambia.'
  }
};

const ACTION_VERBS = {
  create: 'creó',
  edit: 'editó',
  update: 'editó',
  delete: 'eliminó',
  media_upload: 'subió',
  media_delete: 'eliminó',
  bulk_import: 'hizo una importación masiva',
  maintenance: 'reparó'
};

const ENTITY_LABELS = {
  article: 'el artículo',
  author: 'el autor',
  category: 'la categoría',
  media: 'el archivo'
};

const ENTITY_PLURALS = {
  article: ['artículo', 'artículos'],
  author: ['autor', 'autores'],
  category: ['categoría', 'categorías'],
  media: ['archivo', 'archivos']
};

const MAX_FEED_ITEMS = 8;
// Acciones iguales del mismo usuario separadas por menos de esto se muestran como una sola
const GROUP_WINDOW_MS = 30 * 60 * 1000;

/** Nombre legible: los archivos subidos llevan un prefijo «timestamp-aleatorio-». */
function entityTitle(activity) {
  const title = String(activity.entity_title || '');
  return activity.entity_type === 'media' ? title.replace(/^d{10,}-[a-z0-9]{4,8}-/i, '') : title;
}

/** Agrupa acciones consecutivas del mismo usuario, tipo y entidad (p. ej. borrar 10 archivos seguidos). */
function groupActivities(activities) {
  const groups = [];
  for (const activity of activities) {
    const last = groups[groups.length - 1];
    const prev = last && last[last.length - 1];
    const close = prev && Math.abs((toDate(prev.created_at) || 0) - (toDate(activity.created_at) || 0)) < GROUP_WINDOW_MS;
    if (prev && close && prev.type === activity.type && prev.entity_type === activity.entity_type && prev.user_name === activity.user_name && activity.type !== 'bulk_import') {
      last.push(activity);
    } else {
      groups.push([activity]);
    }
  }
  return groups;
}

const ACTIVITY_ICONS = {
  create: 'plus',
  edit: 'edit',
  update: 'edit',
  delete: 'trash',
  media_upload: 'upload',
  media_delete: 'trash',
  bulk_import: 'import',
  maintenance: 'wrench'
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
      case 'fix':
        if (target.dataset.fix) this.openFix(target.dataset.fix, target);
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
    const issues = items.filter(item => item.count > 0 && item.severity !== 'info').length;

    const rows = items.map(item => {
      const ok = item.count === 0;
      const tone = ok ? 'ok' : item.severity;
      const statusLabel = ok ? 'Correcto' : ({ critical: 'Requiere atención', warning: 'Revisar', info: 'Informativo' }[item.severity]);
      const statusIcon = ok ? 'check' : (item.severity === 'info' ? 'info' : 'alert');
      const action = !ok && item.fix
        ? `<button type="button" class="btn btn-secondary btn-sm health-fix" data-action="fix" data-fix="${item.fix}">${icon('wrench', { size: 14 })}<span>Reparar</span><span class="sr-only">: ${escapeHtml(item.label)}</span></button>`
        : '';
      return `
        <li class="health-item">
          <span class="health-status health-${tone}">${icon(statusIcon, { size: 16 })}<span class="sr-only">${statusLabel}:</span></span>
          <span class="health-text">
            <span class="health-label">${escapeHtml(item.label)}</span>
            <span class="health-help">${escapeHtml(item.help)}</span>
            ${action}
          </span>
          <span class="health-count health-count-${tone}">${escapeHtml(formatNumber(item.count))}</span>
        </li>
      `;
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
    const counts = new Map();
    for (const row of byYear) {
      const year = Number(row.year);
      if (Number.isInteger(year)) counts.set(year, (counts.get(year) || 0) + num(row.count));
    }

    if (counts.size === 0) {
      return this.emptyCard('span-2', 'years-title', 'Artículos por año', 'activity', 'Todavía no hay artículos con fecha de publicación.');
    }

    // Todos los años del rango, también los que no tienen artículos: los huecos son información
    const first = Math.min(...counts.keys());
    const last = Math.max(...counts.keys());
    const rows = [];
    for (let year = first; year <= last; year++) rows.push({ year, count: counts.get(year) || 0 });

    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const max = Math.max(...rows.map(row => row.count), 1);
    const best = rows.reduce((top, row) => (row.count > top.count ? row : top), rows[0]);

    const columns = rows.map(row => {
      const height = row.count === 0 ? 0 : Math.max(1.5, (row.count / max) * 100);
      const label = `${row.year}: ${plural(row.count, 'artículo', 'artículos')}`;
      return `
        <li class="vbar${row.count === 0 ? ' is-empty' : ''}${row === best ? ' is-max' : ''}" title="${escapeHtml(label)}">
          <span class="sr-only">${escapeHtml(label)}</span>
          <span class="vbar-track" aria-hidden="true">
            <span class="vbar-value">${row.count ? escapeHtml(formatNumber(row.count)) : ''}</span>
            <span class="vbar-fill" style="height:${height.toFixed(1)}%"></span>
          </span>
          <span class="vbar-label" aria-hidden="true"><span class="vbar-century">${String(row.year).slice(0, 2)}</span>${String(row.year).slice(2)}</span>
        </li>
      `;
    }).join('');

    return `
      <section class="card span-2" aria-labelledby="years-title">
        <div class="card-header">
          <h3 class="card-title" id="years-title">${icon('activity', { size: 18 })}<span>Artículos por año</span></h3>
          <span class="card-meta">${escapeHtml(plural(total, 'artículo', 'artículos'))} · más publicaciones en ${best.year}</span>
        </div>
        <div class="card-body">
          <ol class="vbar-chart" aria-label="Artículos publicados por año, de ${first} a ${last}" style="--bars:${rows.length}">${columns}</ol>
        </div>
      </section>
    `;
  }

  // === Reparaciones ===

  async openFix(fix, trigger) {
    const copy = FIX_COPY[fix];
    if (!copy || this.fixing) return;
    this.fixing = true;
    trigger.disabled = true;
    try {
      const preview = await apiRequest(MAINTENANCE_URL, { method: 'POST', body: { action: fix } });
      if (this.destroyed) return;
      const choice = await this.fixDialog(fix, copy, preview);
      if (!choice) return;
      const result = await apiRequest(MAINTENANCE_URL, { method: 'POST', body: { action: fix, apply: true, ...choice } });
      notifications.show(
        result.affected
          ? `${copy.title}: ${plural(result.affected, 'artículo actualizado', 'artículos actualizados')}.`
          : 'No había nada que cambiar.',
        'success'
      );
      if (!this.destroyed) this.load();
    } catch (error) {
      console.error('Error en la reparación:', error);
      notifications.show(error.message || 'No se pudo completar la reparación', 'error');
    } finally {
      this.fixing = false;
      if (trigger.isConnected) trigger.disabled = false;
    }
  }

  /** Muestra la vista previa y resuelve con las opciones elegidas, o null si se cancela. */
  fixDialog(fix, copy, preview) {
    const previousFocus = document.activeElement;
    const summary = (preview.summary || []).filter(item => num(item.count) > 0);
    const authors = Array.isArray(preview.authors) ? preview.authors : [];
    const suggested = authors.find(a => /abya\s*yala|colectivo/i.test(a.name)) || authors[0];
    const nothing = num(preview.affected) === 0;
    const needsAuthor = fix === 'authors';
    const blocked = nothing || (needsAuthor && authors.length === 0);

    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-backdrop';
      overlay.innerHTML = `
        <div class="modal-panel modal-sm" role="dialog" aria-modal="true" aria-labelledby="fix-title">
          <div class="modal-header">
            <h2 class="modal-title" id="fix-title">${escapeHtml(copy.title)}</h2>
            <button type="button" class="btn-icon" data-close aria-label="Cerrar">${icon('close')}</button>
          </div>
          <div class="modal-body">
            <p class="fix-intro">${escapeHtml(copy.intro)}</p>
            ${nothing
              ? '<p class="fix-empty">No hay artículos que reparar.</p>'
              : `<ul class="fix-summary">${summary.map(item => `<li><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(formatNumber(num(item.count)))}</strong></li>`).join('')}</ul>`}
            ${needsAuthor && !nothing
              ? (authors.length
                ? `<div class="form-group fix-author">
                    <label class="form-label" for="fix-author">Autor</label>
                    <select id="fix-author" class="form-select">
                      ${authors.map(a => `<option value="${a.id}" ${a === suggested ? 'selected' : ''}>${escapeHtml(a.name)} (${escapeHtml(plural(a.articles, 'artículo', 'artículos'))})</option>`).join('')}
                    </select>
                  </div>`
                : '<p class="fix-empty">Primero crea un autor en la sección Autores.</p>')
              : ''}
            ${nothing ? '' : '<p class="fix-note">Los cambios se aplican sobre la base de datos publicada y quedan en la actividad reciente.</p>'}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close>${blocked ? 'Cerrar' : 'Cancelar'}</button>
            ${blocked ? '' : `<button type="button" class="btn btn-primary" data-confirm>${icon('wrench', { size: 16 })}<span>Reparar ${escapeHtml(plural(num(preview.affected), 'artículo', 'artículos'))}</span></button>`}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('is-visible'));

      const confirmBtn = overlay.querySelector('[data-confirm]');
      (confirmBtn || overlay.querySelector('[data-close]')).focus();

      const finish = (value) => {
        document.removeEventListener('keydown', onKeydown, true);
        overlay.classList.remove('is-visible');
        setTimeout(() => overlay.remove(), 200);
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
        resolve(value);
      };
      const onKeydown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish(null);
        }
      };
      document.addEventListener('keydown', onKeydown, true);
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay || event.target.closest('[data-close]')) finish(null);
        else if (event.target.closest('[data-confirm]')) {
          const select = overlay.querySelector('#fix-author');
          finish(select ? { authorId: Number(select.value) } : {});
        }
      });
    });
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

    const items = groupActivities(activities).slice(0, MAX_FEED_ITEMS).map(group => {
      const first = group[0];
      const type = String(first.type || '');
      const verb = ACTION_VERBS[type] || type || 'modificó';
      const count = group.length;
      const tone = /delete/.test(type) ? 'danger' : (type === 'create' || type === 'media_upload' || type === 'bulk_import' || type === 'maintenance' ? 'success' : 'info');
      const when = first.relative_time || formatRelative(first.created_at);

      let what = '';
      if (type !== 'bulk_import') {
        if (count === 1) {
          const entity = type === 'maintenance' ? '' : (ENTITY_LABELS[first.entity_type] || '');
          const title = entityTitle(first);
          what = `${entity ? ` ${escapeHtml(entity)}` : ''}${title ? ` <span class="feed-entity">«${escapeHtml(title)}»</span>` : ''}`;
        } else {
          const [singular, pluralForm] = ENTITY_PLURALS[first.entity_type] || ['elemento', 'elementos'];
          what = ` <span class="feed-entity">${escapeHtml(plural(count, singular, pluralForm))}</span>`;
        }
      }

      const names = count > 1
        ? `<details class="feed-more"><summary>Ver cuáles</summary><ul>${group.map(a => `<li>${escapeHtml(entityTitle(a) || 'Sin nombre')}</li>`).join('')}</ul></details>`
        : '';

      return `
        <li class="feed-item">
          <span class="feed-icon feed-${tone}">${icon(ACTIVITY_ICONS[type] || 'activity', { size: 16 })}</span>
          <div class="feed-text">
            <p><strong>${escapeHtml(first.user_name || 'Alguien')}</strong> ${escapeHtml(verb)}${what}</p>
            <time class="feed-time" datetime="${escapeHtml(first.created_at || '')}">${escapeHtml(when)} · ${escapeHtml(formatDateTime(first.created_at))}</time>
            ${names}
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
