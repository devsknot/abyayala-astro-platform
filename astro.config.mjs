// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
	site: 'https://abyayala.org',
	integrations: [mdx(), sitemap(), tailwind()],
	outDir: './dist',
	publicDir: './public',
	build: {
		// Asegurarse de que los archivos en public/ se copien a la carpeta de salida
		assets: '_assets',
	},
	// Configuración para manejar rutas SPA como /admin
	output: 'static',
	trailingSlash: 'ignore',
});
