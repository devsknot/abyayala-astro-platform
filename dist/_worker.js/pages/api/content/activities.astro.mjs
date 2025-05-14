globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../../renderers.mjs';

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production if needed
  "Content-Type": "application/json"
};
async function GET(context) {
  console.log(`[activities/index.ts] GET invoked.`);
  const db = context.locals.runtime.env.DB;
  try {
    const url = new URL(context.request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const entityType = url.searchParams.get("entity_type");
    const type = url.searchParams.get("type");
    return await handleGetActivities(db, limit, offset, entityType, type, commonHeaders);
  } catch (error) {
    console.error("Error in GET /api/content/activities:", error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function POST(context) {
  console.log(`[activities/index.ts] POST invoked.`);
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  try {
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: commonHeaders
      });
    }
    const activityData = await context.request.json();
    return handleCreateActivity(activityData, db, commonHeaders);
  } catch (error) {
    console.error("Error in POST /api/content/activities:", error);
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: commonHeaders
      });
    }
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function OPTIONS(context) {
  console.log(`[activities/index.ts] OPTIONS invoked.`);
  return new Response(null, {
    status: 204,
    headers: {
      ...commonHeaders,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id",
      "Access-Control-Max-Age": "86400"
    }
  });
}
async function verifyAuthentication(request, env) {
  if (env.ENVIRONMENT === "development") {
    console.log("Auth check (Activity): Development environment, access granted.");
    return true;
  }
  if (request.method === "GET") {
    return true;
  }
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  const authHeader = request.headers.get("Authorization");
  const hasBearer = authHeader && authHeader.startsWith("Bearer ");
  console.log(`Auth check (Activity): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
  return !!jwt || hasBearer;
}
async function handleGetActivities(db, limit, offset, entityType, type, headers) {
  try {
    let query = `
            SELECT id, type, entity_type, entity_id, entity_title, user_name, details, created_at
            FROM activities
            WHERE 1=1
        `;
    const params = [];
    if (entityType) {
      query += ` AND entity_type = ?`;
      params.push(entityType);
    }
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    const { results } = await db.prepare(query).bind(...params).all();
    const processedActivities = results.map((activity) => {
      if (activity.details) {
        try {
          activity.details = JSON.parse(activity.details);
        } catch (e) {
          console.warn(`Could not parse details JSON for activity ${activity.id}: ${activity.details}`);
        }
      }
      activity.relative_time = getRelativeTime(activity.created_at);
      return activity;
    });
    return new Response(JSON.stringify(processedActivities || []), { headers });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch activities" }), { status: 500, headers });
  }
}
async function handleCreateActivity(activityData, db, headers) {
  if (!activityData || !activityData.type || !activityData.entity_type) {
    return new Response(JSON.stringify({ error: "Type and entity_type are required" }), {
      status: 400,
      headers
    });
  }
  try {
    let details = activityData.details || null;
    if (details && typeof details === "object") {
      try {
        details = JSON.stringify(details);
      } catch (e) {
        console.error("Failed to stringify activity details:", e);
        return new Response(JSON.stringify({ error: "Invalid details format" }), {
          status: 400,
          headers
        });
      }
    }
    const result = await db.prepare(`
            INSERT INTO activities (type, entity_type, entity_id, entity_title, user_id, user_name, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
      activityData.type,
      activityData.entity_type,
      activityData.entity_id || null,
      activityData.entity_title || "",
      activityData.user_id || null,
      activityData.user_name || "Sistema",
      details
    ).run();
    return new Response(JSON.stringify({
      success: true,
      message: "Activity logged successfully",
      id: result.meta.last_row_id
    }), {
      status: 201,
      // Created
      headers
    });
  } catch (error) {
    console.error("Error creating activity:", error);
    return new Response(JSON.stringify({ error: "Failed to log activity" }), {
      status: 500,
      headers
    });
  }
}
function getRelativeTime(dateString) {
  if (!dateString) return "Fecha desconocida";
  try {
    const date = new Date(dateString);
    const now = /* @__PURE__ */ new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1e3);
    const units = [
      { name: "año", seconds: 31536e3 },
      { name: "mes", seconds: 2592e3 },
      { name: "semana", seconds: 604800 },
      { name: "día", seconds: 86400 },
      { name: "hora", seconds: 3600 },
      { name: "minuto", seconds: 60 }
    ];
    for (const unit of units) {
      const interval = Math.floor(diffInSeconds / unit.seconds);
      if (interval >= 1) {
        const plural = interval > 1 ? "s" : "";
        return `Hace ${interval} ${unit.name}${plural}`;
      }
    }
    return "Hace un momento";
  } catch (e) {
    console.error(`Error parsing date for relative time: ${dateString}`, e);
    return "Fecha inválida";
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    OPTIONS,
    POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
