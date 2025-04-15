// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://colectivoabyayala.org',
  output: 'server',
  adapter: cloudflare({
    runtime: {
      bindings: {
        DB: "abyayala-db",
        MEDIA_BUCKET: "abyayala-media"
      }
    }
  }),
  build: {
    assets: '_assets'
  }
});
