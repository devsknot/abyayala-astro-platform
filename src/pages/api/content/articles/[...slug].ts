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
    
    // Asegurar que todos los campos del artículo tienen valores por defecto seguros
    const safeArticle = {
        slug: article.slug || '',
        title: article.title || 'Sin título',
        description: article.description || '',
        content: article.content || '',
        pub_date: article.pub_date || new Date().toISOString(),
        category: article.category || '',
        featured_image: article.featured_image || '',
        author_id: article.author_id || null,
        author_name: article.author_name || 'Autor desconocido',
        author_slug: article.author_slug || '',
        author_avatar: article.author_avatar || '',
        tags: article.tags || '',
        updated_at: article.updated_at || article.pub_date || new Date().toISOString()
    };
    
    console.log(`[transformArticleForFrontend] Processing article: ${safeArticle.slug}`);
    
    // Procesamiento ultra seguro de tags con múltiples fallbacks
    let parsedTags: any[] = [];
    try {
        if (!safeArticle.tags) {
            // Si no hay tags, usar array vacío
            parsedTags = [];
        } else if (Array.isArray(safeArticle.tags)) {
            // Si ya es un array, usarlo directamente
            parsedTags = safeArticle.tags;
        } else if (typeof safeArticle.tags === 'string') {
            // Intentar primero como JSON
            try {
                // Solo intentar parsear como JSON si parece serlo (empieza con [ y termina con ])
                if (safeArticle.tags.trim().startsWith('[') && safeArticle.tags.trim().endsWith(']')) {
                    parsedTags = JSON.parse(safeArticle.tags);
                } else {
                    // Si no parece JSON, dividir por comas
                    parsedTags = safeArticle.tags.split(',').map(tag => tag.trim()).filter(Boolean);
                }
            } catch (parseError) {
                // Si falla el parsing como JSON, dividir por comas
                parsedTags = safeArticle.tags.split(',').map(tag => tag.trim()).filter(Boolean);
                console.log(`[transformArticleForFrontend] Fallback to comma splitting for tags: ${parsedTags.join(', ')}`);
            }
        } else {
            // Si tags existe pero no es string ni array, convertir a string e intentar
            console.warn(`[transformArticleForFrontend] Unexpected tags type: ${typeof safeArticle.tags}`);
            const tagString = String(safeArticle.tags);
            parsedTags = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
        }
    } catch (tagError) {
        // Último fallback: si todo falla, al menos asegurar que es un array vacío
        console.error(`[transformArticleForFrontend] Error processing tags, using empty array:`, tagError);
        parsedTags = [];
    }

    // Construir objeto de autor con manejo seguro de nulos
    let author_info = null;
    if (safeArticle.author_id) {
        try {
            author_info = {
                id: safeArticle.author_id,
                name: safeArticle.author_name || 'Autor desconocido',
                slug: safeArticle.author_slug || '',
                avatar: safeArticle.author_avatar || ''
            };
        } catch (authorError) {
            console.error(`[transformArticleForFrontend] Error creating author_info:`, authorError);
            // Si falla la creación del autor, usar un objeto básico
            author_info = { 
                id: safeArticle.author_id, 
                name: 'Autor desconocido', 
                slug: '', 
                avatar: '' 
            };
        }
    }

    // Asegurarse de que todos los campos requeridos existan con validación explícita de tipos
    const transformedArticle = {
        slug: String(safeArticle.slug || ''),
        title: String(safeArticle.title || 'Sin título'),
        description: String(safeArticle.description || ''),
        content: String(safeArticle.content || ''),
        pubDate: String(safeArticle.pub_date || new Date().toISOString()), // Transform pub_date to pubDate
        category: String(safeArticle.category || ''), // Usar solo category (singular)
        featured_image: String(safeArticle.featured_image || ''),
        author_info: author_info,
        tags: parsedTags,
        updated_at: String(safeArticle.updated_at || safeArticle.pub_date || new Date().toISOString()) // Incluir fecha de actualización
    };
    
    console.log(`[transformArticleForFrontend] Article transformed successfully: ${transformedArticle.title}`);
    return transformedArticle;
}


// === MAIN HANDLERS (Exported for Astro) ===

// Handle GET requests (all articles or specific one)
export async function GET(context: APIContext) {
    // ========== CONFIGURACIÓN DE SEGURIDAD PARA DEPURACIÓN ==========
    // Capturar errores no controlados globalmente
    try {
        // ========== EXTRACCIÓN Y VALIDACIÓN DEL SLUG ==========
        // Extraer el parámetro slug
        let slugParam = context.params.slug;
        console.log(`[articles/API] GET request received. Raw slug:`, slugParam);
        
        // Capturar la URL completa para diagnóstico
        const requestUrl = context.request.url;
        console.log(`[articles/API] Request URL: ${requestUrl}`);
        
        // ========== ACCESO A LA BASE DE DATOS ==========
        // @ts-ignore - Evitar errores de TypeScript con la propiedad runtime
        const db = context.locals?.runtime?.env?.DB;
        
        // Si no hay conexión a la base de datos, devolver un error claro
        if (!db) {
            console.error('[articles/API] DATABASE CONNECTION ERROR: context.locals.runtime.env.DB is undefined');
            console.log('[articles/API] Context structure:', JSON.stringify(context.locals || {}));
            return new Response(JSON.stringify({
                success: false,
                error: 'Database connection error',
                details: 'The server could not establish a connection to the database.'
            }), {
                status: 503, // Service Unavailable es más apropiado para problemas de DB
                headers: {
                    ...commonHeaders,
                    'Cache-Control': 'no-store'
                }
            });
        }
        
        // ========== DETECCIÓN DE TIPO DE SOLICITUD ==========
        // Verificar si es una búsqueda usando la URL
        const url = new URL(requestUrl);
        if (url.pathname.includes('/search')) {
            console.log('[articles/API] Detected search request');
            return handleGetArticles(db, commonHeaders, context.request);
        }
        
        // ========== PROCESAMIENTO DE PARÁMETRO SLUG ==========
        // Procesar el parámetro slug que puede venir en diferentes formatos
        // Caso 1: Array (rutas tipo [...slug])
        if (Array.isArray(slugParam)) {
            console.log(`[articles/API] Slug is an array: [${slugParam.join(', ')}]`);
            
            // Array vacío = listar todos los artículos
            if (slugParam.length === 0) {
                console.log('[articles/API] Empty slug array, returning all articles');
                return handleGetArticles(db, commonHeaders, context.request);
            }
            
            // Usar el primer elemento como slug
            slugParam = slugParam[0];
            console.log(`[articles/API] Using first array element as slug: '${slugParam}'`);
        }
        
        // Caso 2: String vacío o no definido
        if (!slugParam || (typeof slugParam === 'string' && slugParam.trim() === '')) {
            console.log('[articles/API] No valid slug provided, returning all articles');
            return handleGetArticles(db, commonHeaders, context.request);
        }
        
        // Caso 3: Slug válido como string
        if (typeof slugParam === 'string' && slugParam.trim() !== '') {
            slugParam = slugParam.trim();
            console.log(`[articles/API] Processing request for article with slug: '${slugParam}'`);
            return handleGetArticle(slugParam, db, commonHeaders);
        }
        
        // Caso 4: Formato no reconocido (fallback)
        console.warn(`[articles/API] Unrecognized slug format: ${typeof slugParam}`);
        return new Response(JSON.stringify({
            success: false,
            error: 'Invalid slug format',
            receivedValue: slugParam
        }), {
            status: 400,
            headers: commonHeaders
        });
        
    } catch (error: any) {
        // ========== MANEJO DE ERRORES GLOBAL ==========
        console.error('[articles/API] CRITICAL ERROR in GET handler:', error);
        console.error('[articles/API] Error stack:', error.stack);
        
        return new Response(JSON.stringify({ 
            success: false,
            error: 'Server encountered an unexpected error',
            errorType: error.name,
            errorMessage: error.message,
            // Solo incluir detalles técnicos en desarrollo
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), {
            status: 500,
            headers: {
                ...commonHeaders,
                'Cache-Control': 'no-store'
            }
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
    console.log(`[articles/API] handleGetArticle called with slug: '${slug}'`);
    
    // ========== VALIDACIÓN DEL SLUG ==========
    try {
        // Validar el parámetro slug exhaustivamente
        if (!slug) {
            console.error(`[articles/API] VALIDATION ERROR: slug is ${slug}`);
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Missing slug parameter',
                details: 'The slug parameter is required to fetch an article'
            }), { 
                status: 400, 
                headers
            });
        }
        
        if (typeof slug !== 'string') {
            console.error(`[articles/API] VALIDATION ERROR: slug is not a string but ${typeof slug}`);
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Invalid slug format',
                details: `Expected string but received ${typeof slug}`,
                debug: { receivedValue: String(slug) }
            }), { 
                status: 400, 
                headers
            });
        }
        
        // Asegurar que el slug está limpio
        const cleanSlug = slug.trim();
        if (cleanSlug === '') {
            console.error(`[articles/API] VALIDATION ERROR: slug is empty string`);
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Empty slug parameter',
                details: 'The slug parameter cannot be an empty string'
            }), { 
                status: 400, 
                headers
            });
        }
        
        // ========== EJECUCIÓN DE CONSULTA A LA BASE DE DATOS ==========
        try {
            console.log(`[articles/API] Executing database query for article with slug: '${cleanSlug}'`);
            
            // Verificar que db es válido
            if (!db || typeof db.prepare !== 'function') {
                console.error(`[articles/API] DB ERROR: Invalid database connection object`);  
                return new Response(JSON.stringify({ 
                    success: false,
                    error: 'Database connection error',
                    details: 'Could not execute query due to invalid database connection'
                }), { 
                    status: 503, 
                    headers: {
                        ...headers,
                        'Cache-Control': 'no-store'
                    }
                });
            }
            
            // Ejecutar la consulta SQL
            try {
                console.log(`[articles/API] Preparing SQL query for slug: '${cleanSlug}'`);
                // Consulta SQL ultra simplificada sin JOIN para diagnosticar problemas
                console.log(`[articles/API] DIAGNÓSTICO: Usando consulta simplificada sin JOIN para resolver error 500`);
                const statement = db.prepare(`
                    SELECT * 
                    FROM articles 
                    WHERE slug = ? 
                    LIMIT 1
                `);
                
                console.log(`[articles/API] Binding parameter: '${cleanSlug}'`);
                const boundStatement = statement.bind(cleanSlug);
                
                console.log(`[articles/API] Executing query for slug: '${cleanSlug}'`);
                const { results } = await boundStatement.all();
                
                console.log(`[articles/API] Query results:`, results ? 
                    `Found ${results.length} results` : 'No results');
                
                if (!results || results.length === 0) {
                    console.log(`[articles/API] No article found with slug: '${cleanSlug}'`);
                    return new Response(JSON.stringify({ 
                        success: false,
                        error: 'Article not found',
                        details: `No article exists with the slug '${cleanSlug}'`
                    }), { 
                        status: 404, 
                        headers: {
                            ...headers,
                            'Cache-Control': 'no-cache, max-age=0'
                        }
                    });
                }
                
                // ========== TRANSFORMACIÓN DE DATOS ==========
                try {
                    console.log(`[articles/API] Transforming article data for frontend`);
                    
                    // Guardar datos crudos para debugging
                    // Guardar datos crudos para debugging con comprobación de nulos
                    const rawData = results[0] || {};
                    
                    // Registrar información básica para debug, con validaciones
                    try {
                        console.log(`[articles/API] Raw article data:`, {
                            slug: rawData.slug || 'undefined',
                            title: rawData.title || 'undefined',
                            hasContent: Boolean(rawData.content),
                            contentLength: rawData.content ? String(rawData.content).length : 0,
                            author_id: rawData.author_id || 'null',
                            keys: Object.keys(rawData).join(', ')
                        });
                    } catch (logError) {
                        console.error('[articles/API] Error logging raw data:', logError);
                    }
                    
                    // Intentar transformar el artículo con manejo explícito de errores
                    let article;
                    try {
                        article = transformArticleForFrontend(rawData);
                        if (!article) {
                            throw new Error('Article transformation returned null');
                        }
                    } catch (transformError) {
                        console.error('[articles/API] Error in transformArticleForFrontend:', transformError);
                        
                        // Crear un artículo mínimo como fallback si la transformación falla
                        article = {
                            slug: rawData.slug || 'error-slug',
                            title: rawData.title || 'Error al procesar artículo',
                            description: 'No se pudo transformar correctamente el artículo',
                            content: '',
                            pubDate: new Date().toISOString(),
                            category: '',
                            featured_image: '',
                            author_info: null,
                            tags: [],
                            updated_at: new Date().toISOString()
                        };
                        
                        console.log('[articles/API] Created fallback article:', article.title);
                    }
                    
                    console.log(`[articles/API] Article transformed successfully: '${article.title}'`);
                    
                    // Retornar el artículo transformado
                    return new Response(JSON.stringify({
                        success: true,
                        article
                    }), { 
                        headers: {
                            ...headers,
                            'Cache-Control': 'private, max-age=60' // Cache por 1 minuto
                        }
                    });
                } catch (transformError: any) {
                    // Error en la transformación de datos
                    console.error(`[articles/API] DATA TRANSFORM ERROR:`, transformError);
                    console.error(`[articles/API] Transform error details:`, {
                        message: transformError.message,
                        stack: transformError.stack,
                        raw_data_sample: results[0] ? JSON.stringify(results[0]).substring(0, 200) + '...' : 'No data'
                    });
                    
                    return new Response(JSON.stringify({ 
                        success: false,
                        error: 'Error transforming article data',
                        details: transformError.message || 'Unknown transformation error',
                        errorType: transformError.name || 'TransformError'
                    }), { 
                        status: 500, 
                        headers: {
                            ...headers,
                            'Cache-Control': 'no-store'
                        }
                    });
                }
            } catch (sqlError: any) {
                // Error en la ejecución de la consulta SQL
                console.error(`[articles/API] SQL EXECUTION ERROR for slug '${cleanSlug}':`, sqlError);
                console.error(`[articles/API] SQL error details:`, {
                    message: sqlError.message,
                    code: sqlError.code || 'Unknown',
                    stack: sqlError.stack
                });
                
                return new Response(JSON.stringify({ 
                    success: false,
                    error: 'Database query failed',
                    details: sqlError.message || 'Error executing SQL query',
                    errorCode: sqlError.code || 'UNKNOWN_SQL_ERROR'
                }), { 
                    status: 500, 
                    headers: {
                        ...headers,
                        'Cache-Control': 'no-store'
                    }
                });
            }
        } catch (dbError: any) {
            // Erro general de base de datos
            console.error(`[articles/API] DATABASE ERROR for slug '${cleanSlug}':`, dbError);
            console.error(`[articles/API] DB operation stack:`, dbError.stack);
            
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Database operation failed',
                details: dbError.message || 'Unknown database error',
                errorType: dbError.name || 'DBError'
            }), { 
                status: 500, 
                headers: {
                    ...headers,
                    'Cache-Control': 'no-store'
                }
            });
        }
    } catch (error: any) {
        // Error no controlado
        console.error(`[articles/API] UNHANDLED ERROR in handleGetArticle for slug '${slug}':`, error);
        console.error(`[articles/API] Error stack:`, error.stack);
        
        return new Response(JSON.stringify({ 
            success: false,
            error: 'Server encountered an unexpected error',
            details: error.message || 'Unknown error while processing article request',
            errorType: error.name || 'UnhandledError'
        }), { 
            status: 500, 
            headers: {
                ...headers,
                'Cache-Control': 'no-store'
            }
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
