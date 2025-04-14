-- Script para añadir nuevas categorías a la base de datos
-- Fecha: 2025-04-14

-- Nuevas categorías a añadir
INSERT INTO categories (id, name, description) VALUES 
('noticias', 'Noticias', 'Actualizaciones y eventos recientes del colectivo'),
('analisis', 'Análisis', 'Artículos de análisis sobre temas agrarios y territoriales'),
('investigacion', 'Investigación', 'Estudios y trabajos de investigación realizados por el colectivo'),
('internacional', 'Internacional', 'Noticias y análisis de temas internacionales relacionados'),
('comunicados', 'Comunicados', 'Declaraciones oficiales y pronunciamientos del colectivo'),
('testimonios', 'Testimonios', 'Historias y experiencias de miembros de la comunidad');
