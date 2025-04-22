/// <reference types="astro/client" />

// src/env.d.ts
// Defines the types for context.locals provided by the Cloudflare adapter.
declare namespace App {
    interface Locals extends Runtime {
        // Add other custom properties to `locals` here if needed
    }
}

// Define the Runtime type based on Cloudflare Pages environment
// See: https://developers.cloudflare.com/workers/runtime-apis/bindings/
interface Runtime {
    env: {
        // D1 Databases (defined in Cloudflare dashboard or wrangler.toml)
        DB: D1Database;

        // R2 Buckets (defined in Cloudflare dashboard or wrangler.toml)
        R2_BUCKET: R2Bucket;

        // Environment Variables (defined in Cloudflare dashboard or wrangler.toml)
        ENVIRONMENT: string;
        R2_ACCESS_KEY_ID: string;    // Secret, but accessed via env
        R2_SECRET_ACCESS_KEY: string; // Secret, but accessed via env

        // Add other bindings (KV, Services, etc.) or variables if defined
    };
    // Cloudflare specific properties (optional, uncomment if used)
    // cf?: CfProperties;
    // waitUntil?: (promise: Promise<any>) => void;
    // passThroughOnException?: () => void;
}
