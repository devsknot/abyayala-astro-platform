-- Esquema de la base de datos D1 de Abya Yala CMS (Generado el 9 de agosto de 2025)
-- Base de datos: abyayala-cms (ID: a50d9255-3be0-47bd-800c-85fb362c197f)

-- Tabla de artículos
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
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

-- Tabla de categorías
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Tabla de autores
CREATE TABLE authors (
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

-- Tabla de actividades (registro de acciones en el sistema)
CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  entity_title TEXT,
  user_id TEXT,
  user_name TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_authors_slug ON authors(slug);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type ON activities(entity_type);

-- Insertar categorías predefinidas
INSERT OR IGNORE INTO categories (id, name, description) VALUES
  ('agricultura', 'Agricultura', 'Noticias sobre prácticas agrícolas, cultivos y temporadas'),
  ('comunidad', 'Comunidad', 'Historias de miembros, cooperación y testimonios'),
  ('sostenibilidad', 'Sostenibilidad', 'Prácticas ecológicas, conservación y biodiversidad'),
  ('politica-agraria', 'Política Agraria', 'Legislación, derechos y movimientos sociales'),
  ('tecnologia-rural', 'Tecnología Rural', 'Innovaciones, herramientas y digitalización'),
  ('cultura', 'Cultura', 'Tradiciones, gastronomía y artesanía'),
  ('eventos', 'Eventos', 'Ferias, encuentros y capacitaciones');

-- Insertar autores predefinidos
INSERT OR IGNORE INTO authors (slug, name, bio) VALUES
  ('colectivo-abyayala', 'Colectivo Agrario Abya Yala', 'Colectivo de agricultores y activistas dedicados a la promoción de la agricultura sostenible y la soberanía alimentaria.'),
  ('equipo-editorial', 'Equipo Editorial', 'Equipo de redacción y edición de la plataforma de noticias del Colectivo Agrario Abya Yala.'),
  ('corresponsales-comunitarios', 'Corresponsales Comunitarios', 'Red de corresponsales locales que reportan desde sus comunidades sobre temas agrarios y ambientales.');

-- Nota: Este esquema refleja la estructura actual de la base de datos en Cloudflare D1
-- Fecha de generación: 9 de agosto de 2025
