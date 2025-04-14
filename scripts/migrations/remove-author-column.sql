-- Migración para eliminar la columna 'author' y dejar solo 'author_id' en la tabla 'articles'

-- Paso 1: Crear una tabla temporal con la estructura correcta (sin la columna 'author')
CREATE TABLE articles_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  pub_date TEXT,
  category TEXT,
  featured_image TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  tags TEXT,
  author_id INTEGER
);

-- Paso 2: Copiar los datos de la tabla original a la nueva tabla
INSERT INTO articles_new (id, slug, title, description, content, pub_date, category, featured_image, created_at, updated_at, tags, author_id)
SELECT id, slug, title, description, content, pub_date, category, featured_image, created_at, updated_at, tags, author_id
FROM articles;

-- Paso 3: Eliminar la tabla original
DROP TABLE articles;

-- Paso 4: Renombrar la tabla nueva a 'articles'
ALTER TABLE articles_new RENAME TO articles;

-- Paso 5: Crear índices necesarios
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_author_id ON articles(author_id);
