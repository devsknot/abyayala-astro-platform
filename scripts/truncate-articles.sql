-- Script para truncar la tabla de artículos
-- Fecha: 2025-04-14
-- ADVERTENCIA: Este script eliminará TODOS los artículos de la base de datos

-- Eliminar todos los registros de la tabla articles
DELETE FROM articles;

-- Reiniciar el contador de autoincremento (si existe)
-- Nota: D1 no tiene una sintaxis específica para reiniciar autoincremento como en MySQL
-- pero esto debería funcionar para SQLite que es lo que usa D1

-- Mensaje de confirmación
SELECT 'Tabla de artículos truncada correctamente. Todos los artículos han sido eliminados.' AS mensaje;
