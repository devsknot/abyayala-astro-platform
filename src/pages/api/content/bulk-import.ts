// src/pages/api/content/bulk-import.ts
// POST /api/content/bulk-import  { articles: [{ title, slug?, content, description?, category?,
//   author?, authorBio?, pubDate?, featured_image? | image_url?, tags? }] }   (requiere sesión)
// → { success, total, processed, successfulArticles, errors, authors: { created, linked } }
import type { APIContext } from 'astro';
import { getDb } from '../../../db';
import { error, json, NO_STORE, readJson } from '../../../lib/http';
import { logActivity } from '../../../lib/repo/activities';
import { articleExists, createArticle, slugify } from '../../../lib/repo/articles';
import { findOrCreateAuthor } from '../../../lib/repo/authors';
import { listCategories } from '../../../lib/repo/categories';

const MAX_ARTICLES = 200;

interface ImportArticle {
  title?: string;
  slug?: string;
  content?: string;
  description?: string;
  category?: string;
  author?: string;
  authorBio?: string;
  pubDate?: string;
  featured_image?: string;
  image_url?: string;
  tags?: unknown;
}

type Ref = { name: string; slug: string; id: number };

export async function POST({ request, locals }: APIContext) {
  const body = await readJson<{ articles?: ImportArticle[] }>(request);
  const items = body?.articles;
  if (!Array.isArray(items) || items.length === 0) return error(400, 'Formato inválido. Se esperaba { "articles": [...] }');
  if (items.length > MAX_ARTICLES) return error(413, `Máximo ${MAX_ARTICLES} artículos por importación`);

  const db = getDb(locals);
  const knownCategories = new Set((await listCategories(db)).map((c) => c.id));
  const successfulArticles: { title: string; slug: string; id: number }[] = [];
  const errors: { title: string; slug?: string; error: string }[] = [];
  const created: Ref[] = [];
  const linked: Ref[] = [];

  for (const item of items) {
    const title = (item?.title || '').trim();
    if (!title) {
      errors.push({ title: '(sin título)', error: 'El título es obligatorio' });
      continue;
    }
    const slug = slugify(item.slug || title);
    try {
      if (!slug) throw new Error('No se pudo generar un slug válido');
      if (await articleExists(db, slug)) {
        errors.push({ title, slug, error: `Ya existe un artículo con el slug "${slug}"` });
        continue;
      }

      const category = item.category ? slugify(item.category) : '';
      if (category && !knownCategories.has(category)) {
        errors.push({ title, slug, error: `La categoría "${category}" no existe; créala antes de importar` });
        continue;
      }

      let authorId: number | null = null;
      const authorName = item.author?.trim();
      if (authorName) {
        const { author, created: isNew } = await findOrCreateAuthor(
          db,
          authorName,
          slugify(authorName),
          item.authorBio || '',
        );
        authorId = author.id;
        const list = isNew ? created : linked;
        if (!list.some((a) => a.id === author.id)) list.push({ name: author.name, slug: author.slug, id: author.id });
      }

      const article = await createArticle(db, {
        slug,
        title,
        content: item.content || '',
        description: item.description || '',
        category,
        featured_image: item.featured_image || item.image_url || '',
        author_id: authorId,
        pubDate: item.pubDate,
        tags: item.tags ?? [],
      });
      successfulArticles.push({ title, slug, id: article!.id });
    } catch (err) {
      console.error('[bulk-import]', slug, err);
      errors.push({ title, slug, error: 'Error al guardar el artículo' });
    }
  }

  await logActivity(db, locals.user, {
    type: 'bulk_import',
    entity_type: 'article',
    entity_title: `${successfulArticles.length} artículos importados`,
    details: { total: items.length, errors: errors.length },
  });

  return json(
    {
      success: true,
      total: items.length,
      processed: successfulArticles.length,
      successfulArticles,
      errors,
      authors: { created, linked },
    },
    { headers: NO_STORE },
  );
}
