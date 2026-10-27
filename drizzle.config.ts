import { defineConfig } from 'drizzle-kit';

// Las migraciones las genera drizzle-kit en ./migrations y las aplica
// `wrangler d1 migrations apply` (ver wrangler.toml → migrations_dir).
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.ts',
  out: './migrations',
});
