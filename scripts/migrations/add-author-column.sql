-- Migración para añadir la columna 'author' a la tabla 'articles'

-- Verificar si la columna ya existe
SELECT COUNT(*) AS column_exists 
FROM pragma_table_info('articles') 
WHERE name = 'author';

-- Añadir la columna si no existe
ALTER TABLE articles ADD COLUMN author TEXT;
