-- Migración para crear la tabla 'authors'

-- Verificar si la tabla ya existe
SELECT COUNT(*) AS table_exists 
FROM sqlite_master 
WHERE type='table' AND name='authors';

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  email TEXT,
  avatar TEXT,
  social_media TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);

-- Crear algunos autores de ejemplo
INSERT OR IGNORE INTO authors (slug, name, bio) 
VALUES 
  ('colectivo-abyayala', 'Colectivo Agrario Abya Yala', 'Colectivo de agricultores y activistas dedicados a la promoción de la agricultura sostenible y la soberanía alimentaria.'),
  ('equipo-editorial', 'Equipo Editorial', 'Equipo de redacción y edición de la plataforma de noticias del Colectivo Agrario Abya Yala.'),
  ('corresponsales-comunitarios', 'Corresponsales Comunitarios', 'Red de corresponsales locales que reportan desde sus comunidades sobre temas agrarios y ambientales.');

-- Modificar la tabla articles para que author sea una referencia a la tabla authors
-- Primero, verificamos si la columna author ya existe
SELECT COUNT(*) AS column_exists 
FROM pragma_table_info('articles') 
WHERE name = 'author_id';

-- Añadir la columna author_id si no existe
ALTER TABLE articles ADD COLUMN author_id INTEGER REFERENCES authors(id);
