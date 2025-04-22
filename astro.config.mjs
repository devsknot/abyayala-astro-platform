// astro.config.mjs (Versión Definitiva)
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://colectivoabyayala.org',
  integrations: [mdx(), sitemap(), tailwind()],
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persistPaths: ['./.wrangler']
    }
  }),
  build: {
    assets: '_assets',
    format: 'file'
  },
  server: {
    port: 3000,
    host: true
  }
});