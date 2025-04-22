// src/pages/api/content/categories/[...slug].ts
import type { APIContext } from 'astro';

// Common headers for CORS and JSON
const commonHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust in production if needed
  'Content-Type': 'application/json'
};

// === MAIN HANDLERS (Exported for Astro) ===

// Handle GET requests (all categories or specific one)
export async function GET(context: APIContext) {
  console.log(`[categories/...slug.ts] GET invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug; // Slug is undefined for '/api/content/categories'
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;

  try {
    if (slug) {
      return handleGetCategory(slug, db, commonHeaders);
    } else {
      return handleGetCategories(db, commonHeaders);
    }
  } catch (error: any) {
    console.error('Error in GET /api/content/categories:', error);
    return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
      status: 500,
      headers: commonHeaders
    });
  }
}

// Handle POST requests (create category)
export async function POST(context: APIContext) {
  console.log(`[categories/...slug.ts] POST invoked.`);
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;

  try {
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: commonHeaders
      });
    }

    const categoryData = await context.request.json();
    return handleCreateCategory(categoryData, db, commonHeaders);

  } catch (error: any) {
    console.error('Error in POST /api/content/categories:', error);
    // Handle JSON parsing error specifically
    if (error instanceof SyntaxError) {
       return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: commonHeaders
      });
    }
    return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
      status: 500,
      headers: commonHeaders
    });
  }
}

// Handle PUT requests (update category)
export async function PUT(context: APIContext) {
  console.log(`[categories/...slug.ts] PUT invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing category slug for update' }), {
      status: 400,
      headers: commonHeaders
    });
  }

  try {
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: commonHeaders
      });
    }

    const categoryData = await context.request.json();
    return handleUpdateCategory(slug, categoryData, db, commonHeaders);

  } catch (error: any) {
    console.error(`Error in PUT /api/content/categories/${slug}:`, error);
    if (error instanceof SyntaxError) {
       return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: commonHeaders
      });
    }
    return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
      status: 500,
      headers: commonHeaders
    });
  }
}

// Handle DELETE requests (delete category)
export async function DELETE(context: APIContext) {
  console.log(`[categories/...slug.ts] DELETE invoked. Slug: ${context.params.slug}`);
  const slug = context.params.slug;
  const db = context.locals.runtime.env.DB;
  const env = context.locals.runtime.env;

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Missing category slug for delete' }), {
      status: 400,
      headers: commonHeaders
    });
  }

  try {
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: commonHeaders
      });
    }

    return handleDeleteCategory(slug, db, commonHeaders);

  } catch (error: any) {
    console.error(`Error in DELETE /api/content/categories/${slug}:`, error);
    return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
      status: 500,
      headers: commonHeaders
    });
  }
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(context: APIContext) {
    console.log(`[categories/...slug.ts] OPTIONS invoked.`);
    return new Response(null, {
      status: 204,
      headers: {
        ...commonHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id',
        'Access-Control-Max-Age': '86400'
      }
    });
}

// === HELPER FUNCTIONS (Adapted from original file) ===

// Verify authentication (simplified for Astro context)
async function verifyAuthentication(request: Request, env: any) {
  // Development environment allows access
  if (env.ENVIRONMENT === 'development') {
    console.log('Auth check: Development environment, access granted.');
    return true;
  }

  // GET requests are public
  if (request.method === 'GET') {
     console.log('Auth check: GET request, access granted.');
    return true;
  }

  // Check Cloudflare Access headers in production
  const jwt = request.headers.get('CF-Access-Jwt-Assertion');
  // const clientId = request.headers.get('CF-Access-Client-Id'); // clientId check removed as per original logic

  console.log(`Auth check: Production. JWT found: ${!!jwt}`);
  return !!jwt; // Check if JWT exists
}

// Get all categories
async function handleGetCategories(db: any, headers: HeadersInit) {
  try {
    const { results } = await db.prepare(`
      SELECT * FROM categories
      ORDER BY name ASC
    `).all();
    return new Response(JSON.stringify(results || []), { headers });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({error: 'Failed to fetch categories'}), { status: 500, headers });
  }
}

// Get a specific category by slug
async function handleGetCategory(slug: string, db: any, headers: HeadersInit) {
  try {
    const category = await db.prepare(`
      SELECT * FROM categories
      WHERE slug = ?
    `).bind(slug).first();

    if (!category) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers
      });
    }
    return new Response(JSON.stringify(category), { headers });
  } catch (error: any) {
    console.error(`Error fetching category ${slug}:`, error);
    return new Response(JSON.stringify({error: 'Failed to fetch category'}), { status: 500, headers });
  }
}

// Create a new category
async function handleCreateCategory(categoryData: any, db: any, headers: HeadersInit) {
  // Basic validation
  if (!categoryData || !categoryData.slug || !categoryData.name) {
    return new Response(JSON.stringify({ error: 'Slug and name are required' }), {
      status: 400,
      headers
    });
  }

  try {
    // Check if slug already exists
    const existingCategory = await db.prepare(`
      SELECT slug FROM categories WHERE slug = ?
    `).bind(categoryData.slug).first();

    if (existingCategory) {
      return new Response(JSON.stringify({ error: 'Category slug already exists' }), {
        status: 409,
        headers
      });
    }

    // Insert new category
    await db.prepare(`
      INSERT INTO categories (slug, name, description)
      VALUES (?, ?, ?)
    `).bind(
      categoryData.slug,
      categoryData.name,
      categoryData.description || ''
    ).run();

    // Fetch the newly created category to return it
    const newCategory = await db.prepare(`
      SELECT * FROM categories WHERE slug = ?
    `).bind(categoryData.slug).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Category created successfully',
      category: newCategory
    }), {
      status: 201, // Created
      headers
    });

  } catch (error: any) {
    console.error('Error creating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to create category' }), {
      status: 500,
      headers
    });
  }
}

// Update an existing category
async function handleUpdateCategory(slug: string, categoryData: any, db: any, headers: HeadersInit) {
  // Basic validation
   if (!categoryData || (!categoryData.name && !categoryData.description && categoryData.slug === slug)) {
      return new Response(JSON.stringify({ error: 'No update data provided or slug cannot be changed here' }), {
        status: 400,
        headers
      });
   }
   // Prevent changing the slug via this method if attempted
   if (categoryData.slug && categoryData.slug !== slug) {
       return new Response(JSON.stringify({ error: 'Changing the slug is not supported via PUT. Delete and recreate if necessary.' }), {
           status: 400,
           headers
       });
   }

  try {
    // Check if category exists
    const categoryExists = await db.prepare(`SELECT slug FROM categories WHERE slug = ?`).bind(slug).first();
    if (!categoryExists) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers
      });
    }

    // Build update query dynamically (only update provided fields)
    let setClauses = [];
    let bindings = [];
    if (categoryData.name) {
      setClauses.push('name = ?');
      bindings.push(categoryData.name);
    }
    if (categoryData.hasOwnProperty('description')) { // Allow setting empty description
      setClauses.push('description = ?');
      bindings.push(categoryData.description);
    }

    if (setClauses.length === 0) {
         return new Response(JSON.stringify({ error: 'No valid fields provided for update' }), {
             status: 400,
             headers
         });
    }

    bindings.push(slug); // For the WHERE clause
    const query = `UPDATE categories SET ${setClauses.join(', ')} WHERE slug = ?`;

    await db.prepare(query).bind(...bindings).run();

    // Fetch the updated category
    const updatedCategory = await db.prepare(`SELECT * FROM categories WHERE slug = ?`).bind(slug).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    }), { headers });

  } catch (error: any) {
    console.error(`Error updating category ${slug}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to update category' }), {
      status: 500,
      headers
    });
  }
}

// Delete a category
async function handleDeleteCategory(slug: string, db: any, headers: HeadersInit) {
  try {
    // Check if category exists
    const categoryExists = await db.prepare(`SELECT slug FROM categories WHERE slug = ?`).bind(slug).first();
    if (!categoryExists) {
      return new Response(JSON.stringify({ error: 'Category not found' }), {
        status: 404,
        headers
      });
    }

    // Optional: Check if category is in use by articles before deleting
    const articlesUsingCategory = await db.prepare(`
        SELECT COUNT(*) as count FROM articles WHERE categories LIKE ?
    `).bind(`%"${slug}"%`).first();

    if (articlesUsingCategory && (articlesUsingCategory as any).count > 0) {
        return new Response(JSON.stringify({ error: `Cannot delete category '${slug}' as it is currently used by ${(articlesUsingCategory as any).count} article(s).` }), {
            status: 409, // Conflict
            headers
        });
    }

    // Delete the category
    const result = await db.prepare(`DELETE FROM categories WHERE slug = ?`).bind(slug).run();

    if (result.changes > 0) {
        return new Response(JSON.stringify({ success: true, message: 'Category deleted successfully' }), {
            status: 200,
            headers
        });
    } else {
        // Should not happen if existence check passed, but as a fallback
        return new Response(JSON.stringify({ error: 'Category not found or already deleted' }), {
            status: 404,
            headers
        });
    }

  } catch (error: any) {
    console.error(`Error deleting category ${slug}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to delete category' }), {
      status: 500,
      headers
    });
  }
}
