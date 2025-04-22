// src/pages/api/test-endpoint.ts
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  console.log('[src/pages/api/test-endpoint.ts] GET invoked');
  
  // Access environment variables via context.locals.runtime.env
  // For example: const db = context.locals.runtime.env.DB;

  return new Response(
    JSON.stringify({ message: 'Astro API Test endpoint successful!' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' // Basic CORS for testing
      }
    }
  );
}
