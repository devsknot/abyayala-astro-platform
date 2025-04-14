// API para gestionar el registro de actividades
import { corsHeaders } from '../../utils/cors.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Manejar solicitudes OPTIONS para CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  // Verificar autenticación
  const authenticated = await verifyAuthentication(request, env);
  
  try {
    console.log(`Solicitud recibida: ${request.method} ${path}`);
    
    // Ruta raíz /api/content/activities
    if (path === '/api/content/activities' || path === '/api/content/activities/') {
      if (request.method === 'GET') {
        // Obtener actividades (no requiere autenticación)
        return handleGetActivities(env, corsHeaders);
      } else if (request.method === 'POST' && authenticated) {
        // Registrar nueva actividad (requiere autenticación)
        return handleCreateActivity(await request.json(), env, corsHeaders);
      }
    }
    
    // Si llegamos aquí, la ruta no coincide con ninguna de las esperadas
    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error en API de actividades:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Error al procesar la solicitud',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Verificar autenticación (misma lógica que en otros endpoints)
async function verifyAuthentication(request, env) {
  // En un entorno de desarrollo, permitir acceso sin autenticación
  if (env.ENVIRONMENT === 'development') {
    return true;
  }
  
  // Para solicitudes GET, permitir acceso sin autenticación
  if (request.method === 'GET') {
    return true;
  }
  
  // En producción, verificar cabeceras de Cloudflare Access
  const jwt = request.headers.get('CF-Access-Jwt-Assertion');
  const clientId = request.headers.get('CF-Access-Client-Id');
  
  // Para solicitudes desde el panel de administración en desarrollo
  if (clientId === 'development-client-id') {
    return true;
  }
  
  // Verificar token de autorización Bearer
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }
  
  return !!jwt; // Verificar que existe el token JWT
}

// Obtener actividades recientes
async function handleGetActivities(env, headers) {
  try {
    // Obtener parámetros de consulta
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const entityType = url.searchParams.get('entity_type');
    const type = url.searchParams.get('type');
    
    // Construir la consulta SQL base
    let query = `
      SELECT id, type, entity_type, entity_id, entity_title, user_name, details, created_at
      FROM activities
      WHERE 1=1
    `;
    
    // Añadir filtros si se especifican
    const params = [];
    if (entityType) {
      query += ` AND entity_type = ?`;
      params.push(entityType);
    }
    
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    // Añadir ordenamiento y límites
    query += `
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    params.push(limit, offset);
    
    // Ejecutar la consulta
    const activities = await env.DB.prepare(query).bind(...params).all();
    
    // Procesar los resultados
    const processedActivities = activities.results.map(activity => {
      // Convertir el campo details de JSON string a objeto si existe
      if (activity.details) {
        try {
          activity.details = JSON.parse(activity.details);
        } catch (e) {
          // Si no es un JSON válido, dejarlo como está
          console.warn(`No se pudo parsear details para actividad ${activity.id}`);
        }
      }
      
      // Calcular tiempo relativo
      activity.relative_time = getRelativeTime(activity.created_at);
      
      return activity;
    });
    
    return new Response(JSON.stringify(processedActivities), {
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}

// Registrar una nueva actividad
async function handleCreateActivity(activityData, env, headers) {
  try {
    // Validar datos
    if (!activityData.type || !activityData.entity_type) {
      return new Response(JSON.stringify({ error: 'Tipo de actividad y entidad son obligatorios' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    }
    
    // Convertir details a JSON string si es un objeto
    let details = activityData.details || null;
    if (details && typeof details === 'object') {
      details = JSON.stringify(details);
    }
    
    // Insertar la actividad en la base de datos
    const result = await env.DB.prepare(`
      INSERT INTO activities (
        type, entity_type, entity_id, entity_title, user_id, user_name, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      activityData.type,
      activityData.entity_type,
      activityData.entity_id || null,
      activityData.entity_title || null,
      activityData.user_id || null,
      activityData.user_name || 'Sistema',
      details
    ).run();
    
    if (result.success) {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Actividad registrada correctamente'
      }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
    } else {
      throw new Error('Error al registrar la actividad');
    }
  } catch (error) {
    console.error('Error al registrar actividad:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
}

// Función auxiliar para calcular tiempo relativo
function getRelativeTime(dateString) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
      return `${Math.floor(diffDays / 30)} meses atrás`;
    } else if (diffDays > 0) {
      return `${diffDays} días atrás`;
    } else if (diffHours > 0) {
      return `${diffHours} horas atrás`;
    } else if (diffMins > 0) {
      return `${diffMins} minutos atrás`;
    } else {
      return 'Justo ahora';
    }
  } catch (e) {
    console.error('Error al calcular tiempo relativo:', e);
    return 'Fecha desconocida';
  }
}
