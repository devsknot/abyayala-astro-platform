// Gestor de autores para el CMS
import { notifications } from './notification.js';
import { AvatarWizard } from './avatar-builder/AvatarWizard.js';
import { escapeHtml, attrUrl, safeUrl } from '../utils/html.js';
import { icon } from '../utils/icons.js';
import { initials, slugify, scrollIntoViewSafe } from '../utils/format.js';

const SOCIAL_FIELDS = [
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/usuario' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/usuario' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/usuario' },
  { key: 'website', label: 'Sitio web', placeholder: 'https://sitioweb.com' }
];

const SLUG_HELP = 'Identificador único para la URL (solo letras, números y guiones).';

/** social_media puede llegar como objeto o como JSON en texto. */
function parseSocialMedia(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

export class AuthorManager {
  constructor(contentManager) {
    this.contentManager = contentManager;
    this.authors = [];
    this.container = null;
    this.isLoading = false;
    this.currentEditingAuthor = null;
    this.avatarWizard = new AvatarWizard();
    this.currentAvatarConfig = null;
  }

  /**
   * Inicializa el gestor.
   * @param {HTMLElement|string} target - contenedor o id del contenedor
   */
  async init(target) {
    this.container = typeof target === 'string' ? document.getElementById(target) : target;
    if (!this.container) {
      console.error('Contenedor del gestor de autores no encontrado');
      return;
    }

    this.render();
    this.attachEventListeners();
    await this.loadAuthors();
  }

  destroy() {
    // Cerrar el wizard si quedó abierto al cambiar de vista
    this.avatarWizard.close();
  }

  async loadAuthors() {
    this.setLoading(true);
    try {
      const response = await this.contentManager.getAuthors();
      this.authors = Array.isArray(response?.authors) ? response.authors : (Array.isArray(response) ? response : []);
      this.authors.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'));
    } catch (error) {
      notifications.error(`Error al cargar autores: ${error.message}`);
      this.authors = [];
    } finally {
      this.setLoading(false);
    }
    this.renderAuthorsList();
    return this.authors;
  }

  // Bloquea el formulario mientras se guarda o elimina
  setLoading(loading) {
    this.isLoading = loading;
    if (!this.container) return;
    this.container.querySelector('.author-manager')?.setAttribute('aria-busy', String(loading));
    this.container.querySelectorAll('.author-editor button, .author-editor input, .author-editor textarea').forEach(element => {
      element.disabled = loading;
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="author-manager">
        <div class="authors-list">
          <div class="page-header">
            <div>
              <h2 class="page-title">Autores</h2>
              <p class="page-subtitle">Personas y colectivos que firman los artículos.</p>
            </div>
            <div class="page-actions">
              <button type="button" id="createAuthorBtn" class="btn btn-primary">${icon('plus', { size: 18 })}<span>Nuevo autor</span></button>
            </div>
          </div>

          <div class="card table-card">
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th scope="col">Autor</th>
                    <th scope="col" class="hide-sm">Slug</th>
                    <th scope="col" class="hide-sm">Email</th>
                    <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody id="authorsTableBody">
                  ${'<tr aria-hidden="true"><td colspan="4"><span class="skeleton skeleton-row"></span></td></tr>'.repeat(4)}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="author-editor" hidden>
          <div class="page-header">
            <div class="page-header-main">
              <button type="button" class="back-to-list-btn btn btn-ghost btn-sm">${icon('arrowLeft', { size: 18 })}<span>Volver a la lista</span></button>
              <h3 class="page-title author-form-title">Nuevo autor</h3>
            </div>
          </div>

          <form id="authorForm" class="card form-card" novalidate>
            <div class="card-body">
              <div class="form-grid">
                <div>
                  <div class="form-field">
                    <label for="authorName" class="form-label">Nombre <span class="required" aria-hidden="true">*</span></label>
                    <input type="text" id="authorName" class="form-input" required autocomplete="off">
                  </div>

                  <div class="form-field">
                    <label for="authorSlug" class="form-label">Slug <span class="required" aria-hidden="true">*</span></label>
                    <input type="text" id="authorSlug" class="form-input font-mono" required autocomplete="off">
                    <p class="form-help" id="slugHelpText">${SLUG_HELP}</p>
                  </div>

                  <div class="form-field">
                    <label for="authorEmail" class="form-label">Email</label>
                    <input type="email" id="authorEmail" class="form-input" autocomplete="off">
                  </div>
                </div>

                <div>
                  <div class="form-field">
                    <span class="form-label">Avatar</span>
                    <div class="avatar-section">
                      <div class="avatar-preview-container" id="avatar-preview-container">
                        <img id="author-avatar-preview" src="" alt="Avatar del autor" style="display: none;">
                        <div id="avatar-placeholder" class="avatar-placeholder">${icon('user', { size: 40 })}</div>
                      </div>
                      <div>
                        <button type="button" id="edit-avatar-btn" class="btn btn-secondary btn-sm">
                          ${icon('edit', { size: 16 })}<span id="avatar-btn-text">Crear avatar</span>
                        </button>
                        <p class="form-help">Ilustración generada con DiceBear.</p>
                      </div>
                    </div>
                  </div>

                  <div class="form-field">
                    <label for="authorBio" class="form-label">Biografía</label>
                    <textarea id="authorBio" class="form-textarea" rows="5"></textarea>
                  </div>
                </div>
              </div>

              <fieldset class="form-fieldset">
                <legend class="form-label">Redes sociales <span class="text-muted font-normal">(opcional)</span></legend>
                <div class="form-grid">
                  ${SOCIAL_FIELDS.map(field => `
                    <div class="form-field">
                      <label for="social_${field.key}" class="form-label form-label-sm">${escapeHtml(field.label)}</label>
                      <input type="url" id="social_${field.key}" class="form-input" placeholder="${escapeHtml(field.placeholder)}" autocomplete="off">
                    </div>
                  `).join('')}
                </div>
              </fieldset>
            </div>

            <div class="card-footer form-actions">
              <button type="button" id="deleteAuthor" class="btn btn-danger-outline mr-auto" hidden>${icon('trash', { size: 18 })}<span>Eliminar</span></button>
              <button type="button" id="cancelEditAuthor" class="btn btn-secondary">Cancelar</button>
              <button type="submit" id="saveAuthor" class="btn btn-primary">${icon('check', { size: 18 })}<span>Guardar autor</span></button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderAuthorsList() {
    const body = this.container && this.container.querySelector('#authorsTableBody');
    if (!body) return;

    if (this.authors.length === 0) {
      body.innerHTML = `
        <tr><td colspan="4">
          <div class="empty-state">
            <span class="empty-state-icon">${icon('authors', { size: 28 })}</span>
            <p class="empty-state-title">No hay autores</p>
            <p class="empty-state-text">Crea el primero con el botón «Nuevo autor».</p>
          </div>
        </td></tr>
      `;
      return;
    }

    body.innerHTML = this.authors.map(author => {
      // Autores antiguos sin slug: se genera uno temporal solo para la interfaz
      if (!author.slug) author.slug = this.generateSlug(author.name || 'autor-sin-nombre');
      const avatarUrl = attrUrl(author.avatar);
      const slug = escapeHtml(author.slug);
      const name = escapeHtml(author.name || 'Sin nombre');
      return `
        <tr data-slug="${slug}">
          <td>
            <div class="person-cell">
              ${avatarUrl
                ? `<img class="avatar-img author-avatar-img" src="${avatarUrl}" alt="" loading="lazy">`
                : `<span class="avatar" aria-hidden="true">${escapeHtml(initials(author.name))}</span>`}
              <span class="font-medium">${name}</span>
            </div>
          </td>
          <td class="hide-sm"><code class="code-pill">${slug}</code></td>
          <td class="hide-sm text-muted">${escapeHtml(author.email || '—')}</td>
          <td class="text-right nowrap">
            <button type="button" class="btn btn-ghost btn-sm edit-author" data-slug="${slug}" aria-label="Editar ${name}">${icon('edit', { size: 16 })}<span>Editar</span></button>
            <button type="button" class="btn btn-ghost btn-sm text-danger delete-author" data-slug="${slug}" aria-label="Eliminar ${name}">${icon('trash', { size: 16 })}<span class="hide-sm">Eliminar</span></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  showAuthorEditor() {
    this.container.querySelector('.authors-list').hidden = true;
    const editor = this.container.querySelector('.author-editor');
    editor.hidden = false;
    this.loadExistingAvatar(this.currentEditingAuthor);
    scrollIntoViewSafe(editor);
    this.container.querySelector('#authorName')?.focus();
  }

  showAuthorsList() {
    this.container.querySelector('.authors-list').hidden = false;
    this.container.querySelector('.author-editor').hidden = true;
    this.resetForm();
  }

  openAvatarWizard() {
    this.avatarWizard.open(
      this.currentAvatarConfig,
      (config) => {
        this.currentAvatarConfig = config;
        this.updateAvatarPreview(config);
      },
      () => {}
    );
  }

  updateAvatarPreview(config) {
    const preview = this.container.querySelector('#author-avatar-preview');
    const placeholder = this.container.querySelector('#avatar-placeholder');
    const btnText = this.container.querySelector('#avatar-btn-text');

    const url = safeUrl(config && config.url);
    if (preview) {
      preview.style.display = url ? 'block' : 'none';
      if (url) preview.src = url;
      else preview.removeAttribute('src');
    }
    if (placeholder) placeholder.style.display = url ? 'none' : 'flex';
    if (btnText) btnText.textContent = url ? 'Editar avatar' : 'Crear avatar';
  }

  loadExistingAvatar(author) {
    this.currentAvatarConfig = null;
    if (author && author.avatar_config) {
      try {
        const config = typeof author.avatar_config === 'string'
          ? JSON.parse(author.avatar_config)
          : author.avatar_config;
        if (config && typeof config === 'object') {
          this.currentAvatarConfig = config;
          this.updateAvatarPreview(config);
          return;
        }
      } catch (e) {
        console.error('Error al cargar configuración de avatar:', e);
      }
    }
    // Autor con avatar (URL) pero sin configuración del wizard: mostrar la imagen actual
    this.updateAvatarPreview(author && author.avatar ? { url: author.avatar } : null);
  }

  attachEventListeners() {
    const $ = (selector) => this.container.querySelector(selector);

    $('#createAuthorBtn').addEventListener('click', () => {
      this.resetForm();
      this.showAuthorEditor();
    });
    $('.back-to-list-btn').addEventListener('click', () => this.showAuthorsList());
    $('#cancelEditAuthor').addEventListener('click', () => this.showAuthorsList());
    $('#authorForm').addEventListener('submit', (e) => this.handleSaveAuthor(e));
    $('#edit-avatar-btn').addEventListener('click', () => this.openAvatarWizard());
    $('#deleteAuthor').addEventListener('click', () => {
      if (this.currentEditingAuthor) this.confirmDeleteAuthor(this.currentEditingAuthor.slug);
    });

    // Slug automático a partir del nombre (solo autores nuevos y si no se editó a mano)
    const nameInput = $('#authorName');
    const slugInput = $('#authorSlug');
    nameInput.addEventListener('input', () => {
      if (!this.currentEditingAuthor && slugInput.dataset.edited !== 'true') {
        slugInput.value = this.generateSlug(nameInput.value);
      }
    });
    slugInput.addEventListener('input', () => {
      slugInput.dataset.edited = slugInput.value ? 'true' : 'false';
    });

    const tableBody = $('#authorsTableBody');
    // Avatares rotos en la lista: sustituir por las iniciales (sin onerror inline)
    tableBody.addEventListener('error', (e) => {
      const img = e.target;
      if (img.classList && img.classList.contains('author-avatar-img')) {
        const name = img.closest('tr')?.querySelector('.font-medium')?.textContent || '';
        const fallback = document.createElement('span');
        fallback.className = 'avatar';
        fallback.setAttribute('aria-hidden', 'true');
        fallback.textContent = initials(name);
        img.replaceWith(fallback);
      }
    }, true);

    tableBody.addEventListener('click', (e) => {
      const editButton = e.target.closest('.edit-author');
      if (editButton) {
        this.editAuthor(editButton.dataset.slug);
        return;
      }
      const deleteButton = e.target.closest('.delete-author');
      if (deleteButton) this.confirmDeleteAuthor(deleteButton.dataset.slug);
    });
  }

  // Quita tildes: "José Pérez" → "jose-perez"
  generateSlug(name) {
    return slugify(name);
  }

  async handleSaveAuthor(e) {
    e.preventDefault();
    if (this.isLoading) return;

    const $ = (selector) => this.container.querySelector(selector);
    const avatarConfig = this.currentAvatarConfig;

    const socialMedia = {};
    for (const field of SOCIAL_FIELDS) {
      const value = ($(`#social_${field.key}`)?.value || '').trim();
      if (value) socialMedia[field.key] = value;
    }

    const authorData = {
      name: $('#authorName').value.trim(),
      slug: $('#authorSlug').value.trim(),
      email: $('#authorEmail').value.trim(),
      bio: $('#authorBio').value.trim(),
      // Sin configuración del wizard se conserva el avatar actual (no se borra)
      avatar: avatarConfig ? safeUrl(avatarConfig.url) : (this.currentEditingAuthor?.avatar || ''),
      avatar_config: avatarConfig ? JSON.stringify(avatarConfig) : (this.currentEditingAuthor?.avatar_config || ''),
      social_media: Object.keys(socialMedia).length > 0 ? socialMedia : null
    };

    if (!authorData.name || !authorData.slug) {
      notifications.error('El nombre y el slug son obligatorios');
      (authorData.name ? $('#authorSlug') : $('#authorName')).focus();
      return;
    }

    this.setLoading(true);
    try {
      if (this.currentEditingAuthor) {
        // El slug de un autor existente no se cambia
        authorData.slug = this.currentEditingAuthor.slug;
        await this.contentManager.updateAuthor(this.currentEditingAuthor.slug, authorData);
        notifications.success('Autor actualizado correctamente');
      } else {
        await this.contentManager.createAuthor(authorData);
        notifications.success('Autor creado correctamente');
      }
      this.setLoading(false);
      this.showAuthorsList();
      await this.loadAuthors();
    } catch (error) {
      console.error('Error al guardar autor:', error);
      notifications.error(error.message);
    } finally {
      this.setLoading(false);
    }
  }

  editAuthor(slug) {
    const author = this.authors.find(a => a.slug === slug);
    if (!author) {
      notifications.error('Autor no encontrado');
      return;
    }

    this.resetForm();
    this.currentEditingAuthor = author;
    const $ = (selector) => this.container.querySelector(selector);

    $('.author-form-title').textContent = 'Editar autor';
    $('#authorName').value = author.name || '';
    const slugInput = $('#authorSlug');
    slugInput.value = author.slug || '';
    slugInput.readOnly = true;
    $('#slugHelpText').textContent = 'El slug no se puede modificar en autores existentes.';
    $('#authorEmail').value = author.email || '';
    $('#authorBio').value = author.bio || '';

    const socialMedia = parseSocialMedia(author.social_media);
    for (const field of SOCIAL_FIELDS) {
      const input = $(`#social_${field.key}`);
      if (input) input.value = socialMedia[field.key] || '';
    }

    $('#deleteAuthor').hidden = false;
    this.showAuthorEditor();
  }

  async confirmDeleteAuthor(slug) {
    const author = this.authors.find(a => a.slug === slug);
    if (!author) {
      notifications.error('Autor no encontrado');
      return;
    }

    const confirmed = await notifications.confirm(
      `¿Eliminar al autor "${author.name}"? Esta acción no se puede deshacer.`,
      'Eliminar',
      'Cancelar'
    );
    if (confirmed) await this.deleteAuthor(slug);
  }

  async deleteAuthor(slug) {
    this.setLoading(true);
    try {
      await this.contentManager.deleteAuthor(slug);
      notifications.success('Autor eliminado correctamente');
      this.setLoading(false);
      this.showAuthorsList();
      await this.loadAuthors();
    } catch (error) {
      if (error.status === 409 || /utilizad|en uso|in use/i.test(error.message || '')) {
        notifications.error('No se puede eliminar el autor porque firma algunos artículos. Cambia primero el autor de esos artículos.');
      } else {
        notifications.error(`Error al eliminar el autor: ${error.message}`);
      }
    } finally {
      this.setLoading(false);
    }
  }

  resetForm() {
    const $ = (selector) => this.container.querySelector(selector);
    $('#authorForm')?.reset();
    const title = $('.author-form-title');
    if (title) title.textContent = 'Nuevo autor';

    const slugInput = $('#authorSlug');
    if (slugInput) {
      slugInput.readOnly = false;
      slugInput.dataset.edited = 'false';
    }
    const help = $('#slugHelpText');
    if (help) help.textContent = SLUG_HELP;

    const deleteButton = $('#deleteAuthor');
    if (deleteButton) deleteButton.hidden = true;

    this.currentAvatarConfig = null;
    this.updateAvatarPreview(null);
    this.currentEditingAuthor = null;
  }
}
