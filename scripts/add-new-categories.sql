-- Script para añadir nuevas categorías a la base de datos
-- Fecha: 2025-04-14

-- Nuevas categorías a añadir
INSERT INTO categories (id, name, description) VALUES 
('general', 'General', 'Contenido general y misceláneo del colectivo'),
('medio-ambiente', 'Medio Ambiente', 'Temas relacionados con la protección ambiental y conservación de ecosistemas'),
('politica', 'Política', 'Análisis político general y temas de gobernanza'),
('derechos-humanos', 'Derechos Humanos', 'Defensa y promoción de los derechos humanos en contextos rurales y agrarios');
