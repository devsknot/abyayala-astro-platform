// src/pages/api/content/articles/search.ts
// GET /api/content/articles/search?query=&category=&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&page=&pageSize=
import type { APIContext } from 'astro';
import { getDb } from '../../../../db';
import { clampInt, json, PUBLIC_CACHE, serverError } from '../../../../lib/http';
import { searchArticles } from '../../../../lib/repo/articles';

export async function GET({ url, locals }: APIContext) {
  const p = url.searchParams;
  try {
    const result = await searchArticles(getDb(locals), {
      query: (p.get('query') || '').slice(0, 200),
      category: p.get('category') || undefined,
      dateFrom: p.get('dateFrom') || undefined,
      dateTo: p.get('dateTo') || undefined,
      page: clampInt(p.get('page'), 1, 1, 10_000),
      pageSize: clampInt(p.get('pageSize'), 10, 1, 50),
    });
    return json({ success: true, ...result }, { headers: PUBLIC_CACHE });
  } catch (err) {
    return serverError('articles:search', err, 'No se pudo realizar la búsqueda');
  }
}
