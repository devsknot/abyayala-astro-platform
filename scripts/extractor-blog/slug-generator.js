// Módulo para generar slugs SEO-friendly

/**
 * Genera un slug a partir de un título
 * @param {string} title Título del artículo
 * @returns {string} Slug generado
 */
function generateSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Eliminar guiones duplicados
    .trim();
}

module.exports = { generateSlug };
