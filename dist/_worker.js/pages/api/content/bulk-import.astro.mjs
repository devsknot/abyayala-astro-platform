globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../../renderers.mjs';

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production if needed
  "Content-Type": "application/json"
};
async function POST(context) {
  console.log(`[bulk-import.ts] POST invoked.`);
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  const authenticated = await verifyAuthentication(context.request, env);
  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: commonHeaders
    });
  }
  try {
    const requestData = await context.request.json();
    if (!requestData || !requestData.articles || !Array.isArray(requestData.articles) || requestData.articles.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid data format. Expected { "articles": [...] }' }), {
        status: 400,
        headers: commonHeaders
      });
    }
    const results = await processArticles(db, requestData.articles);
    return new Response(JSON.stringify(results), {
      headers: commonHeaders
    });
  } catch (error) {
    console.error("Error in bulk import:", error);
    if (error instanceof SyntaxError) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: commonHeaders
      });
    }
    return new Response(JSON.stringify({
      error: "Error processing the request",
      details: error.message
    }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function OPTIONS(context) {
  console.log(`[bulk-import.ts] OPTIONS invoked.`);
  return new Response(null, {
    status: 204,
    headers: {
      ...commonHeaders,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id",
      "Access-Control-Max-Age": "86400"
    }
  });
}
async function verifyAuthentication(request, env) {
  if (env.ENVIRONMENT === "development") {
    console.log("Auth check (Bulk Import): Development environment, access granted.");
    return true;
  }
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  const authHeader = request.headers.get("Authorization");
  const hasBearer = authHeader && authHeader.startsWith("Bearer ");
  console.log(`Auth check (Bulk Import): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
  return !!jwt || hasBearer;
}
async function processArticles(db, articles) {
  const results = {
    total: articles.length,
    processed: 0,
    success: [],
    errors: [],
    authors: {
      created: [],
      linked: []
    }
  };
  for (const article of articles) {
    try {
      if (!article.title) {
        results.errors.push({
          title: article.title || "Artículo sin título",
          error: "El título es obligatorio"
        });
        continue;
      }
      let slug;
      if (!article.slug) {
        slug = generateSlug(article.title);
      } else {
        slug = generateSlug(article.slug);
      }
      const existingArticle = await db.prepare("SELECT id FROM articles WHERE slug = ?").bind(slug).first();
      if (existingArticle) {
        results.errors.push({
          title: article.title,
          slug,
          error: `Ya existe un artículo con el slug "${slug}"`
        });
        continue;
      }
      let pubDate;
      try {
        pubDate = article.pubDate ? new Date(article.pubDate) : /* @__PURE__ */ new Date();
        if (isNaN(pubDate.getTime())) {
          console.warn(`Invalid pubDate for article "${article.title}", using current date.`);
          pubDate = /* @__PURE__ */ new Date();
        }
      } catch (e) {
        console.warn(`Error parsing pubDate for article "${article.title}", using current date.`);
        pubDate = /* @__PURE__ */ new Date();
      }
      let authorId = null;
      if (article.author) {
        const authorName = article.author.trim();
        const authorSlug = generateSlug(authorName);
        const existingAuthor = await db.prepare("SELECT id FROM authors WHERE slug = ? OR name = ?").bind(authorSlug, authorName).first();
        if (existingAuthor) {
          authorId = existingAuthor.id;
          if (!results.authors.linked.some((a) => a.id === authorId)) {
            results.authors.linked.push({ name: authorName, slug: authorSlug, id: authorId });
          }
        } else {
          try {
            const authorResult = await db.prepare("INSERT INTO authors (slug, name, bio) VALUES (?, ?, ?)").bind(authorSlug, authorName, article.authorBio || `Autor de "${article.title}"`).run();
            if (authorResult.success && authorResult.meta.last_row_id) {
              authorId = authorResult.meta.last_row_id;
              results.authors.created.push({ name: authorName, slug: authorSlug, id: authorId });
            } else {
              console.error(`Failed to create author: ${authorName}`);
            }
          } catch (authorError) {
            console.error(`Error creating author "${authorName}":`, authorError);
            results.errors.push({
              title: article.title,
              error: `Error al crear/buscar autor "${authorName}": ${authorError.message}`
            });
          }
        }
      }
      const insertResult = await db.prepare(`
                    INSERT INTO articles (
                        title, slug, content, category_id, author_id, pub_date,
                        image_url, image_alt, status, meta_description, meta_keywords
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
        article.title,
        slug,
        article.content || "",
        article.category_id || null,
        // Assuming category_id is provided or null
        authorId,
        pubDate.toISOString(),
        // Store as ISO string
        article.image_url || null,
        article.image_alt || "",
        article.status || "published",
        // Default status
        article.meta_description || null,
        article.meta_keywords || null
      ).run();
      if (insertResult.success && insertResult.meta.last_row_id) {
        results.success.push({ title: article.title, slug, id: insertResult.meta.last_row_id });
        results.processed++;
      } else {
        results.errors.push({
          title: article.title,
          slug,
          error: "Error al insertar el artículo en la base de datos"
        });
      }
    } catch (processError) {
      console.error(`Error processing article "${article.title || "Sin título"}":`, processError);
      results.errors.push({
        title: article.title || "Artículo con error",
        error: `Error interno: ${processError.message}`
      });
    }
  }
  return results;
}
function generateSlug(title) {
  if (!title) return `articulo-${Date.now()}`;
  const normalized = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || `articulo-${Date.now()}`;
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    OPTIONS,
    POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
