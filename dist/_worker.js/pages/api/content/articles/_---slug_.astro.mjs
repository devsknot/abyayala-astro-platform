globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../../../renderers.mjs';

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production if needed
  "Content-Type": "application/json"
};
function transformArticleForFrontend(article) {
  if (!article) return null;
  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    content: article.content,
    pubDate: article.pub_date,
    // Transform pub_date to pubDate
    // category: article.category, // Original was category, seems redundant if categories is present?
    categories: article.categories ? JSON.parse(article.categories) : [],
    // Assuming categories is a JSON array string
    featured_image: article.featured_image,
    author_info: article.author_id ? {
      // Use author_info for structured data
      id: article.author_id,
      name: article.author_name,
      slug: article.author_slug,
      avatar: article.author_avatar
    } : null,
    tags: article.tags ? JSON.parse(article.tags) : []
    // Include other fields if necessary
  };
}
async function GET(context) {
  console.log(`[articles/...slug.ts] GET invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  context.locals.runtime.env;
  try {
    if (slug) {
      return handleGetArticle(slug, db, commonHeaders);
    } else {
      return handleGetArticles(db, commonHeaders);
    }
  } catch (error) {
    console.error("Error in GET /api/content/articles:", error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function POST(context) {
  console.log(`[articles/...slug.ts] POST invoked.`);
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
    const articleData = await context.request.json();
    return handleCreateArticle(articleData, db, commonHeaders);
  } catch (error) {
    console.error("Error in POST /api/content/articles:", error);
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
async function PUT(context) {
  console.log(`[articles/...slug.ts] PUT invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing article slug for update" }), {
      status: 400,
      headers: commonHeaders
    });
  }
  try {
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: commonHeaders
      });
    }
    const articleData = await context.request.json();
    return handleUpdateArticle(slug, articleData, db, commonHeaders);
  } catch (error) {
    console.error(`Error in PUT /api/content/articles/${slug}:`, error);
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
async function DELETE(context) {
  console.log(`[articles/...slug.ts] DELETE invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing article slug for delete" }), {
      status: 400,
      headers: commonHeaders
    });
  }
  try {
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: commonHeaders
      });
    }
    return handleDeleteArticle(slug, db, commonHeaders);
  } catch (error) {
    console.error(`Error in DELETE /api/content/articles/${slug}:`, error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function OPTIONS(context) {
  console.log(`[articles/...slug.ts] OPTIONS invoked.`);
  return new Response(null, {
    status: 204,
    headers: {
      ...commonHeaders,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id",
      "Access-Control-Max-Age": "86400"
    }
  });
}
async function verifyAuthentication(request, env) {
  if (env.ENVIRONMENT === "development") {
    console.log("Auth check (Article): Development environment, access granted.");
    return true;
  }
  if (request.method === "GET") {
    console.log("Auth check (Article): GET request, access granted.");
    return true;
  }
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  console.log(`Auth check (Article): Production. JWT found: ${!!jwt}`);
  return !!jwt;
}
async function handleGetArticles(db, headers) {
  try {
    const { results } = await db.prepare(`
            SELECT a.*,
                   aut.id as author_id,
                   aut.name as author_name,
                   aut.slug as author_slug,
                   aut.avatar as author_avatar
            FROM articles a
            LEFT JOIN authors aut ON a.author_id = aut.id
            ORDER BY a.pub_date DESC
        `).all();
    const transformedResults = results.map(transformArticleForFrontend);
    return new Response(JSON.stringify(transformedResults || []), { headers });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch articles" }), { status: 500, headers });
  }
}
async function handleGetArticle(slug, db, headers) {
  try {
    const article = await db.prepare(`
            SELECT a.*,
                   aut.id as author_id,
                   aut.name as author_name,
                   aut.slug as author_slug,
                   aut.avatar as author_avatar
            FROM articles a
            LEFT JOIN authors aut ON a.author_id = aut.id
            WHERE a.slug = ?
        `).bind(slug).first();
    if (!article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers
      });
    }
    return new Response(JSON.stringify(transformArticleForFrontend(article)), { headers });
  } catch (error) {
    console.error(`Error fetching article ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to fetch article" }), { status: 500, headers });
  }
}
async function handleCreateArticle(articleData, db, headers) {
  if (!articleData || !articleData.slug || !articleData.title) {
    return new Response(JSON.stringify({ error: "Slug and title are required" }), {
      status: 400,
      headers
    });
  }
  try {
    const existingArticle = await db.prepare(`SELECT slug FROM articles WHERE slug = ?`).bind(articleData.slug).first();
    if (existingArticle) {
      return new Response(JSON.stringify({ error: "Article slug already exists" }), {
        status: 409,
        headers
      });
    }
    let pubDate = articleData.pubDate || (/* @__PURE__ */ new Date()).toISOString();
    try {
      pubDate = new Date(pubDate).toISOString();
    } catch (e) {
      console.warn(`Invalid pubDate format received: ${articleData.pubDate}. Using current date.`);
      pubDate = (/* @__PURE__ */ new Date()).toISOString();
    }
    const categoriesString = JSON.stringify(articleData.categories || []);
    const tagsString = JSON.stringify(articleData.tags || []);
    const result = await db.prepare(`
            INSERT INTO articles (slug, title, description, content, pub_date, categories, featured_image, author_id, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
      articleData.slug,
      articleData.title,
      articleData.description || "",
      articleData.content || "",
      pubDate,
      categoriesString,
      // Store as JSON string
      articleData.featured_image || "",
      articleData.author_id || null,
      // Expecting author_id from frontend now
      tagsString
      // Store as JSON string
    ).run();
    const newArticleRaw = await db.prepare(`
            SELECT a.*, aut.id as author_id, aut.name as author_name, aut.slug as author_slug, aut.avatar as author_avatar
            FROM articles a LEFT JOIN authors aut ON a.author_id = aut.id
            WHERE a.slug = ?
        `).bind(articleData.slug).first();
    return new Response(JSON.stringify({
      success: true,
      message: "Article created successfully",
      article: transformArticleForFrontend(newArticleRaw)
    }), {
      status: 201,
      headers
    });
  } catch (error) {
    console.error("Error creating article:", error);
    return new Response(JSON.stringify({ error: "Failed to create article" }), {
      status: 500,
      headers
    });
  }
}
async function handleUpdateArticle(slug, articleData, db, headers) {
  if (!articleData || Object.keys(articleData).length === 0) {
    return new Response(JSON.stringify({ error: "No update data provided" }), {
      status: 400,
      headers
    });
  }
  if (articleData.slug && articleData.slug !== slug) {
    return new Response(JSON.stringify({ error: "Changing slug via PUT is not supported" }), {
      status: 400,
      headers
    });
  }
  try {
    const articleExists = await db.prepare(`SELECT slug FROM articles WHERE slug = ?`).bind(slug).first();
    if (!articleExists) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers
      });
    }
    let setClauses = [];
    let bindings = [];
    const fieldMapping = {
      title: "title",
      description: "description",
      content: "content",
      featured_image: "featured_image",
      author_id: "author_id"
      // Expecting author_id from frontend
    };
    for (const key in fieldMapping) {
      if (articleData.hasOwnProperty(key)) {
        setClauses.push(`${fieldMapping[key]} = ?`);
        bindings.push(articleData[key]);
      }
    }
    if (articleData.hasOwnProperty("pubDate")) {
      try {
        const formattedDate = new Date(articleData.pubDate).toISOString();
        setClauses.push("pub_date = ?");
        bindings.push(formattedDate);
      } catch (e) {
        console.warn(`Invalid pubDate format received for update: ${articleData.pubDate}. Skipping date update.`);
      }
    }
    if (articleData.hasOwnProperty("categories") && Array.isArray(articleData.categories)) {
      setClauses.push("categories = ?");
      bindings.push(JSON.stringify(articleData.categories));
    }
    if (articleData.hasOwnProperty("tags") && Array.isArray(articleData.tags)) {
      setClauses.push("tags = ?");
      bindings.push(JSON.stringify(articleData.tags));
    }
    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields provided for update" }), {
        status: 400,
        headers
      });
    }
    bindings.push(slug);
    const query = `UPDATE articles SET ${setClauses.join(", ")} WHERE slug = ?`;
    await db.prepare(query).bind(...bindings).run();
    const updatedArticleRaw = await db.prepare(`
             SELECT a.*, aut.id as author_id, aut.name as author_name, aut.slug as author_slug, aut.avatar as author_avatar
             FROM articles a LEFT JOIN authors aut ON a.author_id = aut.id
             WHERE a.slug = ?
        `).bind(slug).first();
    return new Response(JSON.stringify({
      success: true,
      message: "Article updated successfully",
      article: transformArticleForFrontend(updatedArticleRaw)
    }), { headers });
  } catch (error) {
    console.error(`Error updating article ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to update article" }), {
      status: 500,
      headers
    });
  }
}
async function handleDeleteArticle(slug, db, headers) {
  try {
    const articleExists = await db.prepare(`SELECT slug FROM articles WHERE slug = ?`).bind(slug).first();
    if (!articleExists) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers
      });
    }
    const result = await db.prepare(`DELETE FROM articles WHERE slug = ?`).bind(slug).run();
    if (result.changes > 0) {
      return new Response(JSON.stringify({ success: true, message: "Article deleted successfully" }), {
        status: 200,
        // OK for delete success
        headers
      });
    } else {
      return new Response(JSON.stringify({ error: "Article not found or already deleted" }), {
        status: 404,
        headers
      });
    }
  } catch (error) {
    console.error(`Error deleting article ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to delete article" }), {
      status: 500,
      headers
    });
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    OPTIONS,
    POST,
    PUT
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
