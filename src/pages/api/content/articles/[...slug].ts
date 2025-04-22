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
    if (!article) return null;
    return {
        slug: article.slug,
        title: article.title,
        description: article.description,
        content: article.content,
        pubDate: article.pub_date, // Transform pub_date to pubDate
        // category: article.category, // Original was category, seems redundant if categories is present?
        categories: article.categories ? JSON.parse(article.categories) : [], // Assuming categories is a JSON array string
        featured_image: article.featured_image,
        author_info: article.author_id ? { // Use author_info for structured data
            id: article.author_id,
            name: article.author_name,
            slug: article.author_slug,
            avatar: article.author_avatar
        } : null,
        tags: article.tags ? JSON.parse(article.tags) : [],
        // Include other fields if necessary
    };
}


// === MAIN HANDLERS (Exported for Astro) ===

// Handle GET requests (all articles or specific one)
export async function GET(context: APIContext) {
    console.log(`[articles/...slug.ts] GET invoked. Slug: ${context.params.slug}`);
    const slug = context.params.slug;
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    try {
        if (slug) {
            return handleGetArticle(slug, db, commonHeaders);
        } else {
            return handleGetArticles(db, commonHeaders);
        }
    } catch (error: any) {
        console.error('Error in GET /api/content/articles:', error);
        return new Response(JSON.stringify({ error: error.message || 'Server Error' }), {
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

// Get all articles
async function handleGetArticles(db: any, headers: HeadersInit) {
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
    } catch (error: any) {
        console.error('Error fetching articles:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch articles' }), { status: 500, headers });
    }
}

// Get a specific article by slug
async function handleGetArticle(slug: string, db: any, headers: HeadersInit) {
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
            return new Response(JSON.stringify({ error: 'Article not found' }), {
                status: 404,
                headers
            });
        }
        return new Response(JSON.stringify(transformArticleForFrontend(article)), { headers });
    } catch (error: any) {
        console.error(`Error fetching article ${slug}:`, error);
        return new Response(JSON.stringify({ error: 'Failed to fetch article' }), { status: 500, headers });
    }
}

// Create a new article
async function handleCreateArticle(articleData: any, db: any, headers: HeadersInit) {
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
        const categoriesString = JSON.stringify(articleData.categories || []);
        const tagsString = JSON.stringify(articleData.tags || []);

        const result = await db.prepare(`
            INSERT INTO articles (slug, title, description, content, pub_date, categories, featured_image, author_id, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            articleData.slug,
            articleData.title,
            articleData.description || '',
            articleData.content || '',
            pubDate,
            categoriesString, // Store as JSON string
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

        return new Response(JSON.stringify({
            success: true,
            message: 'Article created successfully',
            article: transformArticleForFrontend(newArticleRaw)
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
            } catch (e) {
                 console.warn(`Invalid pubDate format received for update: ${articleData.pubDate}. Skipping date update.`);
            }
        }

        // Handle categories update (store as JSON string)
        if (articleData.hasOwnProperty('categories') && Array.isArray(articleData.categories)) {
            setClauses.push('categories = ?');
            bindings.push(JSON.stringify(articleData.categories));
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

        return new Response(JSON.stringify({
            success: true,
            message: 'Article updated successfully',
            article: transformArticleForFrontend(updatedArticleRaw)
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
             return new Response(JSON.stringify({ success: true, message: 'Article deleted successfully' }), {
                 status: 200, // OK for delete success
                 headers
             });
        } else {
            // Fallback in case delete failed unexpectedly
             return new Response(JSON.stringify({ error: 'Article not found or already deleted' }), {
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
