globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                 */
import { e as createAstro, c as createComponent, m as maybeRenderHead, b as addAttribute, g as renderScript, a as renderTemplate, r as renderComponent } from '../chunks/astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_CnUDxPrG.mjs';
import { C as CATEGORIES, S as SITE_TITLE } from '../chunks/consts_BxY7SPQk.mjs';
import { $ as $$FormattedDate } from '../chunks/FormattedDate_BSmNapZ7.mjs';
import { $ as $$CategoryTag } from '../chunks/CategoryTag_CY8MwmrI.mjs';
/* empty css                                  */
export { renderers } from '../renderers.mjs';

const $$Astro$1 = createAstro("https://colectivoabyayala.org");
const $$SearchBar = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$SearchBar;
  const {
    placeholder = "Buscar noticias...",
    buttonText = "Buscar",
    fullWidth = false
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(`search-container ${fullWidth ? "full-width" : ""}`, "class")} data-astro-cid-mjrxwznw> <form id="search-form" class="search-form" action="/search" method="get" data-astro-cid-mjrxwznw> <div class="search-input-wrapper" data-astro-cid-mjrxwznw> <input type="text" name="q" id="search-input"${addAttribute(placeholder, "placeholder")} autocomplete="off" aria-label="Buscar en el sitio" required data-astro-cid-mjrxwznw> <button type="submit" class="search-button" data-astro-cid-mjrxwznw> <span class="search-icon" data-astro-cid-mjrxwznw> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-mjrxwznw> <circle cx="11" cy="11" r="8" data-astro-cid-mjrxwznw></circle> <line x1="21" y1="21" x2="16.65" y2="16.65" data-astro-cid-mjrxwznw></line> </svg> </span> <span class="button-text" data-astro-cid-mjrxwznw>${buttonText}</span> </button> </div> </form> <div id="search-results" class="search-results" data-astro-cid-mjrxwznw></div> </div>  ${renderScript($$result, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/SearchBar.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/SearchBar.astro", void 0);

const $$Astro = createAstro("https://colectivoabyayala.org");
const $$Search = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Search;
  const query = Astro2.url.searchParams.get("q") || "";
  const allNews = await Astro2.glob(/* #__PURE__ */ Object.assign({"../content/blog/first-post.md": () => import('../chunks/first-post_D3kgKYDZ.mjs'),"../content/blog/markdown-style-guide.md": () => import('../chunks/markdown-style-guide_CKzAB6OD.mjs'),"../content/blog/second-post.md": () => import('../chunks/second-post_asONxqW1.mjs'),"../content/blog/third-post.md": () => import('../chunks/third-post_B6sXBOWZ.mjs')}), () => "../content/blog/*.md");
  const searchResults = query ? allNews.filter((news) => {
    const title = news.frontmatter.title.toLowerCase();
    const description = news.frontmatter.description?.toLowerCase() || "";
    const category = news.frontmatter.category?.toLowerCase() || "";
    const content = news.rawContent?.toLowerCase() || "";
    const searchTerm = query.toLowerCase();
    return title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm) || content.includes(searchTerm);
  }) : [];
  const sortedResults = searchResults.sort(
    (a, b) => new Date(b.frontmatter.pubDate).valueOf() - new Date(a.frontmatter.pubDate).valueOf()
  );
  const pageTitle = query ? `Resultados para "${query}" | ${SITE_TITLE}` : `B\xFAsqueda | ${SITE_TITLE}`;
  const pageDescription = query ? `Resultados de b\xFAsqueda para "${query}" en el colectivo agrario Abya Yala.` : `Busca noticias, art\xEDculos y contenido en el colectivo agrario Abya Yala.`;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": pageTitle, "description": pageDescription, "data-astro-cid-ipsxrsrh": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="search-page" data-astro-cid-ipsxrsrh> <div class="container" data-astro-cid-ipsxrsrh> <div class="page-header" data-astro-cid-ipsxrsrh> <h1 data-astro-cid-ipsxrsrh>Búsqueda</h1> <div class="search-container" data-astro-cid-ipsxrsrh> ${renderComponent($$result2, "SearchBar", $$SearchBar, { "placeholder": "Buscar en Abya Yala...", "buttonText": "Buscar", "fullWidth": true, "data-astro-cid-ipsxrsrh": true })} </div> </div> ${query && renderTemplate`<div class="search-results" data-astro-cid-ipsxrsrh> <div class="results-header" data-astro-cid-ipsxrsrh> <h2 data-astro-cid-ipsxrsrh>Resultados para "${query}"</h2> <p class="results-count" data-astro-cid-ipsxrsrh>${sortedResults.length} resultado${sortedResults.length !== 1 ? "s" : ""} encontrado${sortedResults.length !== 1 ? "s" : ""}</p> </div> ${sortedResults.length > 0 ? renderTemplate`<div class="results-list" data-astro-cid-ipsxrsrh> ${sortedResults.map((result) => renderTemplate`<article class="result-item" data-astro-cid-ipsxrsrh> <div class="result-content" data-astro-cid-ipsxrsrh> <div class="result-meta" data-astro-cid-ipsxrsrh> ${renderComponent($$result2, "CategoryTag", $$CategoryTag, { "category": result.frontmatter.category, "absolute": false, "data-astro-cid-ipsxrsrh": true })} ${renderComponent($$result2, "FormattedDate", $$FormattedDate, { "date": result.frontmatter.pubDate, "format": "relative", "showIcon": true, "class": "date-relative", "data-astro-cid-ipsxrsrh": true })} </div> <h2 class="result-title" data-astro-cid-ipsxrsrh> <a${addAttribute(`/news/${result.frontmatter.slug}`, "href")} data-astro-cid-ipsxrsrh>${result.frontmatter.title}</a> </h2> <p class="result-excerpt" data-astro-cid-ipsxrsrh>${result.frontmatter.description}</p> <a${addAttribute(`/news/${result.frontmatter.slug}`, "href")} class="read-more" data-astro-cid-ipsxrsrh>Leer artículo completo</a> </div> ${result.frontmatter.image && renderTemplate`<div class="result-image" data-astro-cid-ipsxrsrh> <img${addAttribute(result.frontmatter.image, "src")}${addAttribute(result.frontmatter.title, "alt")} loading="lazy" data-astro-cid-ipsxrsrh> </div>`} </article>`)} </div>` : renderTemplate`<div class="no-results" data-astro-cid-ipsxrsrh> <div class="no-results-content" data-astro-cid-ipsxrsrh> <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-ipsxrsrh> <circle cx="11" cy="11" r="8" data-astro-cid-ipsxrsrh></circle> <line x1="21" y1="21" x2="16.65" y2="16.65" data-astro-cid-ipsxrsrh></line> <line x1="8" y1="11" x2="14" y2="11" data-astro-cid-ipsxrsrh></line> </svg> <h3 data-astro-cid-ipsxrsrh>No se encontraron resultados</h3> <p data-astro-cid-ipsxrsrh>No hemos encontrado resultados para "${query}". Intenta con otros términos o explora por categorías.</p> </div> </div>`} <div class="category-suggestions" data-astro-cid-ipsxrsrh> <h3 data-astro-cid-ipsxrsrh>Explora por categorías:</h3> <div class="category-tags" data-astro-cid-ipsxrsrh> ${CATEGORIES.map((category) => renderTemplate`<a${addAttribute(`/category/${category.id}`, "href")} class="category-link" data-astro-cid-ipsxrsrh> ${renderComponent($$result2, "CategoryTag", $$CategoryTag, { "category": category.id, "absolute": false, "data-astro-cid-ipsxrsrh": true })} </a>`)} </div> </div> </div>`} ${!query && renderTemplate`<div class="search-home" data-astro-cid-ipsxrsrh> <div class="search-illustration" data-astro-cid-ipsxrsrh> <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-ipsxrsrh> <circle cx="11" cy="11" r="8" data-astro-cid-ipsxrsrh></circle> <line x1="21" y1="21" x2="16.65" y2="16.65" data-astro-cid-ipsxrsrh></line> </svg> </div> <div class="search-instructions" data-astro-cid-ipsxrsrh> <h2 data-astro-cid-ipsxrsrh>¿Qué estás buscando?</h2> <p data-astro-cid-ipsxrsrh>Busca noticias, artículos y contenido relacionado con el colectivo agrario Abya Yala.</p> <div class="search-examples" data-astro-cid-ipsxrsrh> <p data-astro-cid-ipsxrsrh>Ejemplos de búsqueda:</p> <div class="search-tags" data-astro-cid-ipsxrsrh> <a href="/search?q=agricultura" class="search-tag" data-astro-cid-ipsxrsrh>agricultura</a> <a href="/search?q=sostenibilidad" class="search-tag" data-astro-cid-ipsxrsrh>sostenibilidad</a> <a href="/search?q=comunidad" class="search-tag" data-astro-cid-ipsxrsrh>comunidad</a> <a href="/search?q=tecnología rural" class="search-tag" data-astro-cid-ipsxrsrh>tecnología rural</a> </div> </div> </div> <div class="category-suggestions" data-astro-cid-ipsxrsrh> <h3 data-astro-cid-ipsxrsrh>O explora por categorías:</h3> <div class="category-grid" data-astro-cid-ipsxrsrh> ${CATEGORIES.map((category) => renderTemplate`<a${addAttribute(`/category/${category.id}`, "href")} class="category-card" data-astro-cid-ipsxrsrh> <h4 data-astro-cid-ipsxrsrh>${category.name}</h4> <p data-astro-cid-ipsxrsrh>${category.description}</p> <span class="category-arrow" data-astro-cid-ipsxrsrh>→</span> </a>`)} </div> </div> </div>`} </div> </main> ` })} `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/search.astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/search.astro";
const $$url = "/search.html";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Search,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
