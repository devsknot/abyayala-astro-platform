// Gestor de contenido para el CMS
export class ContentManager {
  constructor() {
    this.apiBase = '/api/content';
    // Nunca usar datos de prueba, siempre conectar con la API real
    this.useFallbackData = false;
  }

  // Método para obtener las cabeceras de autenticación
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Si estamos en un entorno con Cloudflare Access
    const cfAccessToken = localStorage.getItem('cf_access_token');
    if (cfAccessToken) {
      headers['CF-Access-Client-Id'] = localStorage.getItem('cf_access_client_id');
      headers['CF-Access-Jwt-Assertion'] = cfAccessToken;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // En desarrollo local, usar cabeceras simuladas
      headers['CF-Access-Client-Id'] = 'development-client-id';
      headers['CF-Access-Jwt-Assertion'] = 'development-token';
    }
    
    return headers;
  }

  // Obtener todos los artículos
  async getArticles() {
    try {
      const response = await fetch(`${this.apiBase}/articles`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      console.error(`Error al obtener artículos: ${response.status}`);
      return [];
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return [];
    }
  }

  // Obtener un artículo por su slug
  async getArticle(slug) {
    try {
      console.log(`ContentManager.getArticle - Solicitando artículo con slug: ${slug}`);
      const url = `${this.apiBase}/articles/${slug}`;
      console.log(`ContentManager.getArticle - URL de solicitud: ${url}`);
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });
      
      console.log(`ContentManager.getArticle - Código de respuesta: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.getArticle - Datos recibidos:', data);
        return data;
      }
      
      console.error(`Error al obtener artículo: ${response.status}`);
      
      // Intentar leer el mensaje de error
      try {
        const errorData = await response.json();
        console.error('Detalles del error:', errorData);
      } catch (parseError) {
        console.error('No se pudo parsear la respuesta de error');
      }
      
      return null;
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return null;
    }
  }

  // Crear un nuevo artículo
  async createArticle(articleData) {
    try {
      console.log('ContentManager.createArticle - Datos del artículo:', articleData);
      
      const response = await fetch(`${this.apiBase}/articles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articleData)
      });
      
      console.log(`ContentManager.createArticle - Código de respuesta: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.createArticle - Respuesta:', data);
        return data;
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error al crear artículo: ${response.status}`);
    } catch (error) {
      console.error('Error al crear artículo:', error);
      throw error;
    }
  }

  // Actualizar un artículo existente
  async updateArticle(slug, articleData) {
    try {
      console.log(`ContentManager.updateArticle - Actualizando artículo: ${slug}`);
      console.log('ContentManager.updateArticle - Datos:', articleData);
      
      const response = await fetch(`${this.apiBase}/articles/${slug}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articleData)
      });
      
      console.log(`ContentManager.updateArticle - Código de respuesta: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.updateArticle - Respuesta:', data);
        return data;
      }
      
      console.error(`Error al actualizar artículo: ${response.status}`);
      return null;
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return null;
    }
  }
  
  // Importar artículos en masa
  async bulkImportArticles(articlesData) {
    try {
      console.log('ContentManager.bulkImportArticles - Iniciando importación masiva');
      console.log(`ContentManager.bulkImportArticles - Total de artículos: ${articlesData.articles.length}`);
      
      const response = await fetch(`${this.apiBase}/bulk-import`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articlesData)
      });
      
      console.log(`ContentManager.bulkImportArticles - Código de respuesta: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.bulkImportArticles - Respuesta:', data);
        return data;
      }
      
      console.error(`Error en importación masiva: ${response.status}`);
      
      // Intentar leer el mensaje de error
      try {
        const errorData = await response.json();
        console.error('Detalles del error:', errorData);
        return errorData;
      } catch (parseError) {
        console.error('No se pudo parsear la respuesta de error');
        return { error: 'Error en la importación masiva' };
      }
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return { error: error.message || 'Error de conexión' };
    }
  }

  // Eliminar un artículo
  async deleteArticle(slug) {
    try {
      const response = await fetch(`${this.apiBase}/articles/${slug}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error al eliminar artículo: ${response.status}`);
    } catch (error) {
      console.error('Error al eliminar artículo:', error);
      throw error;
    }
  }

  // Obtener todas las categorías
  async getCategories() {
    try {
      const response = await fetch(`${this.apiBase}/categories`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      console.error(`Error al obtener categorías: ${response.status}`);
      return [];
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return [];
    }
  }

  // Obtener una categoría por su slug
  async getCategory(slug) {
    try {
      const response = await fetch(`${this.apiBase}/categories/${slug}`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      console.error(`Error al obtener categoría: ${response.status}`);
      return null;
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return null;
    }
  }

  // Crear una nueva categoría
  async createCategory(categoryData) {
    try {
      const response = await fetch(`${this.apiBase}/categories`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error al crear categoría: ${response.status}`);
    } catch (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }
  }

  // Actualizar una categoría existente
  async updateCategory(slug, categoryData) {
    try {
      const response = await fetch(`${this.apiBase}/categories/${slug}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(categoryData)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error al actualizar categoría: ${response.status}`);
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      throw error;
    }
  }

  // Eliminar una categoría
  async deleteCategory(slug) {
    try {
      const response = await fetch(`${this.apiBase}/categories/${slug}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error al eliminar categoría: ${response.status}`);
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      throw error;
    }
  }

  // Convertir contenido del editor a Markdown
  convertToMarkdown(content) {
    // En una implementación real, usaríamos una biblioteca como turndown
    // Por ahora, simulamos una conversión simple
    return content;
  }

  // Generar frontmatter para un artículo
  generateFrontmatter(articleData) {
    return `---
title: '${articleData.title}'
description: '${articleData.description}'
pubDate: '${articleData.pubDate}'
featured_image: '${articleData.featured_image}'
category: '${articleData.category}'
slug: '${articleData.slug}'
---`;
  }

  // Generar archivo Markdown completo
  generateMarkdownFile(articleData, content) {
    const frontmatter = this.generateFrontmatter(articleData);
    const markdownContent = this.convertToMarkdown(content);
    
    return `${frontmatter}

${markdownContent}`;
  }
}
