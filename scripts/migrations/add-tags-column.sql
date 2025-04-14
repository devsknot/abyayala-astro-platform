-- Migración para añadir la columna 'tags' a la tabla 'articles'

-- Verificar si la columna ya existe
SELECT COUNT(*) AS column_exists 
FROM pragma_table_info('articles') 
WHERE name = 'tags';

-- Añadir la columna si no existe
ALTER TABLE articles ADD COLUMN tags TEXT;
