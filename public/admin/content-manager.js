// Gestor de contenido para el CMS
export class ContentManager {
  constructor() {
    this.apiBase = '/api/content';
    // Agregar una opción para usar datos de prueba cuando la API no está disponible
    this.useFallbackData = true;
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
      // Intentar obtener datos de la API
      try {
        const response = await fetch(`${this.apiBase}/articles`, {
          headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Usando datos de prueba.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Usando datos de prueba para artículos');
        return this.getFallbackArticles();
      }
      
      throw new Error('Error al obtener artículos');
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener un artículo específico
  async getArticle(slug) {
    try {
      // Intentar obtener datos de la API
      try {
        const response = await fetch(`${this.apiBase}/articles/${slug}`, {
          headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Usando datos de prueba.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Usando datos de prueba para artículo:', slug);
        return this.getFallbackArticle(slug);
      }
      
      throw new Error(`Error al obtener el artículo "${slug}"`);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Crear un nuevo artículo
  async createArticle(articleData) {
    try {
      // Intentar usar la API
      try {
        const response = await fetch(`${this.apiBase}/articles`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(articleData)
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Simulando creación.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Simulando creación de artículo');
        return {
          success: true,
          message: 'Artículo creado correctamente (simulado)',
          article: {
            ...articleData,
            createdAt: new Date().toISOString()
          }
        };
      }
      
      throw new Error('Error al crear el artículo');
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Actualizar un artículo existente
  async updateArticle(slug, articleData) {
    try {
      // Intentar usar la API
      try {
        const response = await fetch(`${this.apiBase}/articles/${slug}`, {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(articleData)
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Simulando actualización.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Simulando actualización de artículo:', slug);
        return {
          success: true,
          message: 'Artículo actualizado correctamente (simulado)',
          article: {
            ...articleData,
            updatedAt: new Date().toISOString()
          }
        };
      }
      
      throw new Error(`Error al actualizar el artículo "${slug}"`);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Eliminar un artículo
  async deleteArticle(slug) {
    try {
      // Intentar usar la API
      try {
        const response = await fetch(`${this.apiBase}/articles/${slug}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Simulando eliminación.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Simulando eliminación de artículo:', slug);
        return {
          success: true,
          message: 'Artículo eliminado correctamente (simulado)'
        };
      }
      
      throw new Error(`Error al eliminar el artículo "${slug}"`);
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Obtener todas las categorías
  async getCategories() {
    try {
      // Intentar obtener datos de la API
      try {
        const response = await fetch(`${this.apiBase}/categories`, {
          headers: this.getAuthHeaders()
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        console.warn(`API no disponible (${response.status}). Usando datos de prueba.`);
      } catch (apiError) {
        console.warn('Error al conectar con la API:', apiError);
      }
      
      // Si llegamos aquí, la API falló o no está disponible
      if (this.useFallbackData) {
        console.info('Usando datos de prueba para categorías');
        return this.getFallbackCategories();
      }
      
      throw new Error('Error al obtener categorías');
    } catch (error) {
      console.error('Error:', error);
      throw error;
    }
  }

  // Datos de prueba para cuando la API no está disponible
  getFallbackArticles() {
    return [
      {
        title: 'Feria de semillas ancestrales',
        description: 'Gran éxito en la primera feria de intercambio de semillas ancestrales',
        pubDate: 'Apr 15 2025',
        heroImage: '/uploads/2025/04/feria-semillas-hero.jpg',
        category: 'eventos',
        slug: 'feria-semillas-ancestrales'
      },
      {
        title: 'Nueva técnica de riego sostenible',
        description: 'Innovadora técnica de riego que ahorra hasta un 60% de agua',
        pubDate: 'Apr 10 2025',
        heroImage: '/uploads/2025/04/riego-sostenible.jpg',
        category: 'tecnologia-rural',
        slug: 'tecnica-riego-sostenible'
      },
      {
        title: 'Récord en producción de café orgánico',
        description: 'Cooperativa local logra récord de producción con prácticas sostenibles',
        pubDate: 'Apr 02 2025',
        heroImage: '/uploads/2025/04/cafe-organico.jpg',
        category: 'agricultura',
        slug: 'record-cafe-organico'
      }
    ];
  }

  // Obtener un artículo de prueba específico
  getFallbackArticle(slug) {
    const articles = this.getFallbackArticles();
    const article = articles.find(a => a.slug === slug);
    
    if (article) {
      return {
        ...article,
        content: `# ${article.title}\n\nEste es un contenido de ejemplo para el artículo "${article.title}". En un entorno de producción, este contenido vendría de la API.`
      };
    }
    
    return {
      title: 'Artículo de ejemplo',
      description: 'Este es un artículo de ejemplo generado localmente',
      pubDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      heroImage: '/blog-placeholder-1.jpg',
      category: 'general',
      slug: slug,
      content: `# Artículo de ejemplo\n\nEste es un contenido de ejemplo generado localmente porque no se pudo encontrar el artículo "${slug}" en la API.`
    };
  }

  // Obtener categorías de prueba
  getFallbackCategories() {
    return [
      {
        id: 'agricultura',
        name: 'Agricultura',
        description: 'Noticias sobre prácticas agrícolas, cultivos y temporadas'
      },
      {
        id: 'comunidad',
        name: 'Comunidad',
        description: 'Historias de miembros, cooperación y testimonios'
      },
      {
        id: 'sostenibilidad',
        name: 'Sostenibilidad',
        description: 'Prácticas ecológicas, conservación y biodiversidad'
      },
      {
        id: 'politica-agraria',
        name: 'Política Agraria',
        description: 'Legislación, derechos y movimientos sociales'
      },
      {
        id: 'tecnologia-rural',
        name: 'Tecnología Rural',
        description: 'Innovaciones, herramientas y digitalización'
      },
      {
        id: 'cultura',
        name: 'Cultura',
        description: 'Tradiciones, gastronomía y artesanía'
      },
      {
        id: 'eventos',
        name: 'Eventos',
        description: 'Ferias, encuentros y capacitaciones'
      }
    ];
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
