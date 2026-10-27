// src/lib/repo/stats.ts
// Métricas del dashboard del panel. Todo se calcula con consultas agregadas en D1.
import { sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { listActivities } from './activities';

type Row = Record<string, unknown>;

const num = (v: unknown) => Number(v ?? 0) || 0;

async function rows(db: Database, query: ReturnType<typeof sql>): Promise<Row[]> {
  return (await db.all(query)) as Row[];
}

export async function getContentStats(db: Database) {
  const [counts, health, byCategory, byYear, recentArticles, largestArticles, recentActivity] = await Promise.all([
    rows(
      db,
      sql`SELECT (SELECT count(*) FROM articles) AS articles,
                 (SELECT count(*) FROM authors) AS authors,
                 (SELECT count(*) FROM categories) AS categories`,
    ),
    rows(
      db,
      sql`SELECT
            sum(coalesce(a.featured_image, '') = '') AS withoutImage,
            sum(a.featured_image LIKE 'media/uploads/%') AS legacyBrokenImage,
            sum(coalesce(a.description, '') = '') AS withoutDescription,
            sum(au.id IS NULL) AS withoutAuthor,
            sum(c.id IS NULL) AS uncategorized,
            sum(instr(coalesce(a.content, ''), 'data:image') > 0) AS base64Images
          FROM articles a
          LEFT JOIN authors au ON au.id = a.author_id
          LEFT JOIN categories c ON c.id = a.category`,
    ),
    rows(
      db,
      sql`SELECT c.id, c.name, count(a.id) AS count
          FROM categories c LEFT JOIN articles a ON a.category = c.id
          GROUP BY c.id, c.name
          ORDER BY count DESC, c.name ASC`,
    ),
    rows(
      db,
      sql`SELECT substr(pub_date, 1, 4) AS year, count(*) AS count
          FROM articles
          WHERE pub_date GLOB '[0-9][0-9][0-9][0-9]*'
          GROUP BY year ORDER BY year ASC`,
    ),
    rows(
      db,
      sql`SELECT slug, title, pub_date AS pubDate, category, updated_at
          FROM articles ORDER BY updated_at DESC, id DESC LIMIT 6`,
    ),
    rows(
      db,
      sql`SELECT slug, title, round(length(coalesce(content, '')) / 1024.0, 1) AS kb
          FROM articles ORDER BY length(coalesce(content, '')) DESC LIMIT 5`,
    ),
    listActivities(db, { limit: 10, offset: 0 }),
  ]);

  const c = counts[0] ?? {};
  const h = health[0] ?? {};
  return {
    totals: { articles: num(c.articles), authors: num(c.authors), categories: num(c.categories) },
    health: {
      withoutImage: num(h.withoutImage),
      legacyBrokenImage: num(h.legacyBrokenImage),
      withoutDescription: num(h.withoutDescription),
      withoutAuthor: num(h.withoutAuthor),
      uncategorized: num(h.uncategorized),
      base64Images: num(h.base64Images),
    },
    byCategory: byCategory.map((r) => ({ id: String(r.id), name: String(r.name), count: num(r.count) })),
    byYear: byYear.map((r) => ({ year: Number(r.year), count: num(r.count) })),
    recentArticles: recentArticles.map((r) => ({
      slug: String(r.slug),
      title: String(r.title ?? ''),
      pubDate: (r.pubDate as string) ?? null,
      category: (r.category as string) ?? '',
      updated_at: (r.updated_at as string) ?? null,
    })),
    largestArticles: largestArticles.map((r) => ({ slug: String(r.slug), title: String(r.title ?? ''), kb: num(r.kb) })),
    recentActivity,
  };
}

/** Cuenta archivos y bytes del bucket (máx. 5 páginas de 1000 objetos). */
export async function getMediaStats(bucket: { list: (o: { limit: number; cursor?: string }) => Promise<any> }) {
  let count = 0;
  let bytes = 0;
  let cursor: string | undefined;
  for (let page = 0; page < 5; page++) {
    const listed = await bucket.list({ limit: 1000, cursor });
    for (const o of listed.objects) {
      count++;
      bytes += o.size;
    }
    if (!listed.truncated) return { count, bytes, truncated: false };
    cursor = listed.cursor;
  }
  return { count, bytes, truncated: true };
}
