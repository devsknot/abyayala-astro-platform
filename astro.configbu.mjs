// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
	site: 'https://colectivoabyayala.org',
	integrations: [mdx(), sitemap(), tailwind()],
	outDir: './dist',
	publicDir: './public',
	build: {
		// Asegurarse de que los archivos en public/ se copien a la carpeta de salida
		assets: '_assets',
	},
	// Configuración para renderizado en servidor con Cloudflare
	output: 'server',
	adapter: cloudflare(),
	trailingSlash: 'ignore',
});