// astro.config.mjs
export default defineConfig({
	adapter: cloudflare({
      runtime: {
        bindings: {
          DB: "abyayala-db",          // Nombre del binding D1
          MEDIA_BUCKET: "abyayala-media" // Nombre del binding R2
        }
      },
      routes: {
        strategy: "include",
        files: ["./functions/_routes.json"]
      }
	}),
  });
