// src/pages/api/content/categories/[...slug].ts
// GET    /api/content/categories        → { success, categories }
// GET    /api/content/categories/:id    → { success, category }
// POST / PUT /:id / DELETE /:id         → requieren sesión (ver middleware)
// El identificador de una categoría es su slug (columna `id`).
import type { APIContext } from 'astro';
import { getDb } from '../../../../db';
import { error, json, NO_STORE, PUBLIC_CACHE, readJson, serverError, slugParam } from '../../../../lib/http';
import { logActivity } from '../../../../lib/repo/activities';
import { countArticlesBy, SLUG_RE } from '../../../../lib/repo/articles';
import {
  createCategory,
  deleteCategory,
  getCategory,
  listCategories,
  updateCategory,
  type CategoryInput,
} from '../../../../lib/repo/categories';

export async function GET({ params, locals }: APIContext) {
  try {
    const db = getDb(locals);
    const id = slugParam(params.slug);
    if (!id) return json({ success: true, categories: await listCategories(db) }, { headers: PUBLIC_CACHE });
    const category = await getCategory(db, id);
    if (!category) return error(404, 'Categoría no encontrada');
    return json({ success: true, category }, { headers: PUBLIC_CACHE });
  } catch (err) {
    return serverError('categories:GET', err, 'No se pudieron obtener las categorías');
  }
}

export async function POST({ request, locals }: APIContext) {
  const data = await readJson<CategoryInput>(request);
  const id = (data?.slug || data?.id || '').trim();
  if (!id || !data?.name?.trim()) return error(400, 'El slug y el nombre son obligatorios');
  if (!SLUG_RE.test(id)) return error(400, 'El slug solo puede tener minúsculas, números y guiones');
  try {
    const db = getDb(locals);
    if (await getCategory(db, id)) return error(409, 'Ya existe una categoría con ese slug');
    const category = await createCategory(db, id, data);
    await logActivity(db, locals.user, { type: 'create', entity_type: 'category', entity_id: id, entity_title: category.name });
    return json({ success: true, message: 'Categoría creada', category }, { status: 201, headers: NO_STORE });
  } catch (err) {
    return serverError('categories:POST', err, 'No se pudo crear la categoría');
  }
}

export async function PUT({ params, request, locals }: APIContext) {
  const id = slugParam(params.slug);
  if (!id) return error(400, 'Falta el slug de la categoría');
  const data = await readJson<CategoryInput>(request);
  if (!data || (data.name === undefined && data.description === undefined)) {
    return error(400, 'No se enviaron datos para actualizar');
  }
  if (data.slug && data.slug !== id) return error(400, 'No se puede cambiar el slug de una categoría');
  if (data.name !== undefined && !data.name.trim()) return error(400, 'El nombre no puede estar vacío');
  try {
    const db = getDb(locals);
    if (!(await getCategory(db, id))) return error(404, 'Categoría no encontrada');
    const category = await updateCategory(db, id, data);
    await logActivity(db, locals.user, { type: 'edit', entity_type: 'category', entity_id: id, entity_title: category?.name });
    return json({ success: true, message: 'Categoría actualizada', category }, { headers: NO_STORE });
  } catch (err) {
    return serverError('categories:PUT', err, 'No se pudo actualizar la categoría');
  }
}

export async function DELETE({ params, locals }: APIContext) {
  const id = slugParam(params.slug);
  if (!id) return error(400, 'Falta el slug de la categoría');
  try {
    const db = getDb(locals);
    const category = await getCategory(db, id);
    if (!category) return error(404, 'Categoría no encontrada');
    const count = await countArticlesBy(db, 'category', id);
    if (count > 0) return error(409, `No se puede eliminar: hay ${count} artículo(s) en esta categoría`);
    await deleteCategory(db, id);
    await logActivity(db, locals.user, { type: 'delete', entity_type: 'category', entity_id: id, entity_title: category.name });
    return json({ success: true, message: 'Categoría eliminada', slug: id }, { headers: NO_STORE });
  } catch (err) {
    return serverError('categories:DELETE', err, 'No se pudo eliminar la categoría');
  }
}
