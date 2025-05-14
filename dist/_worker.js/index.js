globalThis.process ??= {}; globalThis.process.env ??= {};
import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_BvX8E2pq.mjs';
import { manifest } from './manifest_BJXyXyof.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/404.astro.mjs');
const _page2 = () => import('./pages/about.astro.mjs');
const _page3 = () => import('./pages/api/content/activities.astro.mjs');
const _page4 = () => import('./pages/api/content/articles/_---slug_.astro.mjs');
const _page5 = () => import('./pages/api/content/authors/_---slug_.astro.mjs');
const _page6 = () => import('./pages/api/content/bulk-import.astro.mjs');
const _page7 = () => import('./pages/api/content/categories/_---slug_.astro.mjs');
const _page8 = () => import('./pages/api/media/_---slug_.astro.mjs');
const _page9 = () => import('./pages/api/test-endpoint.astro.mjs');
const _page10 = () => import('./pages/blog.astro.mjs');
const _page11 = () => import('./pages/blog/_---slug_.astro.mjs');
const _page12 = () => import('./pages/categories.astro.mjs');
const _page13 = () => import('./pages/category/_category_.astro.mjs');
const _page14 = () => import('./pages/contact.astro.mjs');
const _page15 = () => import('./pages/debug-category.astro.mjs');
const _page16 = () => import('./pages/news/_slug_.astro.mjs');
const _page17 = () => import('./pages/news.astro.mjs');
const _page18 = () => import('./pages/newsletter.astro.mjs');
const _page19 = () => import('./pages/privacy.astro.mjs');
const _page20 = () => import('./pages/rss.xml.astro.mjs');
const _page21 = () => import('./pages/search.astro.mjs');
const _page22 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js", _page0],
    ["src/pages/404.astro", _page1],
    ["src/pages/about.astro", _page2],
    ["src/pages/api/content/activities/index.ts", _page3],
    ["src/pages/api/content/articles/[...slug].ts", _page4],
    ["src/pages/api/content/authors/[...slug].ts", _page5],
    ["src/pages/api/content/bulk-import.ts", _page6],
    ["src/pages/api/content/categories/[...slug].ts", _page7],
    ["src/pages/api/media/[...slug].ts", _page8],
    ["src/pages/api/test-endpoint.ts", _page9],
    ["src/pages/blog/index.astro", _page10],
    ["src/pages/blog/[...slug].astro", _page11],
    ["src/pages/categories.astro", _page12],
    ["src/pages/category/[category].astro", _page13],
    ["src/pages/contact.astro", _page14],
    ["src/pages/debug-category.astro", _page15],
    ["src/pages/news/[slug].astro", _page16],
    ["src/pages/news/index.astro", _page17],
    ["src/pages/newsletter.astro", _page18],
    ["src/pages/privacy.astro", _page19],
    ["src/pages/rss.xml.js", _page20],
    ["src/pages/search.astro", _page21],
    ["src/pages/index.astro", _page22]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = undefined;
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (_start in serverEntrypointModule) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
