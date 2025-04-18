// Gestor de contenido para el CMS
export class ContentManager {
  constructor() {
    // Usar URL base relativa para que funcione tanto en desarrollo como en producción
    this.apiBase = '/api/content';
    // Nunca usar datos de prueba, siempre conectar con la API real
    this.useFallbackData = false;
    
    // Usar siempre rutas relativas para compatibilidad con SSR
    console.log('Usando API con ruta relativa para compatibilidad con SSR:', this.apiBase);
  }

  // Método para obtener las cabeceras de autenticación
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
    
    // Obtener datos de autenticación del localStorage (formato usado en app.js)
    const authData = localStorage.getItem('abyayala_cms_auth');
    
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        
        // Si hay un token en los datos de autenticación, usarlo
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        
        // Si hay credenciales de Cloudflare Access, usarlas también
        if (auth.cf_access_token) {
          headers['CF-Access-Client-Id'] = auth.cf_access_client_id || '';
          headers['CF-Access-Jwt-Assertion'] = auth.cf_access_token;
        }
      } catch (e) {
        console.error('Error al parsear datos de autenticación:', e);
      }
    }
    
    // Verificar si hay tokens de Cloudflare Access directamente en localStorage (formato anterior)
    const cfAccessToken = localStorage.getItem('cf_access_token');
    if (cfAccessToken && !headers['CF-Access-Jwt-Assertion']) {
      headers['CF-Access-Client-Id'] = localStorage.getItem('cf_access_client_id') || '';
      headers['CF-Access-Jwt-Assertion'] = cfAccessToken;
    }
    
    // En desarrollo local, usar cabeceras simuladas si no hay otras credenciales
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
        !headers['Authorization'] && !headers['CF-Access-Jwt-Assertion']) {
      headers['CF-Access-Client-Id'] = 'development-client-id';
      headers['CF-Access-Jwt-Assertion'] = 'development-token';
    }
    
    console.log('Headers de autenticación:', JSON.stringify(headers));
    
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
      console.log('ContentManager.bulkImportArticles - URL de API:', `${this.apiBase}/bulk-import`);
      
      // Obtener cabeceras de autenticación
      const headers = this.getAuthHeaders();
      console.log('ContentManager.bulkImportArticles - Cabeceras:', JSON.stringify(headers));
      
      const response = await fetch(`${this.apiBase}/bulk-import`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(articlesData)
      });
      
      console.log(`ContentManager.bulkImportArticles - Código de respuesta: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.bulkImportArticles - Respuesta:', data);
        return data;
      }
      
      console.error(`Error en importación masiva: ${response.status}`);
      
      // Intentar obtener detalles del error
      try {
        const errorData = await response.json();
        console.log('Detalles del error:', errorData);
        return { error: errorData.error || 'Error en la importación masiva', details: errorData };
      } catch (parseError) {
        return { error: 'Error en la importación masiva', status: response.status };
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

  // Método para obtener todos los autores
  async getAuthors() {
    try {
      const response = await fetch(`${this.apiBase}/authors`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      console.error(`Error al obtener autores: ${response.status}`);
      return [];
    } catch (error) {
      console.error('Error al conectar con la API de autores:', error);
      return [];
    }
  }
  
  // Método para obtener un autor específico
  async getAuthor(slug) {
    try {
      const response = await fetch(`${this.apiBase}/authors/${slug}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      console.error(`Error al obtener autor ${slug}: ${response.status}`);
      return null;
    } catch (error) {
      console.error(`Error al conectar con la API para obtener autor ${slug}:`, error);
      return null;
    }
  }
  
  // Método para crear un nuevo autor
  async createAuthor(authorData) {
    try {
      const response = await fetch(`${this.apiBase}/authors`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(authorData)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status} al crear autor`);
    } catch (error) {
      console.error('Error al crear autor:', error);
      throw error;
    }
  }
  
  // Método para actualizar un autor existente
  async updateAuthor(slug, authorData) {
    try {
      const response = await fetch(`${this.apiBase}/authors/${slug}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(authorData)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status} al actualizar autor`);
    } catch (error) {
      console.error(`Error al actualizar autor ${slug}:`, error);
      throw error;
    }
  }
  
  // Método para eliminar un autor
  async deleteAuthor(slug) {
    try {
      const response = await fetch(`${this.apiBase}/authors/${slug}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status} al eliminar autor`);
    } catch (error) {
      console.error(`Error al eliminar autor ${slug}:`, error);
      throw error;
    }
  }

  // Método para obtener actividades recientes
  async getActivities(limit = 10) {
    try {
      const response = await fetch(`${this.apiBase}/activities?limit=${limit}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      console.error(`Error al obtener actividades: ${response.status}`);
      return [];
    } catch (error) {
      console.error('Error al conectar con la API de actividades:', error);
      return [];
    }
  }
  
  // Método para registrar una nueva actividad
  async logActivity(activityData) {
    try {
      const response = await fetch(`${this.apiBase}/activities`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(activityData)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      
      console.error(`Error al registrar actividad: ${response.status}`);
      return { error: `Error ${response.status}` };
    } catch (error) {
      console.error('Error al conectar con la API para registrar actividad:', error);
      return { error: error.message };
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
