// src/lib/repo/authors.ts
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { authors, type Author } from '../../db/schema';
import { stripHtml } from '../sanitize';
import { safeUrl } from '../url';

export interface AuthorDTO {
  id: number;
  slug: string;
  name: string;
  bio: string;
  email?: string;
  avatar: string;
  avatar_config: string | null;
  social_media: Record<string, string> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AuthorInput {
  slug?: string;
  name?: string;
  bio?: string;
  email?: string;
  avatar?: string;
  avatar_config?: unknown;
  social_media?: unknown;
}

function parseSocial(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

/** `includePrivate` añade el email (solo para usuarios autenticados). */
export function toAuthorDTO(row: Author, includePrivate = false): AuthorDTO {
  const dto: AuthorDTO = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    bio: row.bio || '',
    avatar: safeUrl(row.avatar),
    avatar_config: row.avatarConfig,
    social_media: parseSocial(row.socialMedia),
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
  if (includePrivate) dto.email = row.email || '';
  return dto;
}

export async function listAuthors(db: Database, includePrivate = false) {
  const rows = await db.select().from(authors).orderBy(asc(authors.name));
  return rows.map((r) => toAuthorDTO(r, includePrivate));
}

export async function getAuthorRow(db: Database, slug: string) {
  const [row] = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
  return row ?? null;
}

function sanitizeSocial(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const clean: Record<string, string> = {};
  for (const [key, url] of Object.entries(value as Record<string, unknown>)) {
    const safe = safeUrl(typeof url === 'string' ? url : '');
    if (safe) clean[key.replace(/[^a-z0-9_-]/gi, '').slice(0, 30)] = safe;
  }
  return Object.keys(clean).length ? JSON.stringify(clean) : null;
}

function toColumns(input: AuthorInput) {
  const values: Partial<typeof authors.$inferInsert> = {};
  if (input.name !== undefined) values.name = stripHtml(input.name);
  if (input.bio !== undefined) values.bio = stripHtml(input.bio);
  if (input.email !== undefined) values.email = (input.email || '').trim();
  if (input.avatar !== undefined) values.avatar = safeUrl(input.avatar);
  if (input.avatar_config !== undefined) {
    const cfg = input.avatar_config;
    values.avatarConfig = cfg == null || cfg === '' ? null : typeof cfg === 'string' ? cfg : JSON.stringify(cfg);
  }
  if (input.social_media !== undefined) values.socialMedia = sanitizeSocial(input.social_media);
  return values;
}

export async function createAuthor(db: Database, input: AuthorInput) {
  const values = toColumns(input);
  const [row] = await db
    .insert(authors)
    .values({ ...values, slug: input.slug!, name: values.name! })
    .returning();
  return row;
}

export async function updateAuthor(db: Database, slug: string, input: AuthorInput) {
  const [row] = await db
    .update(authors)
    .set({ ...toColumns(input), updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) })
    .where(eq(authors.slug, slug))
    .returning();
  return row ?? null;
}

export async function deleteAuthor(db: Database, slug: string) {
  const deleted = await db.delete(authors).where(eq(authors.slug, slug)).returning({ id: authors.id });
  return deleted.length > 0;
}

/** Busca un autor por slug o nombre; si no existe lo crea. Usado por la importación masiva. */
export async function findOrCreateAuthor(db: Database, name: string, slug: string, bio: string) {
  const [existing] = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
  if (existing) return { author: existing, created: false };
  const [byName] = await db.select().from(authors).where(eq(authors.name, name)).limit(1);
  if (byName) return { author: byName, created: false };
  const author = await createAuthor(db, { slug, name, bio });
  return { author, created: true };
}
