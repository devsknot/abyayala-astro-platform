globalThis.process ??= {}; globalThis.process.env ??= {};
export { renderers } from '../../../renderers.mjs';

const commonJsonResponseHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Adjust in production
  "Content-Type": "application/json",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, CF-Access-Jwt-Assertion, CF-Access-Client-Id",
  "Access-Control-Max-Age": "86400"
};
function getFileType(fileName) {
  if (!fileName) return "application/octet-stream";
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "json":
      return "application/json";
    case "csv":
      return "text/csv";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    // Add more types as needed
    default:
      return "application/octet-stream";
  }
}
function generateFileId(originalFileName) {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8);
  const safeOriginalName = originalFileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  const extension = safeOriginalName.split(".").pop() || "bin";
  const nameWithoutExtension = safeOriginalName.substring(0, safeOriginalName.lastIndexOf(".")) || "file";
  return `${timestamp}-${randomPart}-${nameWithoutExtension.substring(0, 20)}.${extension}`;
}
async function verifyAuthentication(request, env) {
  if (env.ENVIRONMENT === "development") {
    console.log("Auth check (Media): Development environment, access granted.");
    return true;
  }
  const jwt = request.headers.get("CF-Access-Jwt-Assertion");
  const authHeader = request.headers.get("Authorization");
  const hasBearer = authHeader && authHeader.startsWith("Bearer ");
  console.log(`Auth check (Media): Production. JWT: ${!!jwt}, Bearer: ${hasBearer}`);
  return Boolean(jwt) || Boolean(hasBearer);
}
async function GET(context) {
  const { slug } = context.params;
  const { request, locals } = context;
  const env = locals.runtime.env;
  const R2_BUCKET = env.R2_BUCKET;
  if (!slug || slug === "list") {
    const authenticated = await verifyAuthentication(request, env);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: commonJsonResponseHeaders });
    }
    if (!R2_BUCKET) {
      console.error("R2 Bucket is not configured in environment.");
      return new Response(JSON.stringify({ error: "R2 Bucket not configured" }), { status: 503, headers: commonJsonResponseHeaders });
    }
    try {
      console.log("Listing objects from R2...");
      const listOptions = {};
      const listed = await R2_BUCKET.list(listOptions);
      console.log(`Found ${listed.objects.length} objects.`);
      const mediaFiles = listed.objects.map((object) => {
        const name = object.key.split("/").pop() || object.key;
        return {
          id: object.key,
          name,
          path: `/${object.key}`,
          // Path relative to bucket root
          url: `/api/media/${object.key}`,
          // API URL to potentially fetch the file
          size: object.size,
          type: getFileType(object.key),
          uploaded: object.uploaded.toISOString()
        };
      });
      return new Response(JSON.stringify({
        success: true,
        files: mediaFiles,
        truncated: listed.truncated,
        // Include R2 list metadata
        cursor: listed.truncated ? listed.cursor : void 0
      }), { headers: commonJsonResponseHeaders });
    } catch (error) {
      console.error("Error listing R2 bucket:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to list media files",
        details: error.message
      }), { status: 500, headers: commonJsonResponseHeaders });
    }
  } else {
    const fileId = slug;
    console.log(`Attempting to GET specific file: ${fileId}`);
    if (!R2_BUCKET) {
      console.error("R2 Bucket is not configured in environment.");
      return new Response(JSON.stringify({ error: "R2 Bucket not configured" }), { status: 503, headers: commonJsonResponseHeaders });
    }
    try {
      const object = await R2_BUCKET.get(fileId);
      if (object === null) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: commonJsonResponseHeaders
          // Keep JSON headers for error
        });
      }
      const headers = new Headers();
      if (object.httpMetadata?.contentType) {
        headers.set("Content-Type", object.httpMetadata.contentType);
      }
      if (object.httpMetadata?.contentLanguage) {
        headers.set("Content-Language", object.httpMetadata.contentLanguage);
      }
      if (object.httpMetadata?.contentDisposition) {
        headers.set("Content-Disposition", object.httpMetadata.contentDisposition);
      }
      if (object.httpMetadata?.contentEncoding) {
        headers.set("Content-Encoding", object.httpMetadata.contentEncoding);
      }
      headers.set("etag", object.httpEtag);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      console.log(`Serving file ${fileId} with type ${headers.get("Content-Type")}`);
      return new Response(object.body, {
        headers,
        status: 200
      });
    } catch (error) {
      console.error(`Error getting file ${fileId} from R2:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to retrieve file",
        details: error.message
      }), { status: 500, headers: commonJsonResponseHeaders });
    }
  }
}
async function POST(context) {
  const { slug } = context.params;
  const { request, locals } = context;
  const env = locals.runtime.env;
  const R2_BUCKET = env.R2_BUCKET;
  const authenticated = await verifyAuthentication(request, env);
  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: commonJsonResponseHeaders });
  }
  if (!R2_BUCKET) {
    console.error("R2 Bucket is not configured in environment for upload.");
    return new Response(JSON.stringify({ error: "R2 Bucket not configured" }), { status: 503, headers: commonJsonResponseHeaders });
  }
  if (slug === "upload") {
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided in form data" }), {
          status: 400,
          headers: commonJsonResponseHeaders
        });
      }
      const originalFileName = formData.get("fileName")?.toString() || file.name || "uploaded-file";
      const fileId = generateFileId(originalFileName);
      const contentType = file.type || getFileType(originalFileName);
      console.log(`Uploading file: ${originalFileName}, assigned ID: ${fileId}, type: ${contentType}`);
      const fileData = await file.arrayBuffer();
      const uploadedObject = await R2_BUCKET.put(fileId, fileData, {
        httpMetadata: {
          contentType
          // Add cache control? e.g., 'public, max-age=31536000'
        }
        // You can add custom metadata if needed
        // customMetadata: {
        //    originalName: originalFileName
        // }
      });
      console.log(`File ${fileId} uploaded successfully.`);
      return new Response(JSON.stringify({
        success: true,
        id: uploadedObject.key,
        // Use the key returned by R2
        name: originalFileName,
        url: `/api/media/${uploadedObject.key}`,
        // Use the actual key in the URL
        size: uploadedObject.size,
        type: contentType,
        uploaded: (/* @__PURE__ */ new Date()).toISOString()
      }), { headers: commonJsonResponseHeaders });
    } catch (error) {
      console.error("Error uploading file to R2:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to upload file",
        details: error.message
      }), { status: 500, headers: commonJsonResponseHeaders });
    }
  } else {
    return new Response(JSON.stringify({ error: "Not Found or Invalid Path for POST" }), { status: 404, headers: commonJsonResponseHeaders });
  }
}
async function DELETE(context) {
  const { slug } = context.params;
  const { request, locals } = context;
  const env = locals.runtime.env;
  const R2_BUCKET = env.R2_BUCKET;
  const authenticated = await verifyAuthentication(request, env);
  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: commonJsonResponseHeaders });
  }
  if (!R2_BUCKET) {
    console.error("R2 Bucket is not configured in environment for delete.");
    return new Response(JSON.stringify({ error: "R2 Bucket not configured" }), { status: 503, headers: commonJsonResponseHeaders });
  }
  if (slug && slug !== "list" && slug !== "upload") {
    const fileId = slug;
    console.log(`Attempting to delete file: ${fileId}`);
    try {
      const object = await R2_BUCKET.head(fileId);
      if (!object) {
        return new Response(JSON.stringify({ success: false, error: "File not found" }), {
          status: 404,
          headers: commonJsonResponseHeaders
        });
      }
      await R2_BUCKET.delete(fileId);
      console.log(`File ${fileId} deleted successfully.`);
      return new Response(JSON.stringify({
        success: true,
        message: `File ${fileId} deleted successfully`
      }), { headers: commonJsonResponseHeaders });
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to delete file",
        details: error.message
      }), { status: 500, headers: commonJsonResponseHeaders });
    }
  } else {
    return new Response(JSON.stringify({ error: "Not Found or Invalid Path for DELETE" }), { status: 404, headers: commonJsonResponseHeaders });
  }
}
async function OPTIONS(context) {
  console.log(`[media/...slug.ts] OPTIONS invoked.`);
  return new Response(null, {
    status: 204,
    // No Content
    headers: commonJsonResponseHeaders
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    DELETE,
    GET,
    OPTIONS,
    POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
