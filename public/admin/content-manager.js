// Gestor de contenido para el CMS
export class ContentManager {
  constructor() {
    // Obtener la base URL dinámicamente para construir rutas absolutas
    this.baseUrl = window.location.origin;
    // Construir ruta absoluta para la API
    this.apiBase = `${this.baseUrl}/api/content`;
    // Nunca usar datos de prueba, siempre conectar con la API real
    this.useFallbackData = false;
    
    // Usar rutas absolutas para evitar problemas de resolución
    console.log('Usando API con ruta absoluta para mayor compatibilidad:', this.apiBase);
  }

  // Método para obtener las cabeceras de autenticación
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
    
    console.log('ContentManager: Verificando autenticación...');
    
    // Obtener cookies por si los tokens están ahí (caso común con Cloudflare Access)
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    // 1. Intentar obtener datos de autenticación del localStorage (formato usado en app.js)
    const authData = localStorage.getItem('abyayala_cms_auth');
    
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        console.log('ContentManager: Usando datos de autenticación de localStorage');
        
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
        console.error('ContentManager: Error al parsear datos de autenticación:', e);
      }
    }
    
    // 2. Verificar si hay tokens de Cloudflare Access directamente en localStorage (formato anterior)
    const cfAccessToken = localStorage.getItem('cf_access_token');
    const cfAccessClientId = localStorage.getItem('cf_access_client_id');
    
    if (cfAccessToken && !headers['CF-Access-Jwt-Assertion']) {
      console.log('ContentManager: Usando tokens de Cloudflare Access de localStorage');
      headers['CF-Access-Client-Id'] = cfAccessClientId || 'browser-client';
      headers['CF-Access-Jwt-Assertion'] = cfAccessToken;
    }
    
    // 3. Verificar si hay tokens en cookies
    if (cookies['CF_Authorization'] && !headers['CF-Access-Jwt-Assertion']) {
      console.log('ContentManager: Usando token de cookie CF_Authorization');
      headers['CF-Access-Jwt-Assertion'] = cookies['CF_Authorization'];
      
      // Si también hay un client-id en las cookies
      if (cookies['CF_Access_Client_Id']) {
        headers['CF-Access-Client-Id'] = cookies['CF_Access_Client_Id'];
      } else {
        // Usar un ID genérico para producción
        headers['CF-Access-Client-Id'] = 'browser-client'; 
      }
    }
    
    // 4. Verificar si hay un token en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('cf_access_token');
    
    if (tokenParam && !headers['CF-Access-Jwt-Assertion']) {
      console.log('ContentManager: Usando token de parámetro URL');
      headers['CF-Access-Jwt-Assertion'] = tokenParam;
      headers['CF-Access-Client-Id'] = 'browser-client';
      
      // Guardar para futuros usos
      localStorage.setItem('cf_access_token', tokenParam);
      localStorage.setItem('cf_access_client_id', 'browser-client');
    }
    
    // 5. En desarrollo local, usar cabeceras simuladas si no hay otras credenciales
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
        !headers['Authorization'] && !headers['CF-Access-Jwt-Assertion']) {
      console.log('ContentManager: Usando tokens simulados para desarrollo local');
      headers['CF-Access-Client-Id'] = 'development-client-id';
      headers['CF-Access-Jwt-Assertion'] = 'development-token';
    }
    
    // Comprobar si tenemos los headers necesarios
    if (headers['CF-Access-Jwt-Assertion']) {
      console.log('ContentManager: Headers de autenticación configurados correctamente');
    } else {
      console.warn('ContentManager: No se pudieron configurar headers de autenticación completos');
    }
    
    console.log('ContentManager: Headers de autenticación:', JSON.stringify(headers));
    
    return headers;
  }

  // Obtener todos los artículos con soporte para paginación y filtros
  async getArticles(params = {}) {
    try {
      console.log('ContentManager.getArticles - Parámetros recibidos:', params);
      
      // Determinar si estamos haciendo una búsqueda o simplemente listando artículos
      const isSearch = (params.search && params.search.trim() !== '') || (params.category && params.category.trim() !== '');
      
      // Usar el endpoint de búsqueda si hay parámetros de búsqueda
      let url = isSearch ? `${this.apiBase}/articles/search` : `${this.apiBase}/articles`;
      
      console.log(`ContentManager.getArticles - Usando endpoint: ${isSearch ? 'búsqueda' : 'listado'} (${url})`);
      
      // Añadir parámetros de consulta si existen
      if (Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams();
        
        // Parámetros de paginación
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('pageSize', params.limit); // Usar pageSize para el endpoint de búsqueda
        if (params.pageSize) queryParams.append('pageSize', params.pageSize);
        
        // Parámetros de ordenación
        if (params.sortBy) queryParams.append('sortBy', params.sortBy);
        if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        
        // Parámetros de filtrado
        if (params.search && params.search.trim() !== '') {
          console.log('ContentManager.getArticles - Aplicando filtro de búsqueda:', params.search);
          queryParams.append('query', params.search.trim()); // Usar 'query' para el endpoint de búsqueda
        }
        
        if (params.category && params.category.trim() !== '') {
          console.log('ContentManager.getArticles - Aplicando filtro de categoría:', params.category);
          queryParams.append('category', params.category.trim());
        }
        
        // Añadir parámetros a la URL
        url = `${url}?${queryParams.toString()}`;
      }
      
      console.log(`ContentManager.getArticles - URL de solicitud: ${url}`);
      
      const response = await fetch(url, {
        headers: this.getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Respuesta de la API de artículos:', data);
        
        // Verificar si la respuesta tiene el formato esperado
        if (data.articles && Array.isArray(data.articles)) {
          // Devolver la respuesta completa con paginación
          return {
            articles: data.articles,
            pagination: data.pagination || {
              page: params.page || 1,
              limit: params.limit || 10,
              total: data.articles.length,
              totalPages: Math.ceil(data.articles.length / (params.limit || 10))
            }
          };
        } else if (Array.isArray(data)) {
          // Si la API devuelve directamente un array, crear estructura de paginación
          return {
            articles: data,
            pagination: {
              page: params.page || 1,
              limit: params.limit || 10,
              total: data.length,
              totalPages: Math.ceil(data.length / (params.limit || 10))
            }
          };
        } else {
          console.error('Formato de respuesta inesperado:', data);
          return {
            articles: [],
            pagination: {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 0
            }
          };
        }
      }
      
      console.error(`Error al obtener artículos: ${response.status}`);
      return { articles: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    } catch (error) {
      console.error('Error al conectar con la API:', error);
      return { articles: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    }
  }

  // Obtener un artículo por su slug
  async getArticle(slug) {
    try {
      console.log(`ContentManager.getArticle - Solicitando artículo con slug: ${slug}`);
      
      // Intentar primero con el endpoint de news que contiene el contenido completo
      const newsUrl = `${this.baseUrl}/news/${slug}`;
      console.log(`ContentManager.getArticle - Intentando primero con URL de frontend: ${newsUrl}`);
      
      try {
        const newsResponse = await fetch(newsUrl);
        if (newsResponse.ok) {
          // Extraer el contenido HTML de la página
          const htmlContent = await newsResponse.text();
          console.log('ContentManager.getArticle - Respuesta de news recibida, extrayendo datos');
          
          // Buscar el artículo en el HTML usando regex para extraer el JSON incrustado
          const articleDataMatch = htmlContent.match(/window\.article\s*=\s*(\{[\s\S]*?\});/);
          if (articleDataMatch && articleDataMatch[1]) {
            try {
              // Limpiar y parsear el JSON
              const cleanJson = articleDataMatch[1].replace(/\\n/g, '\n').replace(/\\'/g, "'");
              const articleData = JSON.parse(cleanJson);
              console.log('ContentManager.getArticle - Datos extraídos de la página HTML:', articleData);
              return articleData;
            } catch (parseError) {
              console.error('Error al parsear datos del artículo desde HTML:', parseError);
            }
          }
        }
      } catch (newsError) {
        console.warn('Error al obtener artículo desde news:', newsError);
      }
      
      // Si falla, intentar con el endpoint de la API
      const apiUrl = `${this.apiBase}/articles/${slug}`;
      console.log(`ContentManager.getArticle - Intentando con URL de API: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: this.getAuthHeaders()
      });
      
      console.log(`ContentManager.getArticle - Código de respuesta: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.getArticle - Datos recibidos de API:', data);
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
      
      // Primer intento con los headers actuales
      let response = await fetch(`${this.apiBase}/articles`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articleData)
      });
      
      console.log(`ContentManager.createArticle - Código de respuesta: ${response.status}`);
      
      // Si la respuesta es exitosa, procesar los datos
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.createArticle - Respuesta:', data);
        return data;
      }
      
      // En caso de error 401 (No autorizado), intentar refrescar los tokens
      if (response.status === 401) {
        console.warn('ContentManager.createArticle - Error de autenticación (401). Intentando refrescar tokens...');
        
        // Intentar refrescar tokens
        const refreshed = await this.refreshAuthTokens();
        
        if (refreshed) {
          console.log('ContentManager.createArticle - Tokens refrescados. Reintentando solicitud...');
          
          // Reintentar la solicitud con los nuevos tokens
          response = await fetch(`${this.apiBase}/articles`, {
            method: 'POST',
            headers: this.getAuthHeaders(), // Obtener los headers actualizados
            body: JSON.stringify(articleData)
          });
          
          console.log(`ContentManager.createArticle - Código de respuesta (reintento): ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('ContentManager.createArticle - Respuesta (reintento):', data);
            return data;
          }
        }
      }
      
      // Si llegamos aquí, no se pudo crear el artículo
      let errorMessage = `Error al crear artículo: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.warn('ContentManager.createArticle - No se pudo parsear respuesta de error:', parseError);
      }
      
      throw new Error(errorMessage);
    } catch (error) {
      console.error('Error al crear artículo:', error);
      throw error;
    }
  }

  /**
   * Intenta refrescar los tokens de autenticación
   * @returns {Promise<boolean>} - true si se refrescaron los tokens, false en caso contrario
   */
  async refreshAuthTokens() {
    try {
      console.log('ContentManager.refreshAuthTokens - Intentando refrescar tokens...');
      
      // Comprobar si tenemos tokens en cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
      }, {});
      
      if (cookies['CF_Authorization']) {
        console.log('ContentManager.refreshAuthTokens - Encontrado token en cookies');
        
        // Guardar el token en localStorage para futuros usos
        localStorage.setItem('cf_access_token', cookies['CF_Authorization']);
        localStorage.setItem('cf_access_client_id', cookies['CF_Access_Client_Id'] || 'browser-client');
        
        return true;
      }
      
      // Comprobar si hay un token en la URL
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('cf_access_token');
      
      if (tokenParam) {
        console.log('ContentManager.refreshAuthTokens - Encontrado token en URL');
        
        // Guardar el token en localStorage
        localStorage.setItem('cf_access_token', tokenParam);
        localStorage.setItem('cf_access_client_id', 'browser-client');
        
        return true;
      }
      
      // Intentar obtener tokens de la sesión actual (si existe)
      if (window.sessionStorage) {
        const sessionToken = sessionStorage.getItem('cf_access_token');
        if (sessionToken) {
          console.log('ContentManager.refreshAuthTokens - Encontrado token en sessionStorage');
          
          // Guardar en localStorage
          localStorage.setItem('cf_access_token', sessionToken);
          localStorage.setItem('cf_access_client_id', sessionStorage.getItem('cf_access_client_id') || 'browser-client');
          
          return true;
        }
      }
      
      console.warn('ContentManager.refreshAuthTokens - No se encontraron nuevos tokens');
      return false;
    } catch (error) {
      console.error('ContentManager.refreshAuthTokens - Error al refrescar tokens:', error);
      return false;
    }
  }
  
  // Actualizar un artículo existente
  async updateArticle(slug, articleData) {
    try {
      console.log(`ContentManager.updateArticle - Actualizando artículo: ${slug}`);
      console.log('ContentManager.updateArticle - Datos:', articleData);
      
      // Primer intento con los headers actuales
      let response = await fetch(`${this.apiBase}/articles/${slug}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(articleData)
      });
      
      console.log(`ContentManager.updateArticle - Código de respuesta: ${response.status}`);
      
      // Si la respuesta es exitosa, procesar los datos
      if (response.ok) {
        const data = await response.json();
        console.log('ContentManager.updateArticle - Respuesta:', data);
        return data;
      }
      
      // En caso de error 401 (No autorizado), intentar refrescar los tokens
      if (response.status === 401) {
        console.warn('ContentManager.updateArticle - Error de autenticación (401). Intentando refrescar tokens...');
        
        // Intentar refrescar tokens
        const refreshed = await this.refreshAuthTokens();
        
        if (refreshed) {
          console.log('ContentManager.updateArticle - Tokens refrescados. Reintentando solicitud...');
          
          // Reintentar la solicitud con los nuevos tokens
          response = await fetch(`${this.apiBase}/articles/${slug}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(), // Obtener los headers actualizados
            body: JSON.stringify(articleData)
          });
          
          console.log(`ContentManager.updateArticle - Código de respuesta (reintento): ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('ContentManager.updateArticle - Respuesta (reintento):', data);
            return data;
          }
        }
      }
      
      // Si llegamos aquí, no se pudo actualizar el artículo
      let errorMessage = `Error al actualizar artículo: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.warn('ContentManager.updateArticle - No se pudo parsear respuesta de error:', parseError);
      }
      
      throw new Error(errorMessage);
    } catch (error) {
      console.error('Error al actualizar artículo:', error);
      throw error;
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
        const data = await response.json();
        console.log('Respuesta de la API de categorías:', data);
        
        // Usar el nuevo formato estándar con paginación
        if (data.categories && Array.isArray(data.categories)) {
          return data.categories;
        } else if (Array.isArray(data)) {
          // Mantener compatibilidad temporal, pero registrando que aún necesita actualizarse
          console.warn('La API de categorías aún usa formato antiguo sin paginación');
          return data;
        } else {
          console.error('Formato de respuesta inesperado para categorías:', data);
          return [];
        }
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
