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
  console.log('[categories/...slug.ts] Retrieving all categories');
  try {
    const { results } = await db.prepare(`
      SELECT * FROM categories
      ORDER BY name ASC
    `).all();
    
    console.log(`[categories/...slug.ts] Retrieved ${results.length} categories`);
    
    // Mostrar detalles para las primeras categorías para depuración
    if (results.length > 0) {
      const previewCategory = results[0];
      console.log(`[categories/...slug.ts] First category: ${previewCategory.name}, Slug: ${previewCategory.slug}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      categories: results || []
    }), { headers });
  } catch (error: any) {
    console.error('[categories/...slug.ts] Error fetching categories:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch categories'
    }), { status: 500, headers });
  }
}

// Get a specific category by slug
async function handleGetCategory(slug: string, db: any, headers: HeadersInit) {
  console.log(`[categories/...slug.ts] Retrieving category with slug: ${slug}`);
  try {
    const category = await db.prepare(`
      SELECT * FROM categories
      WHERE slug = ?
    `).bind(slug).first();

    if (!category) {
      console.warn(`[categories/...slug.ts] Category not found: ${slug}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Category not found'
      }), {
        status: 404,
        headers
      });
    }
    
    console.log(`[categories/...slug.ts] Retrieved category: ${category.name} (${category.slug})`);
    return new Response(JSON.stringify({
      success: true,
      category: category
    }), { headers });
  } catch (error: any) {
    console.error(`[categories/...slug.ts] Error fetching category ${slug}:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch category'
    }), { status: 500, headers });
  }
}

// Create a new category
async function handleCreateCategory(categoryData: any, db: any, headers: HeadersInit) {
  console.log(`[categories/...slug.ts] Creating new category: ${categoryData.name || 'Unnamed'}, Slug: ${categoryData.slug || 'no-slug'}`);
  
  // Basic validation
  if (!categoryData || !categoryData.slug || !categoryData.name) {
    console.warn('[categories/...slug.ts] Missing required fields for category creation');
    return new Response(JSON.stringify({
      success: false, 
      error: 'Slug and name are required'
    }), {
      status: 400,
      headers
    });
  }

  try {
    // Check if id already exists
    const existingCategory = await db.prepare(`
      SELECT id FROM categories WHERE id = ?
    `).bind(categoryData.slug).first();

    if (existingCategory) {
      console.warn(`[categories/...slug.ts] Category id already exists: ${categoryData.slug}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Category ID (slug) already exists'
      }), {
        status: 409, // Conflict
        headers
      });
    }

    console.log(`[categories/...slug.ts] Inserting new category: ${categoryData.name} (${categoryData.slug})`);
    
    // Insert new category
    const result = await db.prepare(`
      INSERT INTO categories (id, name, description)
      VALUES (?, ?, ?)
    `).bind(
      categoryData.slug, // The frontend sends the slug value in the 'slug' property
      categoryData.name,
      categoryData.description || ''
    ).run();

    // Fetch the newly created category to return it
    const newCategory = await db.prepare(`
      SELECT * FROM categories WHERE id = ?
    `).bind(categoryData.slug).first();

    console.log(`[categories/...slug.ts] Category created successfully: ${categoryData.name}`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Category created successfully',
      category: newCategory
    }), {
      status: 201, // Created
      headers
    });

  } catch (error: any) {
    console.error('[categories/...slug.ts] Error creating category:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create category'
    }), {
      status: 500,
      headers
    });
  }
}

// Update an existing category
async function handleUpdateCategory(slug: string, categoryData: any, db: any, headers: HeadersInit) {
  console.log(`[categories/...slug.ts] Updating category with slug: ${slug}`);
  
  // Basic validation
  if (!categoryData || (!categoryData.name && !categoryData.description && categoryData.slug === slug)) {
    console.warn(`[categories/...slug.ts] No update data provided for category: ${slug}`);
    return new Response(JSON.stringify({
      success: false,
      error: 'No update data provided or slug cannot be changed here'
    }), {
      status: 400,
      headers
    });
  }
  
  // Prevent changing the slug via this method if attempted
  if (categoryData.slug && categoryData.slug !== slug) {
    console.warn(`[categories/...slug.ts] Attempted to change slug from ${slug} to ${categoryData.slug}`);
    return new Response(JSON.stringify({
      success: false,
      error: 'Changing the slug is not supported via PUT. Delete and recreate if necessary.'
    }), {
      status: 400,
      headers
    });
  }

  try {
    // Check if category exists
    const categoryExists = await db.prepare(`SELECT slug, name FROM categories WHERE slug = ?`).bind(slug).first();
    if (!categoryExists) {
      console.warn(`[categories/...slug.ts] Category not found for update: ${slug}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Category not found'
      }), {
        status: 404,
        headers
      });
    }

    console.log(`[categories/...slug.ts] Found category to update: ${categoryExists.name} (${slug})`);
    
    // Build update query dynamically (only update provided fields)
    let setClauses = [];
    let bindings = [];
    if (categoryData.name) {
      setClauses.push('name = ?');
      bindings.push(categoryData.name);
      console.log(`[categories/...slug.ts] Updating name for category ${slug} to: ${categoryData.name}`);
    }
    if (categoryData.hasOwnProperty('description')) { // Allow setting empty description
      setClauses.push('description = ?');
      bindings.push(categoryData.description);
      console.log(`[categories/...slug.ts] Updating description for category ${slug}`);
    }

    if (setClauses.length === 0) {
      console.warn(`[categories/...slug.ts] No valid fields provided for update of category ${slug}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid fields provided for update'
      }), {
        status: 400,
        headers
      });
    }

    // Add updated_at field
    setClauses.push('updated_at = datetime("now")');
    
    bindings.push(slug); // For the WHERE clause
    const query = `UPDATE categories SET ${setClauses.join(', ')} WHERE slug = ?`;
    console.log(`[categories/...slug.ts] Running update query for category ${slug}`);

    await db.prepare(query).bind(...bindings).run();

    // Fetch the updated category
    const updatedCategory = await db.prepare(`SELECT * FROM categories WHERE slug = ?`).bind(slug).first();

    console.log(`[categories/...slug.ts] Category updated successfully: ${updatedCategory.name} (${slug})`);
    return new Response(JSON.stringify({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory
    }), { headers });

  } catch (error: any) {
    console.error(`[categories/...slug.ts] Error updating category ${slug}:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to update category'
    }), {
      status: 500,
      headers
    });
  }
}

// Delete a category
async function handleDeleteCategory(slug: string, db: any, headers: HeadersInit) {
  console.log(`[categories/...slug.ts] Deleting category with slug: ${slug}`);
  
  try {
    // Check if category exists
    const categoryExists = await db.prepare(`SELECT slug, name FROM categories WHERE slug = ?`).bind(slug).first();
    if (!categoryExists) {
      console.warn(`[categories/...slug.ts] Category not found for deletion: ${slug}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Category not found'
      }), {
        status: 404,
        headers
      });
    }
    
    console.log(`[categories/...slug.ts] Found category to delete: ${categoryExists.name} (${slug})`);

    // Check if category is in use by articles before deleting
    // Cambiamos la consulta para que use category (singular) en lugar de categories (plural)
    const articlesUsingCategory = await db.prepare(`
        SELECT COUNT(*) as count FROM articles WHERE category = ?
    `).bind(slug).first();

    if (articlesUsingCategory && articlesUsingCategory.count > 0) {
      console.warn(`[categories/...slug.ts] Cannot delete category '${slug}' as it is currently used by ${articlesUsingCategory.count} article(s)`);
      return new Response(JSON.stringify({
        success: false,
        error: `Cannot delete category '${slug}' as it is currently used by ${articlesUsingCategory.count} article(s).`
      }), {
        status: 409, // Conflict
        headers
      });
    }

    // Delete the category
    const result = await db.prepare(`DELETE FROM categories WHERE slug = ?`).bind(slug).run();
    console.log(`[categories/...slug.ts] Deletion query executed for category ${slug}. Changes: ${result.changes}`);

    if (result.changes > 0) {
      console.log(`[categories/...slug.ts] Category deleted successfully: ${categoryExists.name} (${slug})`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Category deleted successfully',
        slug: slug
      }), {
        status: 200,
        headers
      });
    } else {
      // Should not happen if existence check passed, but as a fallback
      console.warn(`[categories/...slug.ts] Unexpected: Category not found during deletion: ${slug}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Category not found or already deleted'
      }), {
        status: 404,
        headers
      });
    }

  } catch (error: any) {
    console.error(`[categories/...slug.ts] Error deleting category ${slug}:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to delete category'
    }), {
      status: 500,
      headers
    });
  }
}
