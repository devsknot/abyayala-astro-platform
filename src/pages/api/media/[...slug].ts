// src/pages/api/media/[...slug].ts
// Astro API endpoint for managing media files in R2.
import type { APIContext } from 'astro';
import type { R2Bucket, R2Object, R2ObjectBody } from '@cloudflare/workers-types';

// Common headers for CORS and JSON response
const commonJsonResponseHeaders = {
    'Access-Control-Allow-Origin': '*', // Adjust in production
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id',
    'Access-Control-Max-Age': '86400'
};

// === HELPER FUNCTIONS (Adapted from original) ===

// Get file type based on extension
function getFileType(fileName: string): string {
    if (!fileName) return 'application/octet-stream';
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'svg': return 'image/svg+xml';
        case 'pdf': return 'application/pdf';
        case 'txt': return 'text/plain';
        case 'json': return 'application/json';
        case 'csv': return 'text/csv';
        case 'mp4': return 'video/mp4';
        case 'webm': return 'video/webm';
        // Add more types as needed
        default: return 'application/octet-stream';
    }
}

// Generate a unique file ID (e.g., using timestamp and random string)
function generateFileId(originalFileName: string): string {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 8);
    const safeOriginalName = originalFileName
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, '-') // Replace non-alphanumeric (except dots) with hyphens
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    const extension = safeOriginalName.split('.').pop() || 'bin';
    const nameWithoutExtension = safeOriginalName.substring(0, safeOriginalName.lastIndexOf('.')) || 'file';

    // Keep it relatively short but unique
    return `${timestamp}-${randomPart}-${nameWithoutExtension.substring(0, 20)}.${extension}`;
}

// Verify authentication
async function verifyAuthentication(request: Request, env: any): Promise<boolean> {
     if (env.ENVIRONMENT === 'development') {
        console.log('Auth check (Media): Development environment, access granted.');
        return true;
    }
    const jwt = request.headers.get('CF-Access-Jwt-Assertion');
    // In Astro/Cloudflare adapter, Client-ID might not be passed directly this way.
    // JWT is the primary method for Access authentication.
    const authHeader = request.headers.get('Authorization');
    const hasBearer = authHeader && authHeader.startsWith('Bearer ');

    console.log(`Auth check (Media): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
    // Allow if either JWT (Cloudflare Access) or Bearer token is present
    // Explicitly cast both jwt check and hasBearer to boolean
    return Boolean(jwt) || Boolean(hasBearer); 
}

// === API HANDLERS ===

// Placeholder for GET handler
export async function GET(context: APIContext) {
    const { slug } = context.params;
    const { request, locals } = context;
    const env = locals.runtime.env;
    const R2_BUCKET = env.R2_BUCKET as R2Bucket | undefined;

    // List action requires authentication
    if (!slug || slug === 'list') {
         const authenticated = await verifyAuthentication(request, env);
         if (!authenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: commonJsonResponseHeaders });
         }

        if (!R2_BUCKET) {
            console.error('R2 Bucket is not configured in environment.');
            return new Response(JSON.stringify({ error: 'R2 Bucket not configured' }), { status: 503, headers: commonJsonResponseHeaders });
        }

        // --- Implement List Media Logic --- 
        try {
            console.log("Listing objects from R2...");
            const listOptions = {}; // Add options like prefix, limit if needed
            const listed = await R2_BUCKET.list(listOptions);
            console.log(`Found ${listed.objects.length} objects.`);

            const mediaFiles = listed.objects.map((object: R2Object) => {
                // Assuming object.key is the full path/id used
                const name = object.key.split('/').pop() || object.key; // Basic name extraction
                return {
                    id: object.key,
                    name: name,
                    path: `/${object.key}`, // Path relative to bucket root
                    url: `/api/media/${object.key}`, // API URL to potentially fetch the file
                    size: object.size,
                    type: getFileType(object.key),
                    uploaded: object.uploaded.toISOString()
                };
            });

            return new Response(JSON.stringify({ 
                success: true, 
                files: mediaFiles,
                truncated: listed.truncated, // Include R2 list metadata
                cursor: listed.truncated ? listed.cursor : undefined
            }), { headers: commonJsonResponseHeaders });

        } catch (error: any) {
            console.error('Error listing R2 bucket:', error);
             return new Response(JSON.stringify({ 
                success: false,
                error: 'Failed to list media files',
                details: error.message 
            }), { status: 500, headers: commonJsonResponseHeaders });
        }
        // --- End List Media Logic ---

    } else {
        // Handle Get Specific Media File 
        const fileId = slug;
        console.log(`Attempting to GET specific file: ${fileId}`);
        // For now, assume public access for direct file GET - implement logic later
        // NOTE: Add authentication check here if direct file access should be protected
        // const authenticated = await verifyAuthentication(request, env);
        // if (!authenticated) { ... }

        if (!R2_BUCKET) {
             console.error('R2 Bucket is not configured in environment.');
             return new Response(JSON.stringify({ error: 'R2 Bucket not configured' }), { status: 503, headers: commonJsonResponseHeaders });
        }

        // --- Implement Get Specific Media Logic ---
        try {
            const object: R2ObjectBody | null = await R2_BUCKET.get(fileId);

            if (object === null) {
                 return new Response(JSON.stringify({ error: 'File not found' }), {
                    status: 404,
                    headers: commonJsonResponseHeaders // Keep JSON headers for error
                });
            }

            // Prepare headers for the file response
            const headers = new Headers();
            // Manually copy relevant headers instead of using writeHttpMetadata
            if (object.httpMetadata?.contentType) {
                headers.set('Content-Type', object.httpMetadata.contentType);
            }
            if (object.httpMetadata?.contentLanguage) {
                 headers.set('Content-Language', object.httpMetadata.contentLanguage);
            }
            if (object.httpMetadata?.contentDisposition) {
                 headers.set('Content-Disposition', object.httpMetadata.contentDisposition);
            }
            if (object.httpMetadata?.contentEncoding) {
                 headers.set('Content-Encoding', object.httpMetadata.contentEncoding);
            }
            // object.writeHttpMetadata(headers); // Avoid using this due to type mismatch
            headers.set('etag', object.httpEtag); // Set ETag for caching
            // Add cache control headers - adjust as needed
            headers.set('Cache-Control', 'public, max-age=31536000, immutable'); 

            console.log(`Serving file ${fileId} with type ${headers.get('Content-Type')}`);

            // Return the file content directly, casting body via unknown to standard ReadableStream type
            return new Response(object.body as unknown as ReadableStream<any>, {
                headers: headers,
                status: 200
            });

        } catch (error: any) {
             console.error(`Error getting file ${fileId} from R2:`, error);
             return new Response(JSON.stringify({ 
                success: false,
                error: 'Failed to retrieve file', 
                details: error.message 
            }), { status: 500, headers: commonJsonResponseHeaders }); // Keep JSON for error
        }
        // --- End Get Specific Media Logic ---
    }
}

// Placeholder for POST handler (Upload)
export async function POST(context: APIContext) {
    const { slug } = context.params;
    const { request, locals } = context;
    const env = locals.runtime.env;
    const R2_BUCKET = env.R2_BUCKET as R2Bucket | undefined;

    const authenticated = await verifyAuthentication(request, env);
    if (!authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: commonJsonResponseHeaders });
    }

    if (!R2_BUCKET) {
         console.error('R2 Bucket is not configured in environment for upload.');
        return new Response(JSON.stringify({ error: 'R2 Bucket not configured' }), { status: 503, headers: commonJsonResponseHeaders });
    }

    if (slug === 'upload') {
        // --- Implement Upload Media Logic ---
        try {
            const formData = await request.formData();
            const file = formData.get('file') as File | null; // Explicitly type File
            
            if (!file) {
                return new Response(JSON.stringify({ error: 'No file provided in form data' }), {
                    status: 400,
                    headers: commonJsonResponseHeaders
                });
            }

            // Use provided filename or fallback to file's name
            const originalFileName = formData.get('fileName')?.toString() || file.name || 'uploaded-file';
            const fileId = generateFileId(originalFileName);
            const contentType = file.type || getFileType(originalFileName); // Use file type or guess from name

            console.log(`Uploading file: ${originalFileName}, assigned ID: ${fileId}, type: ${contentType}`);

            // Perform the R2 put operation using arrayBuffer
            const fileData = await file.arrayBuffer();
            const uploadedObject = await R2_BUCKET.put(fileId, fileData, {
                httpMetadata: {
                    contentType: contentType,
                    // Add cache control? e.g., 'public, max-age=31536000'
                },
                // You can add custom metadata if needed
                // customMetadata: {
                //    originalName: originalFileName
                // }
            });
            
            console.log(`File ${fileId} uploaded successfully.`);

            // Return success response with file details
            return new Response(JSON.stringify({
                success: true,
                id: uploadedObject.key, // Use the key returned by R2
                name: originalFileName, 
                url: `/api/media/${uploadedObject.key}`, // Use the actual key in the URL
                size: uploadedObject.size,
                type: contentType,
                uploaded: new Date().toISOString()
            }), { headers: commonJsonResponseHeaders });

        } catch (error: any) {
            console.error('Error uploading file to R2:', error);
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Failed to upload file', 
                details: error.message 
            }), { status: 500, headers: commonJsonResponseHeaders });
        }
        // --- End Upload Media Logic ---
    } else {
        return new Response(JSON.stringify({ error: 'Not Found or Invalid Path for POST' }), { status: 404, headers: commonJsonResponseHeaders });
    }
}

// Placeholder for DELETE handler
export async function DELETE(context: APIContext) {
    const { slug } = context.params;
    const { request, locals } = context;
    const env = locals.runtime.env;
    const R2_BUCKET = env.R2_BUCKET as R2Bucket | undefined;

    const authenticated = await verifyAuthentication(request, env);
    if (!authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: commonJsonResponseHeaders });
    }

     if (!R2_BUCKET) {
        console.error('R2 Bucket is not configured in environment for delete.');
        return new Response(JSON.stringify({ error: 'R2 Bucket not configured' }), { status: 503, headers: commonJsonResponseHeaders });
    }

    if (slug && slug !== 'list' && slug !== 'upload') {
        // --- Implement Delete Media Logic ---
        const fileId = slug;
        console.log(`Attempting to delete file: ${fileId}`);
        try {
            // Check if the file exists before attempting deletion (optional but good practice)
            const object = await R2_BUCKET.head(fileId);
            if (!object) {
                return new Response(JSON.stringify({ success: false, error: 'File not found' }), {
                    status: 404,
                    headers: commonJsonResponseHeaders
                });
            }

            // Perform the delete operation
            await R2_BUCKET.delete(fileId);
            console.log(`File ${fileId} deleted successfully.`);

            return new Response(JSON.stringify({ 
                success: true, 
                message: `File ${fileId} deleted successfully` 
            }), { headers: commonJsonResponseHeaders });

        } catch (error: any) {
            console.error(`Error deleting file ${fileId}:`, error);
            // Handle potential R2 errors more specifically if needed
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Failed to delete file', 
                details: error.message
             }), { status: 500, headers: commonJsonResponseHeaders });
        }
        // --- End Delete Media Logic ---
    } else {
         return new Response(JSON.stringify({ error: 'Not Found or Invalid Path for DELETE' }), { status: 404, headers: commonJsonResponseHeaders });
    }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(context: APIContext) {
     console.log(`[media/...slug.ts] OPTIONS invoked.`);
    return new Response(null, {
        status: 204, // No Content
        headers: commonJsonResponseHeaders
    });
}
