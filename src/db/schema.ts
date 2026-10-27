// src/db/schema.ts
// Esquema de la base D1 `abyayala-cms` definido con Drizzle ORM.
// Es la fuente de verdad: cualquier cambio aquí se traduce en una migración con
// `npm run db:generate` y se aplica con `npm run db:migrate:local|remote`.
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const now = sql`(datetime('now'))`;

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const authors = sqliteTable(
  'authors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    bio: text('bio'),
    email: text('email'),
    avatar: text('avatar'),
    // JSON serializado con { url, style, seed, options } del avatar DiceBear
    avatarConfig: text('avatar_config'),
    // JSON serializado con las redes sociales del autor
    socialMedia: text('social_media'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index('idx_authors_slug').on(t.slug)],
);

export const articles = sqliteTable(
  'articles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    content: text('content'),
    // Fecha ISO 8601 (ej. 2024-05-01T00:00:00.000Z)
    pubDate: text('pub_date'),
    // Referencia lógica a categories.id (sin FK por compatibilidad con datos existentes)
    category: text('category'),
    featuredImage: text('featured_image'),
    createdAt: text('created_at').default(now),
    updatedAt: text('updated_at').default(now),
    // JSON serializado: string[]
    tags: text('tags'),
    authorId: integer('author_id'),
  },
  (t) => [
    index('idx_articles_slug').on(t.slug),
    index('idx_articles_author_id').on(t.authorId),
    index('idx_articles_category_pub_date').on(t.category, t.pubDate),
    index('idx_articles_pub_date').on(t.pubDate),
  ],
);

export const activities = sqliteTable(
  'activities',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id'),
    entityTitle: text('entity_title'),
    userId: text('user_id'),
    userName: text('user_name'),
    details: text('details'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index('idx_activities_type').on(t.type),
    index('idx_activities_entity_type').on(t.entityType),
    index('idx_activities_created_at').on(t.createdAt),
  ],
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Author = typeof authors.$inferSelect;
export type NewAuthor = typeof authors.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Activity = typeof activities.$inferSelect;
