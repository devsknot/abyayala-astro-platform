-- Datos mínimos para una base local nueva (no es una migración).
-- Uso: npm run db:seed:local  (después de npm run db:migrate:local)
-- Categorías copiadas de producción el 2026-10-26.
INSERT OR IGNORE INTO categories (id, name, description) VALUES
  ('agricultura', 'Agricultura', 'Noticias sobre prácticas agrícolas, cultivos y temporadas'),
  ('analisis', 'Análisis', 'Artículos de análisis sobre temas agrarios y territoriales'),
  ('comunicados', 'Comunicados', 'Declaraciones oficiales y pronunciamientos del colectivo'),
  ('derechos-humanos', 'Derechos Humanos', 'Defensa y promoción de los derechos humanos en contextos rurales y agrarios'),
  ('eventos', 'Eventos', 'Ferias, encuentros y capacitaciones'),
  ('general', 'General', 'Contenido general y misceláneo del colectivo'),
  ('internacional', 'Internacional', 'Noticias y análisis de temas internacionales relacionados'),
  ('investigacion', 'Investigación', 'Estudios y trabajos de investigación realizados por el colectivo'),
  ('medio-ambiente', 'Medio Ambiente', 'Temas relacionados con la protección ambiental y conservación de ecosistemas'),
  ('politica', 'Política', 'Análisis político general y temas de gobernanza'),
  ('politica-agraria', 'Política Agraria', 'Legislación, derechos y movimientos sociales'),
  ('tecnologia-rural', 'Tecnología Rural', 'Innovaciones, herramientas y digitalización'),
  ('testimonios', 'Testimonios', 'Historias y experiencias de miembros de la comunidad');

INSERT OR IGNORE INTO authors (slug, name, bio) VALUES
  ('colectivo-abyayala', 'Colectivo Agrario Abya Yala', 'Colectivo de agricultores y activistas dedicados a la promoción de la agricultura sostenible y la soberanía alimentaria.'),
  ('equipo-editorial', 'Equipo Editorial', 'Equipo de redacción y edición de la plataforma de noticias del Colectivo Agrario Abya Yala.');

INSERT OR IGNORE INTO articles (slug, title, description, content, pub_date, category, tags, author_id) VALUES
  ('articulo-de-prueba', 'Artículo de prueba', 'Contenido de ejemplo para desarrollo local.', '<p>Hola desde la base local.</p>', '2026-01-01T00:00:00.000Z', 'agricultura', '["prueba"]', 1);
