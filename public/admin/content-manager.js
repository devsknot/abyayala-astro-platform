// Gestor de contenido para el CMS: acceso a la API de artículos, categorías,
// autores y actividades. Toda la comunicación pasa por utils/api.js.
import { apiRequest } from './utils/api.js';

const API_BASE = '/api/content';

function encodeSlug(slug) {
  return encodeURIComponent(String(slug ?? ''));
}

function emptyPage(params = {}) {
  return {
    articles: [],
    pagination: {
      page: parseInt(params.page || 1, 10),
      limit: parseInt(params.limit || params.pageSize || 10, 10),
      total: 0,
      totalPages: 0
    }
  };
}

export class ContentManager {
  // Obtener artículos con paginación y filtros (búsqueda / categoría)
  async getArticles(params = {}) {
    const search = (params.search || '').trim();
    const category = (params.category || '').trim();
    const isSearch = Boolean(search || category);
    const pageSize = params.pageSize || params.limit;

    try {
      const data = await apiRequest(`${API_BASE}/articles${isSearch ? '/search' : ''}`, {
        query: {
          page: params.page,
          pageSize,
          query: search,
          category
        }
      });

      if (!data || !Array.isArray(data.articles)) return emptyPage(params);

      const pagination = data.pagination || {};
      const limit = parseInt(pagination.pageSize || pageSize || 10, 10);
      const total = pagination.totalItems ?? data.articles.length;
      return {
        articles: data.articles,
        pagination: {
          page: parseInt(pagination.page || params.page || 1, 10),
          limit,
          total,
          totalPages: pagination.totalPages ?? Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error al obtener artículos:', error);
      return emptyPage(params);
    }
  }

  // Obtener un artículo por su slug (null si no existe o hay error).
  // La API devuelve el objeto del artículo directamente (sin envolver).
  async getArticle(slug) {
    try {
      const data = await apiRequest(`${API_BASE}/articles/${encodeSlug(slug)}`);
      if (data && data.article) return data.article;
      if (data && data.slug) return data;
      return null;
    } catch (error) {
      if (error.status !== 404) console.error('Error al obtener artículo:', error);
      return null;
    }
  }

  createArticle(articleData) {
    return apiRequest(`${API_BASE}/articles`, { method: 'POST', body: articleData });
  }

  updateArticle(slug, articleData) {
    return apiRequest(`${API_BASE}/articles/${encodeSlug(slug)}`, { method: 'PUT', body: articleData });
  }

  deleteArticle(slug) {
    return apiRequest(`${API_BASE}/articles/${encodeSlug(slug)}`, { method: 'DELETE' });
  }

  // Importar artículos en masa: devuelve la respuesta o { error }
  async bulkImportArticles(articlesData) {
    try {
      return await apiRequest(`${API_BASE}/bulk-import`, { method: 'POST', body: articlesData });
    } catch (error) {
      console.error('Error en importación masiva:', error);
      return { error: error.message || 'Error en la importación masiva', details: error.data };
    }
  }

  // Obtener todas las categorías (array)
  async getCategories() {
    try {
      const data = await apiRequest(`${API_BASE}/categories`);
      if (data && Array.isArray(data.categories)) return data.categories;
      if (Array.isArray(data)) return data;
      return [];
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return [];
    }
  }

  async getCategory(slug) {
    try {
      return await apiRequest(`${API_BASE}/categories/${encodeSlug(slug)}`);
    } catch (error) {
      console.error('Error al obtener categoría:', error);
      return null;
    }
  }

  createCategory(categoryData) {
    return apiRequest(`${API_BASE}/categories`, { method: 'POST', body: categoryData });
  }

  updateCategory(slug, categoryData) {
    return apiRequest(`${API_BASE}/categories/${encodeSlug(slug)}`, { method: 'PUT', body: categoryData });
  }

  deleteCategory(slug) {
    return apiRequest(`${API_BASE}/categories/${encodeSlug(slug)}`, { method: 'DELETE' });
  }

  // Obtener todos los autores: { success, authors } o [] si hay error
  async getAuthors() {
    try {
      return await apiRequest(`${API_BASE}/authors`);
    } catch (error) {
      console.error('Error al obtener autores:', error);
      return [];
    }
  }

  async getAuthor(slug) {
    try {
      return await apiRequest(`${API_BASE}/authors/${encodeSlug(slug)}`);
    } catch (error) {
      console.error(`Error al obtener autor ${slug}:`, error);
      return null;
    }
  }

  createAuthor(authorData) {
    return apiRequest(`${API_BASE}/authors`, { method: 'POST', body: authorData });
  }

  updateAuthor(slug, authorData) {
    return apiRequest(`${API_BASE}/authors/${encodeSlug(slug)}`, { method: 'PUT', body: authorData });
  }

  deleteAuthor(slug) {
    return apiRequest(`${API_BASE}/authors/${encodeSlug(slug)}`, { method: 'DELETE' });
  }

  // Actividades recientes (requiere sesión)
  async getActivities(limit = 10) {
    try {
      return await apiRequest(`${API_BASE}/activities`, { query: { limit } });
    } catch (error) {
      console.error('Error al obtener actividades:', error);
      return [];
    }
  }

  // Registrar una actividad; nunca interrumpe el flujo principal
  async logActivity(activityData) {
    try {
      return await apiRequest(`${API_BASE}/activities`, { method: 'POST', body: activityData });
    } catch (error) {
      console.error('Error al registrar actividad:', error);
      return { error: error.message };
    }
  }
}
