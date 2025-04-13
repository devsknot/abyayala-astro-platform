-- Esquema para la base de datos D1 de Abya Yala CMS

-- Tabla de artículos
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  pub_date TEXT,
  category TEXT,
  hero_image TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tabla de categorías
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

-- Insertar categorías predefinidas
INSERT INTO categories (id, name, description) VALUES
  ('agricultura', 'Agricultura', 'Noticias sobre prácticas agrícolas, cultivos y temporadas'),
  ('comunidad', 'Comunidad', 'Historias de miembros, cooperación y testimonios'),
  ('sostenibilidad', 'Sostenibilidad', 'Prácticas ecológicas, conservación y biodiversidad'),
  ('politica-agraria', 'Política Agraria', 'Legislación, derechos y movimientos sociales'),
  ('tecnologia-rural', 'Tecnología Rural', 'Innovaciones, herramientas y digitalización'),
  ('cultura', 'Cultura', 'Tradiciones, gastronomía y artesanía'),
  ('eventos', 'Eventos', 'Ferias, encuentros y capacitaciones');

-- Insertar algunos artículos de ejemplo
INSERT INTO articles (slug, title, description, content, pub_date, category, hero_image) VALUES
  ('record-cafe-organico', 'Récord en producción de café orgánico', 'Cooperativa local logra récord de producción con prácticas sostenibles', '# Récord en producción de café orgánico\n\nLa cooperativa agraria Abya Yala ha alcanzado un nuevo récord en la producción de café orgánico, superando las expectativas del mercado nacional e internacional.\n\n## Resultados excepcionales\n\nEste año, la producción alcanzó las 500 toneladas de café de alta calidad, un incremento del 30% respecto al año anterior. Este logro es el resultado de la implementación de técnicas agroecológicas y el compromiso de más de 200 familias productoras.\n\n> "Este resultado demuestra que la agricultura orgánica no solo es más sostenible, sino que también puede ser más productiva cuando se aplican las técnicas adecuadas" - María Quispe, presidenta de la cooperativa.\n\n## Factores clave del éxito\n\n- Implementación de sistemas agroforestales\n- Uso de biofertilizantes producidos localmente\n- Capacitación constante de los productores\n- Certificación orgánica internacional\n\n## Impacto en la comunidad\n\nEl aumento en la producción ha generado mayores ingresos para las familias productoras y ha fortalecido la economía local. Además, las prácticas sostenibles han contribuido a la conservación de los ecosistemas de la región.', '2025-04-02', 'agricultura', '/uploads/2025/04/cafe-organico.jpg'),
  
  ('tecnica-riego-sostenible', 'Nueva técnica de riego sostenible', 'Agricultores del colectivo Abya Yala implementan innovadora técnica de riego que permite ahorrar agua', '# Nueva técnica de riego sostenible reduce el consumo de agua en un 40%\n\nUn grupo de agricultores del colectivo Abya Yala ha implementado con éxito un sistema de riego por goteo subterráneo que ha permitido reducir el consumo de agua en un 40%, manteniendo e incluso mejorando la productividad de los cultivos.\n\n## Tecnología adaptada a pequeños productores\n\nEl sistema, adaptado a las necesidades y posibilidades económicas de pequeños productores, combina tecnologías modernas con conocimientos tradicionales sobre el manejo del agua.\n\n## Componentes del sistema\n\n1. Tuberías de goteo biodegradables\n2. Sensores de humedad de bajo costo\n3. Sistema de filtración con materiales locales\n4. Aplicación móvil para monitoreo\n\n## Resultados obtenidos\n\n- 40% de reducción en el consumo de agua\n- 25% de aumento en la productividad\n- Disminución de enfermedades fungosas\n- Menor crecimiento de malezas\n\nEl proyecto ha sido financiado parcialmente por el Fondo de Innovación Agrícola y será replicado en otras comunidades durante el próximo año.', '2025-03-20', 'tecnologia-rural', '/uploads/2025/03/riego-sostenible.jpg'),
  
  ('feria-semillas-ancestrales', 'Feria de semillas ancestrales', 'La tradicional feria de intercambio de semillas ancestrales organizada por Abya Yala contó con la participación de agricultores de toda la región', '# Feria de semillas ancestrales reúne a más de 500 agricultores\n\nEl pasado fin de semana se celebró con gran éxito la primera feria de intercambio de semillas ancestrales organizada por nuestro colectivo. Más de 500 agricultores de la región participaron en este evento que busca preservar la biodiversidad agrícola local.\n\n## Variedades recuperadas\n\nDurante la feria se presentaron más de 50 variedades de semillas tradicionales que estaban en peligro de desaparecer:\n\n- Maíz azul andino\n- Quinoa roja\n- Frijoles pintados\n- Papas nativas de altura\n\n## Testimonios\n\n> "Estas semillas han estado en mi familia por generaciones. Poder compartirlas y asegurar que seguirán cultivándose es una alegría inmensa" - María Quispe, agricultora local.\n\n## Próximos eventos\n\nAnte el éxito de esta primera edición, ya estamos organizando la próxima feria que se realizará en octubre. ¡No te la pierdas!', '2025-03-25', 'eventos', '/uploads/2025/03/feria-semillas.jpg');
