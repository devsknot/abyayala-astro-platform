-- Cambiar el nombre de la columna hero_image a featured_image en la tabla articles
ALTER TABLE articles RENAME COLUMN hero_image TO featured_image;

-- Verificar que la estructura es correcta
PRAGMA table_info(articles);
