// astro.config.mjs (Corrección Final)
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://colectivoabyayala.org',
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persistPaths: ['./.wrangler']
    }
  })
});