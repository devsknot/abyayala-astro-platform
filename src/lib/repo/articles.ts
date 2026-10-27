// src/lib/repo/articles.ts
// Acceso a datos de artículos. Lo usan tanto los endpoints de la API como las
// páginas SSR (que ya no se llaman a sí mismas por HTTP).
import { and, desc, eq, gte, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '../../db';
import { articles, authors } from '../../db/schema';
import { sanitizeHtml, stripHtml } from '../sanitize';

export interface ArticleDTO {
  id: number;
  slug: string;
  title: string;
  description: string;
  content?: string;
  pubDate: string;
  category: string;
  featured_image: string;
  author: string;
  author_id: number | null;
  author_info: { id: number; name: string; slug: string; avatar: string } | null;
  tags: string[];
  updated_at: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ArticleInput {
  slug?: string;
  title?: string;
  description?: string;
  content?: string;
  pubDate?: string;
  category?: string;
  featured_image?: string;
  author_id?: number | string | null;
  tags?: unknown;
}

const DEFAULT_AUTHOR = 'Colectivo Abya Yala';

// Columnas de listado: todo menos `content` (hay artículos de cientos de KB).
const listColumns = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  description: articles.description,
  pubDate: articles.pubDate,
  category: articles.category,
  featuredImage: articles.featuredImage,
  tags: articles.tags,
  authorId: articles.authorId,
  updatedAt: articles.updatedAt,
  authorName: authors.name,
  authorSlug: authors.slug,
  authorAvatar: authors.avatar,
};

type ListRow = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  pubDate: string | null;
  category: string | null;
  featuredImage: string | null;
  tags: string | null;
  authorId: number | null;
  updatedAt: string | null;
  authorName: string | null;
  authorSlug: string | null;
  authorAvatar: string | null;
  content?: string | null;
};

export function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  const value = raw.trim();
  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      /* se trata como lista separada por comas */
    }
  }
  return value.split(',').map((t) => t.trim()).filter(Boolean);
}

function toDTO(row: ListRow): ArticleDTO {
  // Un author_id que apunta a un autor borrado se trata como "sin autor".
  const hasAuthor = row.authorId != null && row.authorName != null;
  const dto: ArticleDTO = {
    id: row.id,
    slug: row.slug,
    title: row.title || 'Sin título',
    description: row.description || '',
    pubDate: row.pubDate || row.updatedAt || '',
    category: row.category || '',
    featured_image: row.featuredImage || '',
    author: hasAuthor ? row.authorName! : DEFAULT_AUTHOR,
    author_id: hasAuthor ? row.authorId : null,
    author_info: hasAuthor
      ? { id: row.authorId!, name: row.authorName!, slug: row.authorSlug || '', avatar: row.authorAvatar || '' }
      : null,
    tags: parseTags(row.tags),
    updated_at: row.updatedAt || row.pubDate || '',
  };
  if (row.content !== undefined) dto.content = sanitizeHtml(row.content);
  return dto;
}

function buildPagination(page: number, pageSize: number, totalItems: number): Pagination {
  const totalPages = Math.ceil(totalItems / pageSize);
  return { page, pageSize, totalItems, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
}

function baseList(db: Database, withContent = false) {
  return db
    .select(withContent ? { ...listColumns, content: articles.content } : listColumns)
    .from(articles)
    .leftJoin(authors, eq(articles.authorId, authors.id));
}

async function paginated(db: Database, where: SQL | undefined, page: number, pageSize: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(articles).where(where);
  const rows = await baseList(db)
    .where(where)
    .orderBy(desc(articles.pubDate), desc(articles.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { articles: rows.map(toDTO), pagination: buildPagination(page, pageSize, count) };
}

export interface ListOptions {
  page?: number;
  pageSize?: number;
  category?: string;
}

export function listArticles(db: Database, { page = 1, pageSize = 10, category }: ListOptions = {}) {
  const where = category ? eq(sql`lower(${articles.category})`, category.trim().toLowerCase()) : undefined;
  return paginated(db, where, page, pageSize);
}

export interface SearchOptions {
  query?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function searchArticles(db: Database, opts: SearchOptions) {
  const conditions: SQL[] = [];
  const query = opts.query?.trim();
  if (query) {
    // Se escapan los comodines de LIKE para buscar el texto literal.
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(
        sql`${articles.title} LIKE ${pattern} ESCAPE '\\'`,
        sql`${articles.description} LIKE ${pattern} ESCAPE '\\'`,
        sql`${articles.content} LIKE ${pattern} ESCAPE '\\'`,
      )!,
    );
  }
  if (opts.category) conditions.push(eq(sql`lower(${articles.category})`, opts.category.trim().toLowerCase()));
  if (opts.dateFrom && DATE_RE.test(opts.dateFrom)) conditions.push(gte(articles.pubDate, opts.dateFrom));
  if (opts.dateTo && DATE_RE.test(opts.dateTo)) conditions.push(lte(articles.pubDate, `${opts.dateTo}T23:59:59.999Z`));
  return paginated(db, conditions.length ? and(...conditions) : undefined, opts.page ?? 1, opts.pageSize ?? 10);
}

export async function getArticleBySlug(db: Database, slug: string): Promise<ArticleDTO | null> {
  const [row] = await baseList(db, true).where(eq(articles.slug, slug)).limit(1);
  return row ? toDTO(row) : null;
}

export async function getRelatedArticles(db: Database, category: string, excludeSlug: string, limit = 3) {
  if (!category) return [];
  const rows = await baseList(db)
    .where(and(eq(articles.category, category), ne(articles.slug, excludeSlug)))
    .orderBy(desc(articles.pubDate))
    .limit(limit);
  return rows.map(toDTO);
}

export async function listArticlesByAuthor(db: Database, authorId: number) {
  const rows = await baseList(db).where(eq(articles.authorId, authorId)).orderBy(desc(articles.pubDate));
  return rows.map(toDTO);
}

/** Todos los artículos (sin contenido) para RSS y sitemap. */
export async function listAllArticles(db: Database) {
  const rows = await baseList(db).orderBy(desc(articles.pubDate));
  return rows.map(toDTO);
}

export async function articleExists(db: Database, slug: string) {
  const [row] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug)).limit(1);
  return Boolean(row);
}

function toIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toAuthorId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Convierte la entrada del panel en columnas, saneando el HTML. Solo incluye los campos presentes. */
function toColumns(input: ArticleInput) {
  const values: Partial<typeof articles.$inferInsert> = {};
  if (input.title !== undefined) values.title = stripHtml(input.title);
  if (input.description !== undefined) values.description = stripHtml(input.description);
  if (input.content !== undefined) values.content = sanitizeHtml(input.content);
  if (input.category !== undefined) values.category = (input.category || '').trim();
  if (input.featured_image !== undefined) values.featuredImage = (input.featured_image || '').trim();
  if (input.author_id !== undefined) values.authorId = toAuthorId(input.author_id);
  if (input.tags !== undefined) values.tags = JSON.stringify(parseTags(input.tags));
  if (input.pubDate !== undefined) {
    const iso = toIsoDate(input.pubDate);
    if (iso) values.pubDate = iso;
  }
  return values;
}

export async function createArticle(db: Database, input: ArticleInput) {
  const values = toColumns(input);
  await db.insert(articles).values({
    ...values,
    slug: input.slug!,
    title: values.title!,
    pubDate: values.pubDate ?? new Date().toISOString(),
    tags: values.tags ?? '[]',
  });
  return getArticleBySlug(db, input.slug!);
}

export async function updateArticle(db: Database, slug: string, input: ArticleInput) {
  const values = toColumns(input);
  await db
    .update(articles)
    .set({ ...values, updatedAt: sql`(datetime('now'))` })
    .where(eq(articles.slug, slug));
  return getArticleBySlug(db, slug);
}

export async function deleteArticle(db: Database, slug: string) {
  const deleted = await db.delete(articles).where(eq(articles.slug, slug)).returning({ id: articles.id });
  return deleted.length > 0;
}

export async function countArticlesBy(db: Database, column: 'category' | 'author', value: string | number) {
  const where = column === 'category' ? eq(articles.category, String(value)) : eq(articles.authorId, Number(value));
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(articles).where(where);
  return count;
}
