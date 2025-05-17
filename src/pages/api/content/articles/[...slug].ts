// src/pages/api/content/articles/[...slug].ts
// Astro API endpoint for managing articles.
import type { APIContext } from 'astro';

// Common headers for CORS and JSON
const commonHeaders = {
    'Access-Control-Allow-Origin': '*', // Adjust in production if needed
    'Content-Type': 'application/json'
};

// Helper to transform DB article structure to frontend structure
function transformArticleForFrontend(article: any) {
    if (!article) {
        console.warn('[transformArticleForFrontend] Received null or undefined article');
        return null;
    }
    
    console.log(`[transformArticleForFrontend] Processing article: ${article.slug}`);
    
    // Procesamiento seguro de tags
    let parsedTags: any[] = [];
    if (article.tags) {
        try {
            // Si ya es un array, usarlo directamente
            if (Array.isArray(article.tags)) {
                parsedTags = article.tags;
            } else {
                // Intentar parsear como JSON
                parsedTags = JSON.parse(article.tags);
            }
        } catch (e) {
            console.error(`[transformArticleForFrontend] Error parsing tags for article ${article.slug}:`, e);
            // Si hay error, intentar dividir por comas como fallback
            if (typeof article.tags === 'string') {
                parsedTags = article.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            }
        }
    }

    // Asegurarse de que todos los campos requeridos existan
    const transformedArticle = {
        slug: article.slug || '',
        title: article.title || 'Sin título',
        description: article.description || '',
        content: article.content || '',
        pubDate: article.pub_date || new Date().toISOString(), // Transform pub_date to pubDate
        category: article.category || '', // Usar solo category (singular)
        featured_image: article.featured_image || '',
        author_info: article.author_id ? { // Use author_info for structured data
            id: article.author_id,
            name: article.author_name || 'Autor desconocido',
            slug: article.author_slug || '',
            avatar: article.author_avatar || ''
        } : null,
        tags: parsedTags,
        updated_at: article.updated_at || article.pub_date || new Date().toISOString() // Incluir fecha de actualización
    };
    
    console.log(`[transformArticleForFrontend] Article transformed successfully: ${transformedArticle.title}`);
    return transformedArticle;
}


// === MAIN HANDLERS (Exported for Astro) ===

// Handle GET requests (all articles or specific one)
export async function GET(context: APIContext) {
    console.log(`[articles/...slug.ts] GET invoked. Slug: ${context.params.slug}`);
    const slugParam = context.params.slug;
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    try {
        // Verificar si es una solicitud de búsqueda
        const url = new URL(context.request.url);
        if (url.pathname.includes('/search')) {
            return handleGetArticles(db, commonHeaders, context.request);
        }
        
        // Si no es búsqueda y tenemos un slug, obtener el artículo específico
        if (slugParam) {
            console.log(`Procesando solicitud para artículo con slug: ${slugParam}`);
            return handleGetArticle(slugParam, db, commonHeaders);
        } else {
            // Si no hay slug, obtener todos los artículos
            return handleGetArticles(db, commonHeaders, context.request);
        }
    } catch (error: any) {
        console.error('Error in GET /api/content/articles:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: error.message || 'Server Error' 
        }), {
            status: 500,
            headers: commonHeaders
        });
    }
}

// Handle POST requests (create article)
export async function POST(context: APIContext) {
    console.log(`[articles/...slug.ts] POST invoked.`);
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

        const articleData = await context.request.json();
        return handleCreateArticle(articleData, db, commonHeaders);

    } catch (error: any) {
        console.error('Error in POST /api/content/articles:', error);
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

// Handle PUT requests (update article)
export async function PUT(context: APIContext) {
    console.log(`[articles/...slug.ts] PUT invoked. Slug: ${context.params.slug}`);
    const slug = context.params.slug;
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing article slug for update' }), {
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

        const articleData = await context.request.json();
        return handleUpdateArticle(slug, articleData, db, commonHeaders);

    } catch (error: any) {
        console.error(`Error in PUT /api/content/articles/${slug}:`, error);
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

// Handle DELETE requests (delete article)
export async function DELETE(context: APIContext) {
    console.log(`[articles/...slug.ts] DELETE invoked. Slug: ${context.params.slug}`);
    const slug = context.params.slug;
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    if (!slug) {
        return new Response(JSON.stringify({ error: 'Missing article slug for delete' }), {
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

        return handleDeleteArticle(slug, db, commonHeaders);

    } catch (error: any) {
        console.error(`Error in DELETE /api/content/articles/${slug}:`, error);
        return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
            status: 500,
            headers: commonHeaders
        });
    }
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(context: APIContext) {
    console.log(`[articles/...slug.ts] OPTIONS invoked.`);
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

// Verify authentication
async function verifyAuthentication(request: Request, env: any) {
    if (env.ENVIRONMENT === 'development') {
      console.log('Auth check (Article): Development environment, access granted.');
      return true;
    }
    if (request.method === 'GET') {
      console.log('Auth check (Article): GET request, access granted.');
      return true;
    }
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    console.log(`Auth check (Article): Production. JWT found: ${!!jwt}`);
    return !!jwt;
}

// Get all articles with pagination support
async function handleGetArticles(db: any, headers: HeadersInit, request?: Request) {
    console.log('[articles/...slug.ts] Retrieving articles with pagination');
    
    try {
        // Parse pagination parameters from URL
        const url = request?.url ? new URL(request.url) : null;
        const page = url?.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1;
        const pageSize = url?.searchParams.get('pageSize') ? parseInt(url.searchParams.get('pageSize')!) : 10;
        
        // Validate pagination parameters
        const validPage = page > 0 ? page : 1;
        const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 10;
        const offset = (validPage - 1) * validPageSize;
        
        // Get total count of articles for pagination info
        const { count } = await db.prepare('SELECT COUNT(*) as count FROM articles').first();
        const totalArticles = count || 0;
        const totalPages = Math.ceil(totalArticles / validPageSize);
        
        console.log(`[articles/...slug.ts] Pagination: page=${validPage}, pageSize=${validPageSize}, offset=${offset}, total=${totalArticles}, totalPages=${totalPages}`);

        // Query articles with pagination
        const { results } = await db.prepare(`
            SELECT a.*,
                   aut.id as author_id,
                   aut.name as author_name,
                   aut.slug as author_slug,
                   aut.avatar as author_avatar
            FROM articles a
            LEFT JOIN authors aut ON a.author_id = aut.id
            ORDER BY a.pub_date DESC
            LIMIT ? OFFSET ?
        `).bind(validPageSize, offset).all();

        const transformedResults = results.map(transformArticleForFrontend);
        console.log(`[articles/...slug.ts] Retrieved ${transformedResults.length} articles (page ${validPage} of ${totalPages})`); 
        
        // Log first article for debugging
        if (transformedResults.length > 0) {
            const previewArticle = transformedResults[0];
            console.log(`[articles/...slug.ts] First article: ${previewArticle.title}, Category: ${previewArticle.category}`);
        }
        
        // Return standardized response with pagination info
        return new Response(JSON.stringify({
            success: true,
            pagination: {
                page: validPage,
                pageSize: validPageSize,
                totalItems: totalArticles,
                totalPages: totalPages,
                hasNextPage: validPage < totalPages,
                hasPrevPage: validPage > 1
            },
            articles: transformedResults || []
        }), { 
            headers: {
                ...headers,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            } 
        });
    } catch (error: any) {
        console.error('Error fetching articles:', error);
        return new Response(JSON.stringify({ 
            success: false,
            error: 'Failed to fetch articles',
            message: error.message || 'Unknown database error'
        }), { 
            status: 500, 
            headers 
        });
    }
}

// Get a specific article by slug
async function handleGetArticle(slug: string, db: any, headers: HeadersInit) {
    console.log(`[articles/...slug.ts] Retrieving article by slug: ${slug}`);
    try {
        // Validar el slug
        if (!slug || typeof slug !== 'string') {
            console.error(`[articles/...slug.ts] Invalid slug parameter: ${slug}`);
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Invalid slug parameter',
                debug: { slugType: typeof slug, slugValue: slug }
            }), { 
                status: 400, 
                headers
            });
        }

        console.log(`[articles/...slug.ts] Executing DB query for slug: ${slug}`);
        
        // Intentar obtener el artículo de la base de datos
        try {
            const { results } = await db.prepare(`
                SELECT a.*,
                       aut.id as author_id,
                       aut.name as author_name,
                       aut.slug as author_slug,
                       aut.avatar as author_avatar
                FROM articles a
                LEFT JOIN authors aut ON a.author_id = aut.id
                WHERE a.slug = ?
            `).bind(slug).all();

            console.log(`[articles/...slug.ts] Query results for slug ${slug}:`, 
                       results ? `Found ${results.length} results` : 'No results');

            if (!results || results.length === 0) {
                console.log(`[articles/...slug.ts] No article found with slug: ${slug}`);
                return new Response(JSON.stringify({ 
                    success: false,
                    error: 'Article not found' 
                }), { 
                    status: 404, 
                    headers: {
                        ...headers,
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                });
            }

            // Transformar el artículo para el frontend
            try {
                const article = transformArticleForFrontend(results[0]);
                console.log(`[articles/...slug.ts] Article transformed successfully: ${article.title}`);
                
                return new Response(JSON.stringify({
                    success: true,
                    article
                }), { 
                    headers: {
                        ...headers,
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                });
            } catch (transformError: any) {
                console.error(`[articles/...slug.ts] Error transforming article:`, transformError);
                return new Response(JSON.stringify({ 
                    success: false,
                    error: 'Error transforming article data',
                    message: transformError.message
                }), { 
                    status: 500, 
                    headers 
                });
            }
        } catch (dbError: any) {
            console.error(`[articles/...slug.ts] Database error for slug ${slug}:`, dbError);
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Database query failed',
                message: dbError.message
            }), { 
                status: 500, 
                headers 
            });
        }
    } catch (error: any) {
        console.error(`[articles/...slug.ts] Unexpected error for slug ${slug}:`, error);
        return new Response(JSON.stringify({ 
            success: false,
            error: 'Failed to fetch article',
            message: error.message || 'Unknown error'
        }), { 
            status: 500, 
            headers 
        });
    }
}

// Create a new article
async function handleCreateArticle(articleData: any, db: any, headers: HeadersInit) {
    console.log(`[articles/...slug.ts] Creating new article: ${articleData.title || 'Untitled'}, Category: ${articleData.category || ''}`);
    // Basic validation
    if (!articleData || !articleData.slug || !articleData.title) {
        return new Response(JSON.stringify({ error: 'Slug and title are required' }), {
            status: 400,
            headers
        });
    }

    try {
        const existingArticle = await db.prepare(`SELECT slug FROM articles WHERE slug = ?`).bind(articleData.slug).first();
        if (existingArticle) {
            return new Response(JSON.stringify({ error: 'Article slug already exists' }), {
                status: 409,
                headers
            });
        }

        // Format date correctly (ensure ISO string)
        let pubDate = articleData.pubDate || new Date().toISOString();
        try {
             pubDate = new Date(pubDate).toISOString();
        } catch (e) {
             console.warn(`Invalid pubDate format received: ${articleData.pubDate}. Using current date.`);
             pubDate = new Date().toISOString();
        }

        // Prepare data for insertion
        const category = articleData.category || ''; // Use category as a simple string
        const tagsString = JSON.stringify(articleData.tags || []);

        const result = await db.prepare(`
            INSERT INTO articles (slug, title, description, content, pub_date, category, featured_image, author_id, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            articleData.slug,
            articleData.title,
            articleData.description || '',
            articleData.content || '',
            pubDate,
            category, // Store as simple string
            articleData.featured_image || '',
            articleData.author_id || null, // Expecting author_id from frontend now
            tagsString // Store as JSON string
        ).run();

        // Fetch the newly created article to return it
        const newArticleRaw = await db.prepare(`
            SELECT a.*, aut.id as author_id, aut.name as author_name, aut.slug as author_slug, aut.avatar as author_avatar
            FROM articles a LEFT JOIN authors aut ON a.author_id = aut.id
            WHERE a.slug = ?
        `).bind(articleData.slug).first();

        const transformedArticle = transformArticleForFrontend(newArticleRaw);
        console.log(`[articles/...slug.ts] Article created successfully: ${articleData.title}, Category: ${articleData.category || ''}`);
        return new Response(JSON.stringify({
            success: true,
            message: 'Article created successfully',
            article: transformedArticle
        }), {
            status: 201,
            headers
        });

    } catch (error: any) {
        console.error('Error creating article:', error);
        return new Response(JSON.stringify({ error: 'Failed to create article' }), {
            status: 500,
            headers
        });
    }
}

// Update an existing article
async function handleUpdateArticle(slug: string, articleData: any, db: any, headers: HeadersInit) {
    console.log(`[articles/...slug.ts] Updating article with slug: ${slug}`);
     // Basic validation
    if (!articleData || Object.keys(articleData).length === 0) {
         return new Response(JSON.stringify({ error: 'No update data provided' }), {
             status: 400,
             headers
         });
    }
    // Prevent changing slug via PUT
    if (articleData.slug && articleData.slug !== slug) {
         return new Response(JSON.stringify({ error: 'Changing slug via PUT is not supported' }), {
             status: 400,
             headers
         });
    }

    try {
        const articleExists = await db.prepare(`SELECT slug FROM articles WHERE slug = ?`).bind(slug).first();
        if (!articleExists) {
            return new Response(JSON.stringify({ error: 'Article not found' }), {
                status: 404,
                headers
            });
        }

        // Build update query dynamically
        let setClauses = [];
        let bindings = [];

        // Map frontend fields to DB columns and add to query if present
        const fieldMapping: { [key: string]: string } = {
            title: 'title',
            description: 'description',
            content: 'content',
            featured_image: 'featured_image',
            author_id: 'author_id' // Expecting author_id from frontend
        };

        for (const key in fieldMapping) {
            if (articleData.hasOwnProperty(key)) {
                setClauses.push(`${fieldMapping[key]} = ?`);
                bindings.push(articleData[key]);
            }
        }

        // Handle date update (ensure ISO format)
        if (articleData.hasOwnProperty('pubDate')) {
            try {
                const formattedDate = new Date(articleData.pubDate).toISOString();
                setClauses.push('pub_date = ?');
                bindings.push(formattedDate);
                console.log(`[articles/...slug.ts] Update date for ${slug}: ${formattedDate}`);
            } catch (e) {
                console.warn(`[articles/...slug.ts] Invalid pubDate format received for update: ${articleData.pubDate}. Skipping date update.`);
            }
        }
        
        // Always update the updated_at field when changing any article
        setClauses.push('updated_at = datetime("now")');

        // Handle category update (store as simple string)
        if (articleData.hasOwnProperty('category')) {
            setClauses.push('category = ?');
            bindings.push(articleData.category || '');
        }

        // Handle tags update (store as JSON string)
        if (articleData.hasOwnProperty('tags') && Array.isArray(articleData.tags)) {
            setClauses.push('tags = ?');
            bindings.push(JSON.stringify(articleData.tags));
        }

        if (setClauses.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid fields provided for update' }), {
                status: 400,
                headers
            });
        }

        bindings.push(slug); // For the WHERE clause
        const query = `UPDATE articles SET ${setClauses.join(', ')} WHERE slug = ?`;

        await db.prepare(query).bind(...bindings).run();

        // Fetch the updated article
        const updatedArticleRaw = await db.prepare(`
             SELECT a.*, aut.id as author_id, aut.name as author_name, aut.slug as author_slug, aut.avatar as author_avatar
             FROM articles a LEFT JOIN authors aut ON a.author_id = aut.id
             WHERE a.slug = ?
        `).bind(slug).first();

        const transformedArticle = transformArticleForFrontend(updatedArticleRaw);
        console.log(`[articles/...slug.ts] Article updated successfully: ${updatedArticleRaw.title}, Category: ${updatedArticleRaw.category || ''}`);
        return new Response(JSON.stringify({
            success: true,
            message: 'Article updated successfully',
            article: transformedArticle
        }), { headers });

    } catch (error: any) {
        console.error(`Error updating article ${slug}:`, error);
        return new Response(JSON.stringify({ error: 'Failed to update article' }), {
            status: 500,
            headers
        });
    }
}

// Delete an article
async function handleDeleteArticle(slug: string, db: any, headers: HeadersInit) {
    console.log(`[articles/...slug.ts] Deleting article with slug: ${slug}`);
    try {
        const articleExists = await db.prepare(`SELECT slug FROM articles WHERE slug = ?`).bind(slug).first();
        if (!articleExists) {
            return new Response(JSON.stringify({ error: 'Article not found' }), {
                status: 404,
                headers
            });
        }

        const result = await db.prepare(`DELETE FROM articles WHERE slug = ?`).bind(slug).run();

        if (result.changes > 0) {
             console.log(`[articles/...slug.ts] Article deleted successfully: ${slug}`);
             return new Response(JSON.stringify({ 
                 success: true, 
                 message: 'Article deleted successfully',
                 slug: slug
             }), {
                 status: 200, // OK for delete success
                 headers
             });
        } else {
            // Fallback in case delete failed unexpectedly
             console.warn(`[articles/...slug.ts] Article not found or already deleted: ${slug}`);
             return new Response(JSON.stringify({ 
                 success: false,
                 error: 'Article not found or already deleted' 
             }), {
                 status: 404,
                 headers
             });
        }
    } catch (error: any) {
        console.error(`Error deleting article ${slug}:`, error);
        return new Response(JSON.stringify({ error: 'Failed to delete article' }), {
            status: 500,
            headers
        });
    }
}
