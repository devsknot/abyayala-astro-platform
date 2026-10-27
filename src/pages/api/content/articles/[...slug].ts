// src/pages/api/content/articles/[...slug].ts
// GET    /api/content/articles?page=&pageSize=&category=  → listado paginado (sin `content`)
// GET    /api/content/articles/:slug                       → artículo completo (objeto sin envolver)
// POST   /api/content/articles                             → crear   (requiere sesión, ver middleware)
// PUT    /api/content/articles/:slug                       → editar  (requiere sesión)
// DELETE /api/content/articles/:slug                       → borrar  (requiere sesión)
import type { APIContext } from 'astro';
import { getDb } from '../../../../db';
import { clampInt, error, json, NO_STORE, PUBLIC_CACHE, readJson, serverError, slugParam } from '../../../../lib/http';
import { logActivity } from '../../../../lib/repo/activities';
import {
  articleExists,
  createArticle,
  deleteArticle,
  getArticleBySlug,
  listArticles,
  SLUG_RE,
  updateArticle,
  type ArticleInput,
} from '../../../../lib/repo/articles';

export async function GET({ params, url, locals }: APIContext) {
  try {
    const db = getDb(locals);
    const slug = slugParam(params.slug);
    if (slug) {
      const article = await getArticleBySlug(db, slug);
      if (!article) return error(404, 'Artículo no encontrado');
      return json(article, { headers: PUBLIC_CACHE });
    }
    const result = await listArticles(db, {
      page: clampInt(url.searchParams.get('page'), 1, 1, 10_000),
      pageSize: clampInt(url.searchParams.get('pageSize'), 10, 1, 100),
      category: url.searchParams.get('category') || undefined,
    });
    return json({ success: true, ...result }, { headers: PUBLIC_CACHE });
  } catch (err) {
    return serverError('articles:GET', err, 'No se pudieron obtener los artículos');
  }
}

export async function POST({ request, locals }: APIContext) {
  const data = await readJson<ArticleInput>(request);
  if (!data?.slug || !data.title) return error(400, 'El slug y el título son obligatorios');
  if (!SLUG_RE.test(data.slug)) return error(400, 'El slug solo puede tener minúsculas, números y guiones');
  try {
    const db = getDb(locals);
    if (await articleExists(db, data.slug)) return error(409, 'Ya existe un artículo con ese slug');
    const article = await createArticle(db, data);
    await logActivity(db, locals.user, { type: 'create', entity_type: 'article', entity_id: data.slug, entity_title: article?.title });
    return json({ success: true, message: 'Artículo creado', article }, { status: 201, headers: NO_STORE });
  } catch (err) {
    return serverError('articles:POST', err, 'No se pudo crear el artículo');
  }
}

export async function PUT({ params, request, locals }: APIContext) {
  const slug = slugParam(params.slug);
  if (!slug) return error(400, 'Falta el slug del artículo');
  const data = await readJson<ArticleInput>(request);
  if (!data || !Object.keys(data).length) return error(400, 'No se enviaron datos para actualizar');
  if (data.slug && data.slug !== slug) return error(400, 'No se puede cambiar el slug de un artículo');
  if (data.title !== undefined && !String(data.title).trim()) return error(400, 'El título no puede estar vacío');
  try {
    const db = getDb(locals);
    if (!(await articleExists(db, slug))) return error(404, 'Artículo no encontrado');
    const article = await updateArticle(db, slug, data);
    await logActivity(db, locals.user, { type: 'edit', entity_type: 'article', entity_id: slug, entity_title: article?.title });
    return json({ success: true, message: 'Artículo actualizado', article }, { headers: NO_STORE });
  } catch (err) {
    return serverError('articles:PUT', err, 'No se pudo actualizar el artículo');
  }
}

export async function DELETE({ params, locals }: APIContext) {
  const slug = slugParam(params.slug);
  if (!slug) return error(400, 'Falta el slug del artículo');
  try {
    const db = getDb(locals);
    if (!(await deleteArticle(db, slug))) return error(404, 'Artículo no encontrado');
    await logActivity(db, locals.user, { type: 'delete', entity_type: 'article', entity_id: slug, entity_title: slug });
    return json({ success: true, message: 'Artículo eliminado', slug }, { headers: NO_STORE });
  } catch (err) {
    return serverError('articles:DELETE', err, 'No se pudo eliminar el artículo');
  }
}
