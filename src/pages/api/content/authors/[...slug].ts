// src/pages/api/content/authors/[...slug].ts
// Astro API endpoint for managing authors.
import type { APIContext } from 'astro';

// Common headers for CORS and JSON
const commonHeaders = {
    'Access-Control-Allow-Origin': '*', // Adjust in production if needed
    'Content-Type': 'application/json'
};

// === MAIN HANDLERS (Exported for Astro) ===

// Handle GET requests (all authors or specific one)
export async function GET(context: APIContext) {
    try {
        // Obtener el slug de los parámetros
        // En rutas [...slug], el parámetro viene como un array, así que necesitamos procesarlo
        let slugParam = context.params.slug;
        console.log(`[authors/...slug.ts] GET invoked. Raw slug param:`, slugParam);
        
        // Acceder a la base de datos desde el contexto
        // @ts-ignore - Ignorar errores de TypeScript relacionados con context.locals.runtime
        const db = context.locals.runtime?.env?.DB;
        // @ts-ignore
        const env = context.locals.runtime?.env; // For auth check
        
        if (!db) {
            console.error('[authors/...slug.ts] Database connection not available');
            return new Response(JSON.stringify({
                success: false,
                error: 'Database connection not available'
            }), {
                status: 500,
                headers: commonHeaders
            });
        }
        
        // Procesar el parámetro slug que puede venir como array en rutas [...slug]
        if (Array.isArray(slugParam)) {
            console.log(`[authors/...slug.ts] Slug is an array with ${slugParam.length} elements:`, slugParam);
            // Si es un array vacío, obtener todos los autores
            if (slugParam.length === 0) {
                console.log('[authors/...slug.ts] Empty slug array, getting all authors');
                return handleGetAuthors(db, commonHeaders);
            }
            // Si tiene elementos, usar el primero como slug
            slugParam = slugParam[0];
            console.log(`[authors/...slug.ts] Using first element as slug: ${slugParam}`);
        }
        
        // Si tenemos un slug válido, obtener el autor específico
        if (slugParam && typeof slugParam === 'string' && slugParam.trim() !== '') {
            console.log(`[authors/...slug.ts] Processing request for author with slug: ${slugParam}`);
            return handleGetAuthor(slugParam, db, commonHeaders);
        } else {
            // Si no hay slug válido, obtener todos los autores
            console.log('[authors/...slug.ts] No valid slug provided, getting all authors');
            return handleGetAuthors(db, commonHeaders);
        }
    } catch (error: any) {
        console.error('[authors/...slug.ts] Unexpected error in GET handler:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message || 'Server Error',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), {
            status: 500,
            headers: commonHeaders
        });
    }
}

// Handle POST requests (create author)
export async function POST(context: APIContext) {
    console.log(`[authors/...slug.ts] POST invoked.`);
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

        const authorData = await context.request.json();
        return handleCreateAuthor(authorData, db, commonHeaders);

    } catch (error: any) {
        console.error('Error in POST /api/content/authors:', error);
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

// Handle PUT requests (update author)
export async function PUT(context: APIContext) {
    console.log(`[authors/...slug.ts] PUT invoked. Slug: ${context.params.slug}`);
    const slug = context.params.slug;
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing author slug for update' }), {
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

        const authorData = await context.request.json();
        return handleUpdateAuthor(slug, authorData, db, commonHeaders);

    } catch (error: any) {
        console.error(`Error in PUT /api/content/authors/${slug}:`, error);
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

// Handle DELETE requests (delete author)
export async function DELETE(context: APIContext) {
    console.log(`[authors/...slug.ts] DELETE invoked. Slug: ${context.params.slug}`);
    const slug = context.params.slug;
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing author slug for delete' }), {
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

        return handleDeleteAuthor(slug, db, commonHeaders);

    } catch (error: any) {
        console.error(`Error in DELETE /api/content/authors/${slug}:`, error);
        return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
            status: 500,
            headers: commonHeaders
        });
    }
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(context: APIContext) {
    console.log(`[authors/...slug.ts] OPTIONS invoked.`);
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

// Verify authentication (Consider moving to a shared utility later)
async function verifyAuthentication(request: Request, env: any) {
    if (env.ENVIRONMENT === 'development') {
      console.log('Auth check (Author): Development environment, access granted.');
      return true;
    }
    if (request.method === 'GET') {
      console.log('Auth check (Author): GET request, access granted.');
      return true;
    }
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    const authHeader = request.headers.get('Authorization');
    const hasBearer = authHeader && authHeader.startsWith('Bearer ');

    console.log(`Auth check (Author): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
    return !!jwt || hasBearer; // Allow if either Cloudflare Access or Bearer token is present
}

// Get all authors
async function handleGetAuthors(db: any, headers: HeadersInit) {
    console.log('[authors/...slug.ts] Retrieving all authors');
    try {
        const { results } = await db.prepare(`
            SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
            FROM authors
            ORDER BY name ASC
        `).all();

        // Parse social_media if it's stored as JSON string
        const parsedResults = results.map((author: any) => {
            try {
                author.social_media = author.social_media ? JSON.parse(author.social_media) : null;
            } catch (e) {
                console.warn(`[authors/...slug.ts] Failed to parse social_media for author ${author.slug}:`, e);
                author.social_media = null; // Set to null if parsing fails
            }
            return author;
        });
        
        console.log(`[authors/...slug.ts] Retrieved ${parsedResults.length} authors`);
        
        // Mostrar detalles para los primeros autores para depuración
        if (parsedResults.length > 0) {
            const previewAuthor = parsedResults[0];
            console.log(`[authors/...slug.ts] First author: ${previewAuthor.name}, Slug: ${previewAuthor.slug}`);
        }
        
        return new Response(JSON.stringify({
            success: true,
            authors: parsedResults || []
        }), { headers });
    } catch (error: any) {
        console.error('[authors/...slug.ts] Error fetching authors:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch authors'
        }), { status: 500, headers });
    }
}

// Get a specific author by slug, including their articles
async function handleGetAuthor(slug: string, db: any, headers: HeadersInit) {
    console.log(`[authors/...slug.ts] Retrieving author with slug: ${slug}`);
    try {
        const author = await db.prepare(`
            SELECT id, slug, name, bio, email, avatar, social_media, created_at, updated_at
            FROM authors
            WHERE slug = ?
        `).bind(slug).first();

        if (!author) {
            console.warn(`[authors/...slug.ts] Author not found: ${slug}`);
            return new Response(JSON.stringify({
                success: false,
                error: 'Author not found'
            }), {
                status: 404,
                headers
            });
        }

        // Fetch articles by this author
        const { results: articles } = await db.prepare(`
            SELECT slug, title, description, pub_date, category, featured_image, tags
            FROM articles
            WHERE author_id = ?
            ORDER BY pub_date DESC
        `).bind(author.id).all();
        
        console.log(`[authors/...slug.ts] Retrieved ${articles.length} articles for author ${slug}`);

        // Parse social_media for the main author object
        try {
            author.social_media = author.social_media ? JSON.parse(author.social_media) : null;
        } catch (e) {
            console.warn(`[authors/...slug.ts] Failed to parse social_media for author ${author.slug}:`, e);
            author.social_media = null;
        }

        // Parse tags for each article (category is already a string)
        const parsedArticles = articles.map((article: any) => {
            let parsedTags = [];
            try {
                parsedTags = article.tags ? JSON.parse(article.tags) : [];
            } catch (e) {
                console.warn(`[authors/...slug.ts] Failed to parse tags for article ${article.slug}:`, e);
            }
            
            return {
                ...article,
                tags: parsedTags
            };
        });

        console.log(`[authors/...slug.ts] Author retrieved successfully: ${author.name}`);
        return new Response(JSON.stringify({
            success: true,
            author: {
                ...author,
                articles: parsedArticles || []
            }
        }), { headers });
    } catch (error: any) {
        console.error(`[authors/...slug.ts] Error fetching author ${slug}:`, error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch author'
        }), { status: 500, headers });
    }
}

// Create a new author
async function handleCreateAuthor(authorData: any, db: any, headers: HeadersInit) {
    console.log(`[authors/...slug.ts] Creating new author: ${authorData.name || 'Unnamed'}, Slug: ${authorData.slug || 'no-slug'}`);
    
    if (!authorData || !authorData.slug || !authorData.name) {
        console.warn('[authors/...slug.ts] Missing required fields for author creation');
        return new Response(JSON.stringify({
            success: false, 
            error: 'Slug and name are required'
        }), {
            status: 400,
            headers
        });
    }

    try {
        const existingAuthor = await db.prepare(`SELECT slug FROM authors WHERE slug = ?`).bind(authorData.slug).first();
        if (existingAuthor) {
            console.warn(`[authors/...slug.ts] Author slug already exists: ${authorData.slug}`);
            return new Response(JSON.stringify({
                success: false,
                error: 'Author slug already exists'
            }), {
                status: 409,
                headers
            });
        }

        const socialMediaString = JSON.stringify(authorData.social_media || null);
        console.log(`[authors/...slug.ts] Social media data processed for author: ${authorData.slug}`);

        const result = await db.prepare(`
            INSERT INTO authors (slug, name, bio, email, avatar, social_media)
            VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
            authorData.slug,
            authorData.name,
            authorData.bio || '',
            authorData.email || '',
            authorData.avatar || '',
            socialMediaString
        ).run();

        console.log(`[authors/...slug.ts] Author created with ID: ${result.meta.last_row_id}`);

        // Fetch the newly created author to return it
        const newAuthorRaw = await db.prepare(`SELECT * FROM authors WHERE id = ?`).bind(result.meta.last_row_id).first();

        // Parse social_media before sending back
        if (newAuthorRaw) {
            try {
                newAuthorRaw.social_media = newAuthorRaw.social_media ? JSON.parse(newAuthorRaw.social_media) : null;
            } catch (e) { 
                console.warn(`[authors/...slug.ts] Failed to parse social_media for new author: ${e.message}`);
                newAuthorRaw.social_media = null; 
            }
        }

        console.log(`[authors/...slug.ts] Author created successfully: ${authorData.name}`);
        return new Response(JSON.stringify({
            success: true,
            message: 'Author created successfully',
            author: newAuthorRaw
        }), {
            status: 201,
            headers
        });

    } catch (error: any) {
        console.error('[authors/...slug.ts] Error creating author:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create author'
        }), {
            status: 500,
            headers
        });
    }
}

// Update an existing author
async function handleUpdateAuthor(slug: string, authorData: any, db: any, headers: HeadersInit) {
    console.log(`[authors/...slug.ts] Updating author with slug: ${slug}`);
    
    if (!authorData || Object.keys(authorData).length === 0) {
        console.warn('[authors/...slug.ts] No update data provided');
        return new Response(JSON.stringify({ 
            success: false,
            error: 'No update data provided'
        }), {
            status: 400,
            headers
        });
    }
    if (authorData.slug && authorData.slug !== slug) {
        console.warn(`[authors/...slug.ts] Attempted to change slug from ${slug} to ${authorData.slug}`);
        return new Response(JSON.stringify({
            success: false, 
            error: 'Changing slug via PUT is not supported'
        }), {
            status: 400,
            headers
        });
    }

    try {
        const authorExists = await db.prepare(`SELECT id FROM authors WHERE slug = ?`).bind(slug).first();
        if (!authorExists) {
            console.warn(`[authors/...slug.ts] Author not found for update: ${slug}`);
            return new Response(JSON.stringify({
                success: false,
                error: 'Author not found'
            }), {
                status: 404,
                headers
            });
        }

        let setClauses = [];
        let bindings = [];
        const fieldMapping: { [key: string]: string } = {
            name: 'name',
            bio: 'bio',
            email: 'email',
            avatar: 'avatar'
        };

        for (const key in fieldMapping) {
            if (authorData.hasOwnProperty(key)) {
                setClauses.push(`${fieldMapping[key]} = ?`);
                bindings.push(authorData[key]);
                console.log(`[authors/...slug.ts] Updating field ${key} for author ${slug}`);
            }
        }

        if (authorData.hasOwnProperty('social_media')) {
            setClauses.push('social_media = ?');
            bindings.push(JSON.stringify(authorData.social_media || null));
            console.log(`[authors/...slug.ts] Updating social_media for author ${slug}`);
        }

        if (setClauses.length === 0) {
            console.warn(`[authors/...slug.ts] No valid fields provided for update of author ${slug}`);
            return new Response(JSON.stringify({
                success: false,
                error: 'No valid fields provided for update'
            }), {
                status: 400,
                headers
            });
        }

        bindings.push(slug); // For WHERE clause
        const query = `UPDATE authors SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE slug = ?`;
        console.log(`[authors/...slug.ts] Running update query for author ${slug}`);

        await db.prepare(query).bind(...bindings).run();

        // Fetch the updated author
        const updatedAuthorRaw = await db.prepare(`SELECT * FROM authors WHERE slug = ?`).bind(slug).first();

        // Parse social_media before sending back
        if (updatedAuthorRaw) {
            try {
                updatedAuthorRaw.social_media = updatedAuthorRaw.social_media ? JSON.parse(updatedAuthorRaw.social_media) : null;
            } catch (e) { 
                console.warn(`[authors/...slug.ts] Failed to parse social_media for updated author ${slug}: ${e.message}`);
                updatedAuthorRaw.social_media = null; 
            }
        }

        console.log(`[authors/...slug.ts] Author updated successfully: ${slug}`);
        return new Response(JSON.stringify({
            success: true,
            message: 'Author updated successfully',
            author: updatedAuthorRaw
        }), { headers });

    } catch (error: any) {
        console.error(`[authors/...slug.ts] Error updating author ${slug}:`, error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update author'
        }), {
            status: 500,
            headers
        });
    }
}

// Delete an author
async function handleDeleteAuthor(slug: string, db: any, headers: HeadersInit) {
    console.log(`[authors/...slug.ts] Deleting author with slug: ${slug}`);
    try {
        const authorExists = await db.prepare(`SELECT id, name FROM authors WHERE slug = ?`).bind(slug).first();
        if (!authorExists) {
            console.warn(`[authors/...slug.ts] Author not found for deletion: ${slug}`);
            return new Response(JSON.stringify({
                success: false,
                error: 'Author not found'
            }), {
                status: 404,
                headers
            });
        }

        // Get author's articles count to prevent deletions if there are associated articles
        const { count } = await db.prepare(`
            SELECT COUNT(*) as count
            FROM articles
            WHERE author_id = ?
        `).bind(authorExists.id).first();

        if (count > 0) {
            console.warn(`[authors/...slug.ts] Cannot delete author ${slug} with ${count} associated articles`);
            return new Response(JSON.stringify({
                success: false,
                error: `Cannot delete author with ${count} associated articles`
            }), {
                status: 409, // Conflict
                headers
            });
        }

        await db.prepare(`DELETE FROM authors WHERE slug = ?`).bind(slug).run();
        console.log(`[authors/...slug.ts] Author deleted successfully: ${authorExists.name} (${slug})`);

        return new Response(JSON.stringify({
            success: true,
            message: 'Author deleted successfully',
            slug: slug
        }), { headers });
    } catch (error: any) {
        console.error(`[authors/...slug.ts] Error deleting author ${slug}:`, error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete author'
        }), {
            status: 500,
            headers
        });
    }
}
