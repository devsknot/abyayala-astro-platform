// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://colectivoabyayala.org',
  integrations: [sitemap(), tailwind()],
  output: 'server',
  adapter: cloudflare({
    // Expone D1, R2 y las variables de wrangler.toml en `astro dev` (persistidos en .wrangler/).
    platformProxy: {
      enabled: true,
      persistPaths: ['./.wrangler'],
    },
    // El adaptador genera _routes.json: los archivos estáticos (incluido /admin) no pasan por el Worker.
  }),
  build: {
    assets: '_assets',
    format: 'file',
  },
  server: {
    port: 3000,
    host: true,
  },
});
