// Función para gestionar el contenido (artículos) a través de Cloudflare Functions
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/content', '');
  
  // Verificar autenticación
  const authenticated = await verifyAuthentication(request, env);
  if (!authenticated) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Manejar diferentes rutas y métodos
  if (path === '/articles' || path === '/articles/') {
    if (request.method === 'GET') {
      return handleGetArticles(env);
    } else if (request.method === 'POST') {
      return handleCreateArticle(await request.json(), env);
    }
  } else if (path.startsWith('/articles/')) {
    const slug = path.replace('/articles/', '');
    
    if (request.method === 'GET') {
      return handleGetArticle(slug, env);
    } else if (request.method === 'PUT') {
      return handleUpdateArticle(slug, await request.json(), env);
    } else if (request.method === 'DELETE') {
      return handleDeleteArticle(slug, env);
    }
  } else if (path === '/categories' || path === '/categories/') {
    return handleGetCategories(env);
  }
  
  return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Verificar autenticación
async function verifyAuthentication(request, env) {
  // En una implementación real, verificaríamos el token JWT de Cloudflare Access
  const jwt = request.headers.get('CF-Access-Jwt-Assertion');
  return !!jwt; // Por ahora, simplemente verificamos que exista el token
}

// Obtener todos los artículos
async function handleGetArticles(env) {
  try {
    // En una implementación real, obtendríamos los artículos de GitHub o D1
    // Por ahora, devolvemos datos de ejemplo
    const articles = [
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
    
    return new Response(JSON.stringify(articles), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Obtener un artículo específico
async function handleGetArticle(slug, env) {
  try {
    // En una implementación real, obtendríamos el artículo de GitHub o D1
    // Por ahora, devolvemos datos de ejemplo
    const article = {
      title: 'Feria de semillas ancestrales',
      description: 'Gran éxito en la primera feria de intercambio de semillas ancestrales',
      pubDate: 'Apr 15 2025',
      heroImage: '/uploads/2025/04/feria-semillas-hero.jpg',
      category: 'eventos',
      slug: 'feria-semillas-ancestrales',
      content: `# Feria de semillas ancestrales

El pasado fin de semana se celebró con gran éxito la primera feria de intercambio de semillas ancestrales organizada por nuestro colectivo. Más de 200 agricultores de la región participaron en este evento que busca preservar la biodiversidad agrícola local.

## Variedades recuperadas

Durante la feria se presentaron más de 50 variedades de semillas tradicionales que estaban en peligro de desaparecer:

- Maíz azul andino
- Quinoa roja
- Frijoles pintados
- Papas nativas de altura

### Testimonios

> "Estas semillas han estado en mi familia por generaciones. Poder compartirlas y asegurar que seguirán cultivándose es una alegría inmensa" - María Quispe, agricultora local.

## Próximos eventos

Ante el éxito de esta primera edición, ya estamos organizando la próxima feria que se realizará en octubre. ¡No te la pierdas!`
    };
    
    return new Response(JSON.stringify(article), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Crear un nuevo artículo
async function handleCreateArticle(articleData, env) {
  try {
    // En una implementación real, crearíamos el archivo en GitHub
    // Por ahora, simulamos una respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo creado correctamente',
      article: {
        ...articleData,
        createdAt: new Date().toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Actualizar un artículo existente
async function handleUpdateArticle(slug, articleData, env) {
  try {
    // En una implementación real, actualizaríamos el archivo en GitHub
    // Por ahora, simulamos una respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo actualizado correctamente',
      article: {
        ...articleData,
        updatedAt: new Date().toISOString()
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Eliminar un artículo
async function handleDeleteArticle(slug, env) {
  try {
    // En una implementación real, eliminaríamos el archivo de GitHub
    // Por ahora, simulamos una respuesta exitosa
    return new Response(JSON.stringify({
      success: true,
      message: 'Artículo eliminado correctamente'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Obtener todas las categorías
async function handleGetCategories(env) {
  try {
    // Categorías predefinidas para el proyecto Abya Yala
    const categories = [
      { id: 'agricultura', name: 'Agricultura' },
      { id: 'comunidad', name: 'Comunidad' },
      { id: 'sostenibilidad', name: 'Sostenibilidad' },
      { id: 'politica-agraria', name: 'Política Agraria' },
      { id: 'tecnologia-rural', name: 'Tecnología Rural' },
      { id: 'cultura', name: 'Cultura' },
      { id: 'eventos', name: 'Eventos' }
    ];
    
    return new Response(JSON.stringify(categories), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
