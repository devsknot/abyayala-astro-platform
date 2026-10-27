-- Migración 0000: línea base.
-- Reproduce el esquema que ya existía en producción (abyayala-cms) antes de adoptar
-- Drizzle ORM. Todas las sentencias usan IF NOT EXISTS para que aplicarla sobre la
-- base de producción sea un no-op y solo quede registrada en la tabla d1_migrations.
-- En una base nueva (local o preview) crea el esquema completo.
-- Nota: los UNIQUE van en línea, igual que en producción; el snapshot de drizzle-kit
-- los modela como índices `<tabla>_slug_unique`.
CREATE TABLE IF NOT EXISTS `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `authors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`bio` text,
	`email` text,
	`avatar` text,
	`social_media` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP,
	`avatar_config` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_authors_slug` ON `authors` (`slug`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL UNIQUE,
	`title` text NOT NULL,
	`description` text,
	`content` text,
	`pub_date` text,
	`category` text,
	`featured_image` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now')),
	`tags` text,
	`author_id` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_articles_slug` ON `articles` (`slug`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_articles_author_id` ON `articles` (`author_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`entity_title` text,
	`user_id` text,
	`user_name` text,
	`details` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activities_type` ON `activities` (`type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activities_entity_type` ON `activities` (`entity_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_activities_created_at` ON `activities` (`created_at`);
