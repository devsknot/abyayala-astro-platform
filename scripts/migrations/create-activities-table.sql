-- Migración para crear la tabla 'activities'

-- Verificar si la tabla ya existe
SELECT COUNT(*) AS table_exists 
FROM sqlite_master 
WHERE type='table' AND name='activities';

-- Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'create', 'edit', 'delete', 'media_upload', etc.
  entity_type TEXT NOT NULL, -- 'article', 'author', 'media', etc.
  entity_id TEXT, -- ID o slug de la entidad relacionada
  entity_title TEXT, -- Título o nombre de la entidad
  user_id TEXT, -- ID del usuario que realizó la acción (si está disponible)
  user_name TEXT, -- Nombre del usuario que realizó la acción
  details TEXT, -- Detalles adicionales en formato JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_entity_type ON activities(entity_type);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at);

-- Insertar algunas actividades de ejemplo
INSERT OR IGNORE INTO activities (type, entity_type, entity_id, entity_title, user_name, details, created_at) 
VALUES 
  ('create', 'article', 'nuevas-tecnicas-rotacion-cultivos', 'Nuevas técnicas de rotación de cultivos aumentan productividad en pequeñas parcelas', 'Admin', '{"category":"agricultura"}', datetime('now', '-2 days')),
  ('media_upload', 'media', 'riego-sostenible.jpg', 'riego-sostenible.jpg', 'Admin', '{"size":"1.2MB","type":"image/jpeg"}', datetime('now', '-3 days')),
  ('edit', 'article', 'cooperativa-abyayala-certificacion', 'Cooperativa Abya Yala lanza programa de certificación agroecológica', 'Admin', '{"category":"sostenibilidad"}', datetime('now', '-5 days'));
