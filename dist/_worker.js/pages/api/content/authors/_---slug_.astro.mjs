globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../../../renderers.mjs';

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production if needed
  "Content-Type": "application/json"
};
async function GET(context) {
  console.log(`[authors/...slug.ts] GET invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  context.locals.runtime.env;
  try {
    if (slug) {
      return handleGetAuthor(slug, db, commonHeaders);
    } else {
      return handleGetAuthors(db, commonHeaders);
    }
  } catch (error) {
    console.error("Error in GET /api/content/authors:", error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function POST(context) {
  console.log(`[authors/...slug.ts] POST invoked.`);
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
    const authorData = await context.request.json();
    return handleCreateAuthor(authorData, db, commonHeaders);
  } catch (error) {
    console.error("Error in POST /api/content/authors:", error);
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
  console.log(`[authors/...slug.ts] PUT invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing author slug for update" }), {
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
    const authorData = await context.request.json();
    return handleUpdateAuthor(slug, authorData, db, commonHeaders);
  } catch (error) {
    console.error(`Error in PUT /api/content/authors/${slug}:`, error);
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
  console.log(`[authors/...slug.ts] DELETE invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing author slug for delete" }), {
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
    return handleDeleteAuthor(slug, db, commonHeaders);
  } catch (error) {
    console.error(`Error in DELETE /api/content/authors/${slug}:`, error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function OPTIONS(context) {
  console.log(`[authors/...slug.ts] OPTIONS invoked.`);
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
    console.log("Auth check (Author): Development environment, access granted.");
    return true;
  }
  if (request.method === "GET") {
    console.log("Auth check (Author): GET request, access granted.");
    return true;
  }
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  const authHeader = request.headers.get("Authorization");
  const hasBearer = authHeader && authHeader.startsWith("Bearer ");
  console.log(`Auth check (Author): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
  return !!jwt || hasBearer;
}
async function handleGetAuthors(db, headers) {
  try {
    const { results } = await db.prepare(`
            SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
            FROM authors
            ORDER BY name ASC
        `).all();
    const parsedResults = results.map((author) => {
      try {
        author.social_media = author.social_media ? JSON.parse(author.social_media) : null;
      } catch (e) {
        console.warn(`Failed to parse social_media for author ${author.slug}:`, e);
        author.social_media = null;
      }
      return author;
    });
    return new Response(JSON.stringify(parsedResults || []), { headers });
  } catch (error) {
    console.error("Error fetching authors:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch authors" }), { status: 500, headers });
  }
}
async function handleGetAuthor(slug, db, headers) {
  try {
    const author = await db.prepare(`
            SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
            FROM authors
            WHERE slug = ?
        `).bind(slug).first();
    if (!author) {
      return new Response(JSON.stringify({ error: "Author not found" }), {
        status: 404,
        headers
      });
    }
    const { results: articles } = await db.prepare(`
            SELECT slug, title, description, pub_date, categories, featured_image, tags
            FROM articles
            WHERE author_id = ?
            ORDER BY pub_date DESC
        `).bind(author.id).all();
    try {
      author.social_media = author.social_media ? JSON.parse(author.social_media) : null;
    } catch (e) {
      console.warn(`Failed to parse social_media for author ${author.slug}:`, e);
      author.social_media = null;
    }
    const parsedArticles = articles.map((article) => {
      try {
        article.categories = article.categories ? JSON.parse(article.categories) : [];
      } catch (e) {
        article.categories = [];
      }
      try {
        article.tags = article.tags ? JSON.parse(article.tags) : [];
      } catch (e) {
        article.tags = [];
      }
      return article;
    });
    const responseData = {
      ...author,
      articles: parsedArticles || []
    };
    return new Response(JSON.stringify(responseData), { headers });
  } catch (error) {
    console.error(`Error fetching author ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to fetch author" }), { status: 500, headers });
  }
}
async function handleCreateAuthor(authorData, db, headers) {
  if (!authorData || !authorData.slug || !authorData.name) {
    return new Response(JSON.stringify({ error: "Slug and name are required" }), {
      status: 400,
      headers
    });
  }
  try {
    const existingAuthor = await db.prepare(`SELECT slug FROM authors WHERE slug = ?`).bind(authorData.slug).first();
    if (existingAuthor) {
      return new Response(JSON.stringify({ error: "Author slug already exists" }), {
        status: 409,
        headers
      });
    }
    const socialMediaString = JSON.stringify(authorData.social_media || null);
    const result = await db.prepare(`
            INSERT INTO authors (slug, name, bio, email, avatar, social_media)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
      authorData.slug,
      authorData.name,
      authorData.bio || "",
      authorData.email || "",
      authorData.avatar || "",
      socialMediaString
    ).run();
    const newAuthorRaw = await db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(result.meta.last_row_id).first();
    if (newAuthorRaw) {
      try {
        newAuthorRaw.social_media = newAuthorRaw.social_media ? JSON.parse(newAuthorRaw.social_media) : null;
      } catch (e) {
        newAuthorRaw.social_media = null;
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Author created successfully",
      author: newAuthorRaw
    }), {
      status: 201,
      headers
    });
  } catch (error) {
    console.error("Error creating author:", error);
    return new Response(JSON.stringify({ error: "Failed to create author" }), {
      status: 500,
      headers
    });
  }
}
async function handleUpdateAuthor(slug, authorData, db, headers) {
  if (!authorData || Object.keys(authorData).length === 0) {
    return new Response(JSON.stringify({ error: "No update data provided" }), {
      status: 400,
      headers
    });
  }
  if (authorData.slug && authorData.slug !== slug) {
    return new Response(JSON.stringify({ error: "Changing slug via PUT is not supported" }), {
      status: 400,
      headers
    });
  }
  try {
    const authorExists = await db.prepare(`SELECT id FROM authors WHERE slug = ?`).bind(slug).first();
    if (!authorExists) {
      return new Response(JSON.stringify({ error: "Author not found" }), {
        status: 404,
        headers
      });
    }
    let setClauses = [];
    let bindings = [];
    const fieldMapping = {
      name: "name",
      bio: "bio",
      email: "email",
      avatar: "avatar"
    };
    for (const key in fieldMapping) {
      if (authorData.hasOwnProperty(key)) {
        setClauses.push(`${fieldMapping[key]} = ?`);
        bindings.push(authorData[key]);
      }
    }
    if (authorData.hasOwnProperty("social_media")) {
      setClauses.push("social_media = ?");
      bindings.push(JSON.stringify(authorData.social_media || null));
    }
    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields provided for update" }), {
        status: 400,
        headers
      });
    }
    bindings.push(slug);
    const query = `UPDATE authors SET ${setClauses.join(", ")}, updated_at = datetime('now') WHERE slug = ?`;
    await db.prepare(query).bind(...bindings).run();
    const updatedAuthorRaw = await db.prepare(`SELECT * FROM authors WHERE slug = ?`).bind(slug).first();
    if (updatedAuthorRaw) {
      try {
        updatedAuthorRaw.social_media = updatedAuthorRaw.social_media ? JSON.parse(updatedAuthorRaw.social_media) : null;
      } catch (e) {
        updatedAuthorRaw.social_media = null;
      }
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Author updated successfully",
      author: updatedAuthorRaw
    }), { headers });
  } catch (error) {
    console.error(`Error updating author ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to update author" }), {
      status: 500,
      headers
    });
  }
}
async function handleDeleteAuthor(slug, db, headers) {
  try {
    const author = await db.prepare(`SELECT id FROM authors WHERE slug = ?`).bind(slug).first();
    if (!author) {
      return new Response(JSON.stringify({ error: "Author not found" }), {
        status: 404,
        headers
      });
    }
    const articleCount = await db.prepare(`SELECT COUNT(*) as count FROM articles WHERE author_id = ?`).bind(author.id).first();
    if (articleCount && articleCount.count > 0) {
      return new Response(JSON.stringify({ error: "Cannot delete author associated with articles. Reassign articles first." }), {
        status: 409,
        // Conflict
        headers
      });
    }
    const result = await db.prepare(`DELETE FROM authors WHERE slug = ?`).bind(slug).run();
    if (result.changes > 0) {
      return new Response(JSON.stringify({ success: true, message: "Author deleted successfully" }), {
        status: 200,
        headers
      });
    } else {
      return new Response(JSON.stringify({ error: "Author not found or already deleted" }), {
        status: 404,
        headers
      });
    }
  } catch (error) {
    console.error(`Error deleting author ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to delete author" }), {
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
