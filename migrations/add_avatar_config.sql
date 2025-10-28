-- Migración: Agregar campo avatar_config a la tabla authors
-- Fecha: 27 de octubre de 2025
-- Descripción: Agrega un campo para almacenar la configuración del avatar personalizado (DiceBear)

-- Agregar columna avatar_config a la tabla authors
ALTER TABLE authors ADD COLUMN avatar_config TEXT;

-- Nota: Este campo almacenará un JSON con la configuración del avatar:
-- {
--   "style": "avataaars",
--   "seed": "nombre-del-autor",
--   "options": {
--     "backgroundColor": "b6e3f4",
--     "eyes": "happy",
--     "mouth": "smile"
--   },
--   "url": "https://api.dicebear.com/7.x/avataaars/svg?..."
-- }
