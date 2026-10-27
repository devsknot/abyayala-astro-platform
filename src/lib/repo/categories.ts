// src/lib/repo/categories.ts
import { asc, eq } from 'drizzle-orm';
import type { Database } from '../../db';
import { categories } from '../../db/schema';
import { stripHtml } from '../sanitize';

export interface CategoryInput {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
}

export function listCategories(db: Database) {
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function getCategory(db: Database, id: string) {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row ?? null;
}

export async function createCategory(db: Database, id: string, input: CategoryInput) {
  const [row] = await db
    .insert(categories)
    .values({ id, name: stripHtml(input.name), description: stripHtml(input.description) })
    .returning();
  return row;
}

export async function updateCategory(db: Database, id: string, input: CategoryInput) {
  const values: Partial<typeof categories.$inferInsert> = {};
  if (input.name !== undefined) values.name = stripHtml(input.name);
  if (input.description !== undefined) values.description = stripHtml(input.description);
  if (!Object.keys(values).length) return getCategory(db, id);
  const [row] = await db.update(categories).set(values).where(eq(categories.id, id)).returning();
  return row ?? null;
}

export async function deleteCategory(db: Database, id: string) {
  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
  return deleted.length > 0;
}
