// src/pages/api/content/authors/[...slug].ts
// GET    /api/content/authors          → { success, authors }
// GET    /api/content/authors/:slug    → { success, author: { ...autor, articles } }
// POST / PUT /:slug / DELETE /:slug    → requieren sesión (ver middleware)
// El email solo se incluye si la petición viene de un usuario autenticado.
import type { APIContext } from 'astro';
import { getDb } from '../../../../db';
import { error, json, NO_STORE, PUBLIC_CACHE, readJson, serverError, slugParam } from '../../../../lib/http';
import { logActivity } from '../../../../lib/repo/activities';
import { countArticlesBy, listArticlesByAuthor, SLUG_RE } from '../../../../lib/repo/articles';
import {
  createAuthor,
  deleteAuthor,
  getAuthorRow,
  listAuthors,
  toAuthorDTO,
  updateAuthor,
  type AuthorInput,
} from '../../../../lib/repo/authors';

export async function GET({ params, locals }: APIContext) {
  const includePrivate = Boolean(locals.user);
  const cache = includePrivate ? NO_STORE : PUBLIC_CACHE;
  try {
    const db = getDb(locals);
    const slug = slugParam(params.slug);
    if (!slug) return json({ success: true, authors: await listAuthors(db, includePrivate) }, { headers: cache });

    const row = await getAuthorRow(db, slug);
    if (!row) return error(404, 'Autor no encontrado');
    const articles = await listArticlesByAuthor(db, row.id);
    return json({ success: true, author: { ...toAuthorDTO(row, includePrivate), articles } }, { headers: cache });
  } catch (err) {
    return serverError('authors:GET', err, 'No se pudieron obtener los autores');
  }
}

export async function POST({ request, locals }: APIContext) {
  const data = await readJson<AuthorInput>(request);
  if (!data?.slug || !data.name) return error(400, 'El slug y el nombre son obligatorios');
  if (!SLUG_RE.test(data.slug)) return error(400, 'El slug solo puede tener minúsculas, números y guiones');
  try {
    const db = getDb(locals);
    if (await getAuthorRow(db, data.slug)) return error(409, 'Ya existe un autor con ese slug');
    const author = await createAuthor(db, data);
    await logActivity(db, locals.user, { type: 'create', entity_type: 'author', entity_id: data.slug, entity_title: author.name });
    return json({ success: true, message: 'Autor creado', author: toAuthorDTO(author, true) }, { status: 201, headers: NO_STORE });
  } catch (err) {
    return serverError('authors:POST', err, 'No se pudo crear el autor');
  }
}

export async function PUT({ params, request, locals }: APIContext) {
  const slug = slugParam(params.slug);
  if (!slug) return error(400, 'Falta el slug del autor');
  const data = await readJson<AuthorInput>(request);
  if (!data || !Object.keys(data).length) return error(400, 'No se enviaron datos para actualizar');
  if (data.slug && data.slug !== slug) return error(400, 'No se puede cambiar el slug de un autor');
  if (data.name !== undefined && !String(data.name).trim()) return error(400, 'El nombre no puede estar vacío');
  try {
    const db = getDb(locals);
    const author = await updateAuthor(db, slug, data);
    if (!author) return error(404, 'Autor no encontrado');
    await logActivity(db, locals.user, { type: 'edit', entity_type: 'author', entity_id: slug, entity_title: author.name });
    return json({ success: true, message: 'Autor actualizado', author: toAuthorDTO(author, true) }, { headers: NO_STORE });
  } catch (err) {
    return serverError('authors:PUT', err, 'No se pudo actualizar el autor');
  }
}

export async function DELETE({ params, locals }: APIContext) {
  const slug = slugParam(params.slug);
  if (!slug) return error(400, 'Falta el slug del autor');
  try {
    const db = getDb(locals);
    const row = await getAuthorRow(db, slug);
    if (!row) return error(404, 'Autor no encontrado');
    const count = await countArticlesBy(db, 'author', row.id);
    if (count > 0) return error(409, `No se puede eliminar: el autor tiene ${count} artículo(s) asociado(s)`);
    await deleteAuthor(db, slug);
    await logActivity(db, locals.user, { type: 'delete', entity_type: 'author', entity_id: slug, entity_title: row.name });
    return json({ success: true, message: 'Autor eliminado', slug }, { headers: NO_STORE });
  } catch (err) {
    return serverError('authors:DELETE', err, 'No se pudo eliminar el autor');
  }
}
