globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../../../renderers.mjs';

const commonHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production if needed
  "Content-Type": "application/json"
};
async function GET(context) {
  console.log(`[categories/...slug.ts] GET invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  context.locals.runtime.env;
  try {
    if (slug) {
      return handleGetCategory(slug, db, commonHeaders);
    } else {
      return handleGetCategories(db, commonHeaders);
    }
  } catch (error) {
    console.error("Error in GET /api/content/categories:", error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function POST(context) {
  console.log(`[categories/...slug.ts] POST invoked.`);
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
    const categoryData = await context.request.json();
    return handleCreateCategory(categoryData, db, commonHeaders);
  } catch (error) {
    console.error("Error in POST /api/content/categories:", error);
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
  console.log(`[categories/...slug.ts] PUT invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing category slug for update" }), {
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
    const categoryData = await context.request.json();
    return handleUpdateCategory(slug, categoryData, db, commonHeaders);
  } catch (error) {
    console.error(`Error in PUT /api/content/categories/${slug}:`, error);
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
  console.log(`[categories/...slug.ts] DELETE invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing category slug for delete" }), {
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
    return handleDeleteCategory(slug, db, commonHeaders);
  } catch (error) {
    console.error(`Error in DELETE /api/content/categories/${slug}:`, error);
    return new Response(JSON.stringify({ error: error.message || "Server Error" }), {
      status: 500,
      headers: commonHeaders
    });
  }
}
async function OPTIONS(context) {
  console.log(`[categories/...slug.ts] OPTIONS invoked.`);
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
    console.log("Auth check: Development environment, access granted.");
    return true;
  }
  if (request.method === "GET") {
    console.log("Auth check: GET request, access granted.");
    return true;
  }
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  console.log(`Auth check: Production. JWT found: ${!!jwt}`);
  return !!jwt;
}
async function handleGetCategories(db, headers) {
  try {
    const { results } = await db.prepare(`
      SELECT * FROM categories
      ORDER BY name ASC
    `).all();
    return new Response(JSON.stringify(results || []), { headers });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch categories" }), { status: 500, headers });
  }
}
async function handleGetCategory(slug, db, headers) {
  try {
    const category = await db.prepare(`
      SELECT * FROM categories
      WHERE slug = ?
    `).bind(slug).first();
    if (!category) {
      return new Response(JSON.stringify({ error: "Category not found" }), {
        status: 404,
        headers
      });
    }
    return new Response(JSON.stringify(category), { headers });
  } catch (error) {
    console.error(`Error fetching category ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to fetch category" }), { status: 500, headers });
  }
}
async function handleCreateCategory(categoryData, db, headers) {
  if (!categoryData || !categoryData.slug || !categoryData.name) {
    return new Response(JSON.stringify({ error: "Slug and name are required" }), {
      status: 400,
      headers
    });
  }
  try {
    const existingCategory = await db.prepare(`
      SELECT slug FROM categories WHERE slug = ?
    `).bind(categoryData.slug).first();
    if (existingCategory) {
      return new Response(JSON.stringify({ error: "Category slug already exists" }), {
        status: 409,
        headers
      });
    }
    await db.prepare(`
      INSERT INTO categories (slug, name, description)
      VALUES (?, ?, ?)
    `).bind(
      categoryData.slug,
      categoryData.name,
      categoryData.description || ""
    ).run();
    const newCategory = await db.prepare(`
      SELECT * FROM categories WHERE slug = ?
    `).bind(categoryData.slug).first();
    return new Response(JSON.stringify({
      success: true,
      message: "Category created successfully",
      category: newCategory
    }), {
      status: 201,
      // Created
      headers
    });
  } catch (error) {
    console.error("Error creating category:", error);
    return new Response(JSON.stringify({ error: "Failed to create category" }), {
      status: 500,
      headers
    });
  }
}
async function handleUpdateCategory(slug, categoryData, db, headers) {
  if (!categoryData || !categoryData.name && !categoryData.description && categoryData.slug === slug) {
    return new Response(JSON.stringify({ error: "No update data provided or slug cannot be changed here" }), {
      status: 400,
      headers
    });
  }
  if (categoryData.slug && categoryData.slug !== slug) {
    return new Response(JSON.stringify({ error: "Changing the slug is not supported via PUT. Delete and recreate if necessary." }), {
      status: 400,
      headers
    });
  }
  try {
    const categoryExists = await db.prepare(`SELECT slug FROM categories WHERE slug = ?`).bind(slug).first();
    if (!categoryExists) {
      return new Response(JSON.stringify({ error: "Category not found" }), {
        status: 404,
        headers
      });
    }
    let setClauses = [];
    let bindings = [];
    if (categoryData.name) {
      setClauses.push("name = ?");
      bindings.push(categoryData.name);
    }
    if (categoryData.hasOwnProperty("description")) {
      setClauses.push("description = ?");
      bindings.push(categoryData.description);
    }
    if (setClauses.length === 0) {
      return new Response(JSON.stringify({ error: "No valid fields provided for update" }), {
        status: 400,
        headers
      });
    }
    bindings.push(slug);
    const query = `UPDATE categories SET ${setClauses.join(", ")} WHERE slug = ?`;
    await db.prepare(query).bind(...bindings).run();
    const updatedCategory = await db.prepare(`SELECT * FROM categories WHERE slug = ?`).bind(slug).first();
    return new Response(JSON.stringify({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory
    }), { headers });
  } catch (error) {
    console.error(`Error updating category ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to update category" }), {
      status: 500,
      headers
    });
  }
}
async function handleDeleteCategory(slug, db, headers) {
  try {
    const categoryExists = await db.prepare(`SELECT slug FROM categories WHERE slug = ?`).bind(slug).first();
    if (!categoryExists) {
      return new Response(JSON.stringify({ error: "Category not found" }), {
        status: 404,
        headers
      });
    }
    const articlesUsingCategory = await db.prepare(`
        SELECT COUNT(*) as count FROM articles WHERE categories LIKE ?
    `).bind(`%"${slug}"%`).first();
    if (articlesUsingCategory && articlesUsingCategory.count > 0) {
      return new Response(JSON.stringify({ error: `Cannot delete category '${slug}' as it is currently used by ${articlesUsingCategory.count} article(s).` }), {
        status: 409,
        // Conflict
        headers
      });
    }
    const result = await db.prepare(`DELETE FROM categories WHERE slug = ?`).bind(slug).run();
    if (result.changes > 0) {
      return new Response(JSON.stringify({ success: true, message: "Category deleted successfully" }), {
        status: 200,
        headers
      });
    } else {
      return new Response(JSON.stringify({ error: "Category not found or already deleted" }), {
        status: 404,
        headers
      });
    }
  } catch (error) {
    console.error(`Error deleting category ${slug}:`, error);
    return new Response(JSON.stringify({ error: "Failed to delete category" }), {
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
