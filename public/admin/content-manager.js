// Gestor de contenido para el CMS
export class ContentManager {
  constructor() {
    this.apiBase = '/api/content';
  }

  // Método para obtener las cabeceras de autenticación
  getAuthHeaders() {
    // Obtener el token de autenticación del localStorage
    const authData = localStorage.getItem('abyayala_cms_auth');
    let headers = {
      'Content-Type': 'application/json'
    };
    
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        // En un entorno real de Cloudflare Access, el token JWT sería proporcionado por Cloudflare
        // Aquí simulamos una cabecera de autenticación para el entorno de desarrollo
        headers['CF-Access-Client-Id'] = 'development-client-id';
        headers['CF-Access-Client-Secret'] = 'development-client-secret';
      } catch (error) {
        console.error('Error al procesar datos de autenticación:', error);
      }
    }
    
    return headers;
  }

  // Obtener todos los artículos
  async getArticles() {
    try {
      const response = await fetch(`${this.apiBase}/articles`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener artículos');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener un artículo específico
  async getArticle(slug) {
    try {
      const response = await fetch(`${this.apiBase}/articles/${slug}`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Error al obtener el artículo "${slug}"`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
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
      
      if (!response.ok) {
        throw new Error('Error al crear el artículo');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
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
      
      if (!response.ok) {
        throw new Error(`Error al actualizar el artículo "${slug}"`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
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
      
      if (!response.ok) {
        throw new Error(`Error al eliminar el artículo "${slug}"`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener todas las categorías
  async getCategories() {
    try {
      const response = await fetch(`${this.apiBase}/categories`, {
        headers: this.getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener categorías');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error:', error);
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
