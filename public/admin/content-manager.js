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
      const response = await fetch(`${this.apiBase}/articles/${slug}`, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      console.error(`Error al obtener artículo: ${response.status}`);
      return null;
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return null;
    }
  }

  // Crear un nuevo artículo
  async createArticle(articleData) {
    try {
      const response = await fetch(`${this.apiBase}/articles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articleData)
      });
      
      if (response.ok) {
        return await response.json();
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
      const response = await fetch(`${this.apiBase}/articles/${slug}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articleData)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error al actualizar artículo: ${response.status}`);
    } catch (error) {
      console.error('Error al actualizar artículo:', error);
      throw error;
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
      // Devolver categorías básicas como fallback
      return [
        { id: 'agricultura', name: 'Agricultura' },
        { id: 'comunidad', name: 'Comunidad' },
        { id: 'sostenibilidad', name: 'Sostenibilidad' },
        { id: 'politica-agraria', name: 'Política Agraria' },
        { id: 'tecnologia-rural', name: 'Tecnología Rural' },
        { id: 'cultura', name: 'Cultura' },
        { id: 'eventos', name: 'Eventos' }
      ];
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      // Devolver categorías básicas como fallback
      return [
        { id: 'agricultura', name: 'Agricultura' },
        { id: 'comunidad', name: 'Comunidad' },
        { id: 'sostenibilidad', name: 'Sostenibilidad' },
        { id: 'politica-agraria', name: 'Política Agraria' },
        { id: 'tecnologia-rural', name: 'Tecnología Rural' },
        { id: 'cultura', name: 'Cultura' },
        { id: 'eventos', name: 'Eventos' }
      ];
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
heroImage: '${articleData.heroImage}'
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
