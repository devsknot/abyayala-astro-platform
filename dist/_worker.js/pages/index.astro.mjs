globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                 */
import { e as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../chunks/astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_CnUDxPrG.mjs';
import { $ as $$NewsCard } from '../chunks/NewsCard_B450BOGA.mjs';
import { $ as $$CategoryTag } from '../chunks/CategoryTag_CY8MwmrI.mjs';
import { a as SITE_DESCRIPTION, S as SITE_TITLE } from '../chunks/consts_BxY7SPQk.mjs';
import { c as getAllArticles, g as getAllCategories } from '../chunks/contentApi_Cc54Enef.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://colectivoabyayala.org");
const prerender = false;
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const allArticles = await getAllArticles(Astro2.url.origin);
  const categories = await getAllCategories(Astro2.url.origin);
  const articlesArray = Array.isArray(allArticles) ? allArticles : [];
  const sortedArticles = articlesArray.length > 0 ? articlesArray.sort((a, b) => {
    const dateA = new Date(a.pubDate || a.date || 0).valueOf();
    const dateB = new Date(b.pubDate || b.date || 0).valueOf();
    return dateB - dateA;
  }) : [];
  const featuredNews = sortedArticles.slice(0, 3).map((article) => {
    return {
      title: article.title || "Sin t\xEDtulo",
      description: article.description || "Sin descripci\xF3n",
      pubDate: article.pubDate ? new Date(article.pubDate) : /* @__PURE__ */ new Date(),
      category: article.category || "general",
      image: article.featured_image || "/blog-placeholder-3.jpg",
      slug: article.slug || "",
      featured: sortedArticles.indexOf(article) === 0
    };
  });
  const recentNews = sortedArticles.slice(3, 9).map((article) => {
    return {
      title: article.title || "Sin t\xEDtulo",
      description: article.description || "Sin descripci\xF3n",
      pubDate: article.pubDate ? new Date(article.pubDate) : /* @__PURE__ */ new Date(),
      category: article.category || "general",
      image: article.featured_image || "/blog-placeholder-1.jpg",
      slug: article.slug || ""
    };
  });
  const noArticlesMessage = "No hay art\xEDculos disponibles en este momento. Por favor, vuelva a intentarlo m\xE1s tarde.";
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": SITE_TITLE, "description": SITE_DESCRIPTION, "data-astro-cid-j7pv25f6": true }, { "default": async ($$result2) => renderTemplate`   ${maybeRenderHead()}<section class="featured-news" data-astro-cid-j7pv25f6> <div class="container" data-astro-cid-j7pv25f6> <h2 class="section-title" data-astro-cid-j7pv25f6>Noticias Destacadas</h2> <!-- Contenido de noticias destacadas --> ${featuredNews.length > 0 ? renderTemplate`<div class="featured-grid" data-astro-cid-j7pv25f6> ${featuredNews.map((news) => renderTemplate`${renderComponent($$result2, "NewsCard", $$NewsCard, { "title": news.title, "description": news.description, "pubDate": news.pubDate, "category": news.category, "image": news.image, "slug": news.slug, "featured": news.featured, "data-astro-cid-j7pv25f6": true })}`)} </div>` : renderTemplate`<div class="no-content-message" data-astro-cid-j7pv25f6> <p data-astro-cid-j7pv25f6>${noArticlesMessage}</p> </div>`} </div> </section>  <section class="categories-section" data-astro-cid-j7pv25f6> <div class="container" data-astro-cid-j7pv25f6> <h2 class="section-title" data-astro-cid-j7pv25f6>Explora por Categorías</h2> <!-- Listado de categorías --> ${categories.length > 0 ? renderTemplate`<div class="categories-grid" data-astro-cid-j7pv25f6> ${categories.map((category) => renderTemplate`<a${addAttribute(`/category/${category.id}`, "href")} class="category-card" data-astro-cid-j7pv25f6> <div class="category-icon" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "CategoryTag", $$CategoryTag, { "category": category.id, "size": "large", "absolute": false, "data-astro-cid-j7pv25f6": true })} </div> <h3 data-astro-cid-j7pv25f6>${category.name}</h3> <p data-astro-cid-j7pv25f6>${category.description}</p> </a>`)} </div>` : renderTemplate`<div class="no-content-message" data-astro-cid-j7pv25f6> <p data-astro-cid-j7pv25f6>No hay categorías disponibles en este momento.</p> </div>`} </div> </section>  <section class="recent-news" data-astro-cid-j7pv25f6> <div class="container" data-astro-cid-j7pv25f6> <div class="section-header" data-astro-cid-j7pv25f6> <h2 class="section-title" data-astro-cid-j7pv25f6>Noticias Recientes</h2> <a href="/news" class="view-all" data-astro-cid-j7pv25f6>Ver todas</a> </div> ${recentNews.length > 0 ? renderTemplate`<div class="news-grid" data-astro-cid-j7pv25f6> ${recentNews.map((news) => renderTemplate`${renderComponent($$result2, "NewsCard", $$NewsCard, { "title": news.title, "description": news.description, "pubDate": news.pubDate, "category": news.category, "image": news.image, "slug": news.slug, "data-astro-cid-j7pv25f6": true })}`)} </div>` : renderTemplate`<div class="no-content-message" data-astro-cid-j7pv25f6> <p data-astro-cid-j7pv25f6>${noArticlesMessage}</p> </div>`} </div> </section> ` })} `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/index.astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
