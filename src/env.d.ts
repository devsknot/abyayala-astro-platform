/// <reference types="astro/client" />

// Bindings y variables del entorno de Cloudflare Pages (ver wrangler.toml).
interface Env {
    DB: import('@cloudflare/workers-types').D1Database;
    R2_BUCKET: import('@cloudflare/workers-types').R2Bucket;
    ENVIRONMENT: string;
    CF_ACCESS_TEAM_DOMAIN: string;
    CF_ACCESS_AUD: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
    interface Locals extends Runtime {
        // Usuario autenticado vía Cloudflare Access (lo rellena src/middleware.ts)
        user?: import('./lib/auth').AccessUser | null;
    }
}
