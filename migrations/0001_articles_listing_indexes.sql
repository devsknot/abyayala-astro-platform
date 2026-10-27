CREATE INDEX `idx_articles_category_pub_date` ON `articles` (`category`,`pub_date`);--> statement-breakpoint
CREATE INDEX `idx_articles_pub_date` ON `articles` (`pub_date`);