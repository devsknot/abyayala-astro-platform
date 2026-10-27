// src/lib/repo/maintenance.ts
// Reparaciones de datos que lanza un editor desde el dashboard. Cada una se puede ejecutar
// en modo vista previa (apply = false) para saber qué cambiaría antes de tocar la base.
import { eq, sql } from 'drizzle-orm';
import type { R2Bucket } from '@cloudflare/workers-types';
import type { Database } from '../../db';
import { articles } from '../../db/schema';
import { detectImageType, generateKey } from '../media';

export const MAINTENANCE_ACTIONS = ['images', 'descriptions', 'authors', 'base64'] as const;
export type MaintenanceAction = (typeof MAINTENANCE_ACTIONS)[number];

export interface MaintenanceResult {
  action: MaintenanceAction;
  applied: boolean;
  /** Artículos que cambian (o cambiarían). */
  affected: number;
  /** Desglose legible para mostrar en el panel. */
  summary: { label: string; count: number }[];
  /** Solo para `authors`: opciones para elegir el autor. */
  authors?: { id: number; name: string; articles: number }[];
}

const LEGACY_PREFIX = 'media/uploads/';
const DESCRIPTION_LENGTH = 160;

type Update = { id: number; set: Partial<typeof articles.$inferInsert> };

async function applyUpdates(db: Database, updates: Update[]) {
  // D1 limita el tamaño de cada lote; se envía por tramos.
  for (let i = 0; i < updates.length; i += 50) {
    const chunk = updates.slice(i, i + 50).map((u) =>
      db
        .update(articles)
        .set({ ...u.set, updatedAt: sql`(datetime('now'))` })
        .where(eq(articles.id, u.id)),
    );
    if (chunk.length) await db.batch(chunk as [typeof chunk[number], ...typeof chunk]);
  }
}

async function listKeys(bucket: R2Bucket) {
  const keys = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const listed = await bucket.list({ limit: 1000, cursor });
    for (const o of listed.objects) keys.add(o.key);
    if (!listed.truncated) break;
    cursor = listed.cursor;
  }
  return keys;
}

/** Primera imagen utilizable del HTML del artículo (absoluta http(s) o de la biblioteca). */
export function firstContentImage(html: string | null): string | null {
  if (!html) return null;
  const re = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
  for (const match of html.matchAll(re)) {
    const src = match[1].trim().replace(/&amp;/g, '&');
    if (src.startsWith('/api/media/')) return src;
    if (/^https?:\/\//i.test(src)) return src.replace(/^http:\/\//i, 'https://');
    if (src.startsWith('//')) return `https:${src}`;
  }
  return null;
}

/**
 * Imágenes destacadas rotas (rutas `media/uploads/…` de Blogger) o vacías:
 *  1. si el archivo existe en R2 con ese nombre, se enlaza;
 *  2. si no, se usa la primera imagen del contenido;
 *  3. si no hay ninguna, se deja vacía y el sitio muestra la imagen genérica.
 */
async function repairImages(db: Database, bucket: R2Bucket | undefined, apply: boolean): Promise<MaintenanceResult> {
  const rows = await db
    .select({ id: articles.id, featuredImage: articles.featuredImage, content: articles.content })
    .from(articles)
    .where(sql`coalesce(${articles.featuredImage}, '') = '' OR ${articles.featuredImage} LIKE ${LEGACY_PREFIX + '%'}`);

  // Una sola lista del bucket en lugar de una consulta por artículo (límite de subpeticiones).
  const keys = rows.some((r) => r.featuredImage) && bucket ? await listKeys(bucket) : null;
  let fromR2 = 0;
  let fromContent = 0;
  let cleared = 0;
  const updates: Update[] = [];

  for (const row of rows) {
    const current = (row.featuredImage ?? '').trim();
    let next: string | null = null;

    if (current && keys) {
      const file = current.slice(LEGACY_PREFIX.length);
      for (const key of [current, `uploads/${file}`, file]) {
        if (key && keys.has(key)) {
          next = `/api/media/${key}`;
          fromR2++;
          break;
        }
      }
    }
    if (!next) {
      next = firstContentImage(row.content);
      if (next) fromContent++;
    }
    if (next) {
      updates.push({ id: row.id, set: { featuredImage: next } });
    } else if (current) {
      cleared++;
      updates.push({ id: row.id, set: { featuredImage: null } });
    }
  }

  if (apply) await applyUpdates(db, updates);
  return {
    action: 'images',
    applied: apply,
    affected: updates.length,
    summary: [
      { label: 'Recuperadas desde la biblioteca de medios', count: fromR2 },
      { label: 'Tomadas de la primera imagen del artículo', count: fromContent },
      { label: 'Sin imagen disponible: usarán la portada genérica', count: cleared },
    ],
  };
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** Resumen de texto plano a partir del HTML, cortado en una palabra completa. */
export function excerpt(html: string | null, length = DESCRIPTION_LENGTH): string {
  if (!html) return '';
  const text = decodeEntities(
    html
      .replace(/<(script|style|figcaption)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= length) return text;
  const cut = text.slice(0, length + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : text.slice(0, length)).replace(/[\s,;:.–—-]+$/, '')}…`;
}

async function repairDescriptions(db: Database, apply: boolean): Promise<MaintenanceResult> {
  const rows = await db
    .select({ id: articles.id, title: articles.title, content: articles.content })
    .from(articles)
    .where(sql`coalesce(trim(${articles.description}), '') = ''`);

  const updates: Update[] = [];
  let fromTitle = 0;
  for (const row of rows) {
    // Afiches o videos sin texto: el título es lo único que describe el artículo.
    let description = excerpt(row.content);
    if (!description) {
      description = excerpt(row.title);
      if (description) fromTitle++;
    }
    if (description) updates.push({ id: row.id, set: { description } });
  }

  if (apply) await applyUpdates(db, updates);
  return {
    action: 'descriptions',
    applied: apply,
    affected: updates.length,
    summary: [
      { label: 'Generadas con el inicio del texto', count: updates.length - fromTitle },
      { label: 'Sin texto en el artículo: se usa el título', count: fromTitle },
    ],
  };
}

const ORPHAN_AUTHOR = sql`(${articles.authorId} IS NULL OR ${articles.authorId} NOT IN (SELECT id FROM authors))`;

async function repairAuthors(db: Database, apply: boolean, authorId: number | null): Promise<MaintenanceResult> {
  const [{ count }] = (await db.all(sql`SELECT count(*) AS count FROM articles WHERE ${ORPHAN_AUTHOR}`)) as { count: number }[];
  const options = (await db.all(
    sql`SELECT au.id, au.name, count(a.id) AS articles
        FROM authors au LEFT JOIN articles a ON a.author_id = au.id
        GROUP BY au.id, au.name ORDER BY articles DESC, au.name ASC`,
  )) as { id: number; name: string; articles: number }[];

  if (apply) {
    if (!authorId || !options.some((o) => o.id === authorId)) throw new MaintenanceError('Elige un autor válido');
    await db
      .update(articles)
      .set({ authorId, updatedAt: sql`(datetime('now'))` })
      .where(ORPHAN_AUTHOR);
  }

  const chosen = options.find((o) => o.id === authorId);
  return {
    action: 'authors',
    applied: apply,
    affected: Number(count) || 0,
    summary: [{ label: chosen ? `Se asignarán a ${chosen.name}` : 'Artículos sin autor válido', count: Number(count) || 0 }],
    authors: options.map((o) => ({ id: Number(o.id), name: String(o.name), articles: Number(o.articles) || 0 })),
  };
}

const BASE64_IMG = /data:image\/[a-z0-9.+-]+;base64,([a-z0-9+/=\s]+)/gi;
// Cualquier otra imagen incrustada (SVG en texto, datos truncados…): el sanitizador ya no la
// muestra en el sitio, así que solo ocupa espacio.
const OTHER_DATA_IMG = /data:image\/[^"')\s>]*/gi;

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Sube a R2 las imágenes pegadas como base64 dentro del HTML y las sustituye por su URL. */
async function repairBase64(
  db: Database,
  bucket: R2Bucket | undefined,
  apply: boolean,
  uploadedBy: string,
): Promise<MaintenanceResult> {
  if (apply && !bucket) throw new Error('El binding R2_BUCKET no está configurado');
  const rows = await db
    .select({ id: articles.id, slug: articles.slug, content: articles.content })
    .from(articles)
    .where(sql`instr(coalesce(${articles.content}, ''), 'data:image') > 0`);

  let images = 0;
  let invalid = 0;
  const updates: Update[] = [];

  for (const row of rows) {
    let content = row.content ?? '';
    let changed = false;
    // Se recorren en orden inverso para que los índices sigan siendo válidos al reemplazar.
    const matches = [...content.matchAll(BASE64_IMG)].reverse();
    for (const match of matches) {
      const data = decodeBase64(match[1]);
      const kind = data && detectImageType(data);
      const start = match.index ?? 0;
      if (!data || !kind) {
        invalid++;
        if (apply) {
          content = content.slice(0, start) + content.slice(start + match[0].length);
          changed = true;
        }
        continue;
      }
      images++;
      if (!apply || !bucket) continue;
      const key = generateKey(row.slug, kind.ext);
      await bucket.put(key, data, {
        httpMetadata: { contentType: kind.type, cacheControl: 'public, max-age=31536000, immutable' },
        customMetadata: { originalName: `${row.slug}.${kind.ext}`, uploadedBy },
      });
      content = `${content.slice(0, start)}/api/media/${key}${content.slice(start + match[0].length)}`;
      changed = true;
    }
    // En la vista previa las base64 siguen en el texto; al aplicar ya se reemplazaron.
    const others = (content.match(OTHER_DATA_IMG)?.length ?? 0) - (apply ? 0 : matches.length);
    if (others > 0) {
      invalid += others;
      if (apply) {
        content = content.replace(OTHER_DATA_IMG, '');
        changed = true;
      }
    }
    if (changed) updates.push({ id: row.id, set: { content } });
  }

  if (apply) await applyUpdates(db, updates);
  return {
    action: 'base64',
    applied: apply,
    affected: apply ? updates.length : rows.length,
    summary: [
      { label: 'Imágenes que se suben a la biblioteca de medios', count: images },
      { label: 'Imágenes dañadas o no visibles en el sitio: se eliminan', count: invalid },
    ],
  };
}

export class MaintenanceError extends Error {}

export function runMaintenance(
  db: Database,
  bucket: R2Bucket | undefined,
  input: { action: MaintenanceAction; apply: boolean; authorId?: number | null; user?: string },
): Promise<MaintenanceResult> {
  switch (input.action) {
    case 'images':
      return repairImages(db, bucket, input.apply);
    case 'descriptions':
      return repairDescriptions(db, input.apply);
    case 'authors':
      return repairAuthors(db, input.apply, input.authorId ?? null);
    case 'base64':
      return repairBase64(db, bucket, input.apply, input.user ?? '');
  }
}

