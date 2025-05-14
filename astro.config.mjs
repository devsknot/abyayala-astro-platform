// astro.config.mjs (Versión Definitiva)
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// Intentando invalidar la caché de construcción con un comentario - {{TIMESTAMP}}
export default defineConfig({
  site: 'https://colectivoabyayala.org',
  integrations: [mdx(), sitemap(), tailwind()],
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persistPaths: ['./.wrangler']
    },
    // routes: { 
    //   exclude: ['/api/*']
    // }
  }),
  build: {
    assets: '_assets',
    format: 'file' // Changed from 'directory' to 'file'
  },
  server: {
    port: 3000,
    host: true
  }
});