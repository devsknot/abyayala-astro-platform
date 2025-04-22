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
    console.log(`[bulk-import.ts] POST invoked.`);
    const db = context.locals.runtime.env.DB;
    const env = context.locals.runtime.env;

    // Verify Authentication
    const authenticated = await verifyAuthentication(context.request, env);
    if (!authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: commonHeaders
        });
    }

    try {
        const requestData = await context.request.json();

        // Validate input structure
        if (!requestData || !requestData.articles || !Array.isArray(requestData.articles) || requestData.articles.length === 0) {
            return new Response(JSON.stringify({ error: 'Invalid data format. Expected { "articles": [...] }' }), {
                status: 400,
                headers: commonHeaders
            });
        }

        // Process articles
        const results = await processArticles(db, requestData.articles);

        return new Response(JSON.stringify(results), {
            headers: commonHeaders
        });

    } catch (error: any) {
        console.error('Error in bulk import:', error);
        if (error instanceof SyntaxError) {
             return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
                status: 400,
                headers: commonHeaders
            });
        }
        return new Response(JSON.stringify({
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

    for (const article of articles) {
        try {
            // Validate required data
            if (!article.title) {
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
            } else {
                slug = generateSlug(article.slug); // Normalize existing slug
            }

            // Check if article with the same slug already exists
            const existingArticle = await db
                .prepare('SELECT id FROM articles WHERE slug = ?')
                .bind(slug)
                .first<{ id: number }>();

            if (existingArticle) {
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
                     console.warn(`Invalid pubDate for article "${article.title}", using current date.`);
                     pubDate = new Date();
                }
            } catch (e) {
                 console.warn(`Error parsing pubDate for article "${article.title}", using current date.`);
                 pubDate = new Date();
            }


            // Process author
            let authorId: number | bigint | null = null;
            if (article.author) {
                const authorName = article.author.trim();
                const authorSlug = generateSlug(authorName);

                // Try to find existing author by slug or name
                const existingAuthor = await db
                    .prepare('SELECT id FROM authors WHERE slug = ? OR name = ?')
                    .bind(authorSlug, authorName)
                    .first<{ id: number | bigint }>();

                if (existingAuthor) {
                    authorId = existingAuthor.id;
                    if (!results.authors.linked.some(a => a.id === authorId)) {
                        results.authors.linked.push({ name: authorName, slug: authorSlug, id: authorId });
                    }
                } else {
                    // Create new author
                    try {
                        const authorResult = await db
                            .prepare('INSERT INTO authors (slug, name, bio) VALUES (?, ?, ?)')
                            .bind(authorSlug, authorName, article.authorBio || `Autor de "${article.title}"`)
                            .run();

                        if (authorResult.success && authorResult.meta.last_row_id) {
                            authorId = authorResult.meta.last_row_id;
                             results.authors.created.push({ name: authorName, slug: authorSlug, id: authorId });
                        } else {
                            console.error(`Failed to create author: ${authorName}`);
                        }
                    } catch (authorError: any) {
                         console.error(`Error creating author "${authorName}":`, authorError);
                         results.errors.push({
                             title: article.title,
                             error: `Error al crear/buscar autor "${authorName}": ${authorError.message}`
                         });
                         // Decide if you want to continue without author or skip
                         // continue; // Option to skip article if author creation fails
                    }
                }
            }

            // Insert article into the database
            const insertResult = await db
                .prepare(`
                    INSERT INTO articles (
                        title, slug, content, category_id, author_id, pub_date,
                        image_url, image_alt, status, meta_description, meta_keywords
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `)
                .bind(
                    article.title,
                    slug,
                    article.content || '',
                    article.category_id || null, // Assuming category_id is provided or null
                    authorId,
                    pubDate.toISOString(), // Store as ISO string
                    article.image_url || null,
                    article.image_alt || '',
                    article.status || 'published', // Default status
                    article.meta_description || null,
                    article.meta_keywords || null
                )
                .run();

             if (insertResult.success && insertResult.meta.last_row_id) {
                 results.success.push({ title: article.title, slug: slug, id: insertResult.meta.last_row_id });
                 results.processed++;
             } else {
                  results.errors.push({
                      title: article.title,
                      slug: slug,
                      error: 'Error al insertar el artículo en la base de datos'
                  });
             }

        } catch (processError: any) {
            console.error(`Error processing article "${article.title || 'Sin título'}":`, processError);
            results.errors.push({
                title: article.title || 'Artículo con error',
                error: `Error interno: ${processError.message}`
            });
        }
    }

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
