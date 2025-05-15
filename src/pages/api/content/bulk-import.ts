// src/pages/api/content/bulk-import.ts
// Astro API endpoint for bulk importing articles.
import type { APIContext } from 'astro';

// Common headers for CORS and JSON
const commonHeaders = {
    'Access-Control-Allow-Origin': '*', // Adjust in production if needed
    'Content-Type': 'application/json'
};

// === MAIN HANDLER (Exported for Astro) ===

export async function POST(context: APIContext) {
    console.log(`[bulk-import.ts] POST request received`);
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    // Verify Authentication
    console.log(`[bulk-import.ts] Verifying authentication`);
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
        console.warn(`[bulk-import.ts] Authentication failed, unauthorized access attempt`);
        return new Response(JSON.stringify({
            success: false,
            error: 'Unauthorized'
        }), {
            status: 401,
            headers: commonHeaders
        });
    }
    console.log(`[bulk-import.ts] Authentication successful`);

    try {
        const requestData = await context.request.json();
        console.log(`[bulk-import.ts] Request data parsed successfully`);

        // Validate input structure
        if (!requestData || !requestData.articles || !Array.isArray(requestData.articles) || requestData.articles.length === 0) {
            console.warn(`[bulk-import.ts] Invalid data format received`); 
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid data format. Expected { "articles": [...] }'
            }), {
                status: 400,
                headers: commonHeaders
            });
        }

        console.log(`[bulk-import.ts] Processing ${requestData.articles.length} articles`);
        // Process articles
        const results = await processArticles(db, requestData.articles);

        console.log(`[bulk-import.ts] Bulk import completed: ${results.processed}/${results.total} articles processed successfully`);
        // No usar spread operator para evitar duplicar el campo success
        return new Response(JSON.stringify({
            success: true,
            total: results.total,
            processed: results.processed,
            successfulArticles: results.success,
            errors: results.errors,
            authors: results.authors
        }), {
            headers: commonHeaders
        });

    } catch (error: any) {
        console.error(`[bulk-import.ts] Error in bulk import:`, error);
        if (error instanceof SyntaxError) {
             return new Response(JSON.stringify({
                 success: false,
                 error: 'Invalid JSON body'
             }), {
                status: 400,
                headers: commonHeaders
            });
        }
        return new Response(JSON.stringify({
            success: false,
            error: 'Error processing the request',
            details: error.message
        }), {
            status: 500,
            headers: commonHeaders
        });
    }
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS(context: APIContext) {
    console.log(`[bulk-import.ts] OPTIONS invoked.`);
    return new Response(null, {
        status: 204,
        headers: {
            ...commonHeaders,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id',
            'Access-Control-Max-Age': '86400'
        }
    });
}

// === HELPER FUNCTIONS ===

// Verify authentication (Consider moving to a shared utility)
async function verifyAuthentication(request: Request, env: any) {
     if (env.ENVIRONMENT === 'development') {
      console.log('Auth check (Bulk Import): Development environment, access granted.');
      return true;
    }
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    const authHeader = request.headers.get('Authorization');
    const hasBearer = authHeader && authHeader.startsWith('Bearer ');

    console.log(`Auth check (Bulk Import): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
    return !!jwt || hasBearer;
}


// Function to process articles
async function processArticles(db: any, articles: any[]) {
    console.log(`[bulk-import.ts] Starting to process ${articles.length} articles`);
    
    const results = {
        total: articles.length,
        processed: 0,
        success: [] as { title: string, slug: string, id: number | bigint | null }[],
        errors: [] as { title: string, error: string, slug?: string }[],
        authors: {
            created: [] as { name: string, slug: string, id: number | bigint | null }[],
            linked: [] as { name: string, slug: string, id: number | bigint | null }[]
        }
    };

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        console.log(`[bulk-import.ts] Processing article ${i+1}/${articles.length}: "${article.title?.substring(0, 30) || 'Sin título'}..."`);
        
        try {
            // Validate required data
            if (!article.title) {
                console.warn(`[bulk-import.ts] Article ${i+1} missing title, skipping`);
                results.errors.push({
                    title: article.title || 'Artículo sin título',
                    error: 'El título es obligatorio'
                });
                continue; // Skip this article
            }

            // Generate or normalize slug
            let slug: string;
            if (!article.slug) {
                slug = generateSlug(article.title);
                console.log(`[bulk-import.ts] Generated slug '${slug}' for article "${article.title}"`); 
            } else {
                slug = generateSlug(article.slug); // Normalize existing slug
                console.log(`[bulk-import.ts] Using provided slug '${slug}' for article "${article.title}"`); 
            }

            // Check if article with the same slug already exists
            const existingArticle = await db
                .prepare('SELECT id FROM articles WHERE slug = ?')
                .bind(slug)
                .first<{ id: number }>();

            if (existingArticle) {
                console.warn(`[bulk-import.ts] Article with slug '${slug}' already exists, skipping`);
                results.errors.push({
                    title: article.title,
                    slug: slug,
                    error: `Ya existe un artículo con el slug "${slug}"`
                });
                continue; // Skip this article
            }

            // Prepare publication date
            let pubDate: Date;
            try {
                pubDate = article.pubDate ? new Date(article.pubDate) : new Date();
                if (isNaN(pubDate.getTime())) {
                    console.warn(`[bulk-import.ts] Invalid pubDate for article "${article.title}", using current date`);
                    pubDate = new Date();
                } else {
                    console.log(`[bulk-import.ts] Using pubDate: ${pubDate.toISOString()} for article "${article.title}"`);
                }
            } catch (e) {
                console.warn(`[bulk-import.ts] Error parsing pubDate for article "${article.title}", using current date`);
                pubDate = new Date();
            }

            // Process category (using category slug instead of category_id)
            let categoryId: number | bigint | null = null;
            if (article.category) {
                console.log(`[bulk-import.ts] Looking for category: ${article.category}`);
                // Try to find category by slug
                const existingCategory = await db
                    .prepare('SELECT id FROM categories WHERE slug = ?')
                    .bind(article.category)
                    .first<{ id: number | bigint }>();
                
                if (existingCategory) {
                    categoryId = existingCategory.id;
                    console.log(`[bulk-import.ts] Found category with id: ${categoryId}`);
                } else {
                    console.warn(`[bulk-import.ts] Category '${article.category}' not found, article will have no category`);
                }
            } else {
                console.log(`[bulk-import.ts] No category specified for article "${article.title}"`);
            }

            // Process author
            let authorId: number | bigint | null = null;
            if (article.author) {
                const authorName = article.author.trim();
                const authorSlug = generateSlug(authorName);
                console.log(`[bulk-import.ts] Processing author: ${authorName} (${authorSlug})`);

                // Try to find existing author by slug or name
                const existingAuthor = await db
                    .prepare('SELECT id FROM authors WHERE slug = ? OR name = ?')
                    .bind(authorSlug, authorName)
                    .first<{ id: number | bigint }>();

                if (existingAuthor) {
                    authorId = existingAuthor.id;
                    console.log(`[bulk-import.ts] Found existing author: ${authorName} with id ${authorId}`);
                    if (!results.authors.linked.some(a => a.id === authorId)) {
                        results.authors.linked.push({ name: authorName, slug: authorSlug, id: authorId });
                    }
                } else {
                    // Create new author
                    try {
                        console.log(`[bulk-import.ts] Creating new author: ${authorName}`);
                        const authorResult = await db
                            .prepare('INSERT INTO authors (slug, name, bio, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))')
                            .bind(authorSlug, authorName, article.authorBio || `Autor de "${article.title}"`)
                            .run();

                        if (authorResult.success && authorResult.meta.last_row_id) {
                            authorId = authorResult.meta.last_row_id;
                            console.log(`[bulk-import.ts] Created author: ${authorName} with id ${authorId}`);
                            results.authors.created.push({ name: authorName, slug: authorSlug, id: authorId });
                        } else {
                            console.error(`[bulk-import.ts] Failed to create author: ${authorName}`);
                        }
                    } catch (authorError: any) {
                        console.error(`[bulk-import.ts] Error creating author "${authorName}":`, authorError);
                        results.errors.push({
                            title: article.title,
                            error: `Error al crear/buscar autor "${authorName}": ${authorError.message}`
                        });
                        // Continuing without author
                    }
                }
            } else {
                console.log(`[bulk-import.ts] No author specified for article "${article.title}"`);
            }

            // Insert article into the database
            console.log(`[bulk-import.ts] Inserting article "${article.title}" into database`);
            const insertResult = await db
                .prepare(`
                    INSERT INTO articles (
                        title, slug, content, category, author_id, pub_date,
                        featured_image, image_alt, status, meta_description, meta_keywords,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
                `)
                .bind(
                    article.title,
                    slug,
                    article.content || '',
                    article.category || null, // Using category slug instead of category_id
                    authorId,
                    pubDate.toISOString(), // Store as ISO string
                    article.featured_image || article.image_url || null, // Support both field names
                    article.image_alt || '',
                    article.status || 'published', // Default status
                    article.meta_description || null,
                    article.meta_keywords || null
                )
                .run();

            if (insertResult.success && insertResult.meta.last_row_id) {
                const articleId = insertResult.meta.last_row_id;
                console.log(`[bulk-import.ts] Article "${article.title}" inserted successfully with id ${articleId}`);
                results.success.push({ title: article.title, slug: slug, id: articleId });
                results.processed++;
            } else {
                console.error(`[bulk-import.ts] Failed to insert article "${article.title}" into database`);
                results.errors.push({
                    title: article.title,
                    slug: slug,
                    error: 'Error al insertar el artículo en la base de datos'
                });
            }

        } catch (processError: any) {
            console.error(`[bulk-import.ts] Error processing article "${article.title || 'Sin título'}":`, processError);
            results.errors.push({
                title: article.title || 'Artículo con error',
                error: `Error interno: ${processError.message}`
            });
        }
    }

    console.log(`[bulk-import.ts] Completed processing ${results.processed}/${results.total} articles successfully`);
    console.log(`[bulk-import.ts] Created ${results.authors.created.length} new authors and linked ${results.authors.linked.length} existing authors`);
    console.log(`[bulk-import.ts] Encountered ${results.errors.length} errors`);
    
    return results;
}


// Function to generate slug (copied from original)
function generateSlug(title: string): string {
    if (!title) return `articulo-${Date.now()}`; // Fallback for empty titles

    const normalized = title
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .replace(/[^\w\s-]/g, '') // Remove non-word characters (excluding spaces and hyphens)
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end

    return normalized || `articulo-${Date.now()}`; // Fallback if normalization results in empty string
}
