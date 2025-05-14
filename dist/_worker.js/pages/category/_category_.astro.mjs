globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                    */
import { e as createAstro, c as createComponent, r as renderComponent, g as renderScript, a as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../../chunks/astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_CnUDxPrG.mjs';
import { $ as $$NewsCard } from '../../chunks/NewsCard_B450BOGA.mjs';
import { g as getAllCategories, a as getArticlesByCategory } from '../../chunks/contentApi_Cc54Enef.mjs';
/* empty css                                         */
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro("https://colectivoabyayala.org");
const prerender = false;
const $$category = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$category;
  console.log(`[CATEGORY-PAGE] Iniciando renderizado de p\xE1gina de categor\xEDa`);
  const { category: categoryId } = Astro2.params;
  console.log(`[CATEGORY-PAGE] Par\xE1metro de categor\xEDa recibido: "${categoryId}"`);
  console.log(`[CATEGORY-PAGE] Obteniendo todas las categor\xEDas...`);
  const categories = await getAllCategories(Astro2.url.origin);
  console.log(`[CATEGORY-PAGE] Categor\xEDas obtenidas: ${categories.length}`);
  console.log(`[CATEGORY-PAGE] Buscando categor\xEDa con ID: "${categoryId}"`);
  const category = categories.find((cat) => cat.id === categoryId);
  if (category) {
    console.log(`[CATEGORY-PAGE] Categor\xEDa encontrada: ${JSON.stringify({
      id: category.id,
      name: category.name
    })}`);
  } else {
    console.log(`[CATEGORY-PAGE] Categor\xEDa no encontrada, redirigiendo a la p\xE1gina principal`);
  }
  if (!category) {
    return Astro2.redirect("/");
  }
  console.log(`[CATEGORY-PAGE] Obteniendo art\xEDculos para la categor\xEDa: "${category.id}"`);
  const newsItems = await getArticlesByCategory(category.id, Astro2.url.origin);
  console.log(`[CATEGORY-PAGE] Art\xEDculos obtenidos: ${newsItems.length}`);
  if (newsItems.length > 0) {
    console.log(`[CATEGORY-PAGE] Primer art\xEDculo: ${JSON.stringify({
      title: newsItems[0].title,
      category: newsItems[0].category
    })}`);
  }
  console.log(`[CATEGORY-PAGE] Ordenando art\xEDculos por fecha...`);
  newsItems.sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf());
  const noArticlesMessage = `No hay art\xEDculos disponibles en la categor\xEDa ${category.name}. Por favor, vuelva a intentarlo m\xE1s tarde.`;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": `${category.name} - Abya Yala`, "description": category.description, "data-astro-cid-l6gs42ny": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="category-header" data-astro-cid-l6gs42ny> <div class="container" data-astro-cid-l6gs42ny> <h1 data-astro-cid-l6gs42ny>${category.name}</h1> <p data-astro-cid-l6gs42ny>${category.description}</p> </div> </div> <section class="category-content" data-astro-cid-l6gs42ny> <div class="container" data-astro-cid-l6gs42ny> <div class="category-filters" data-astro-cid-l6gs42ny> <div class="filter-group" data-astro-cid-l6gs42ny> <label for="sort-by" data-astro-cid-l6gs42ny>Ordenar por:</label> <select id="sort-by" class="filter-select" data-astro-cid-l6gs42ny> <option value="date-desc" data-astro-cid-l6gs42ny>Más recientes primero</option> <option value="date-asc" data-astro-cid-l6gs42ny>Más antiguos primero</option> <option value="title-asc" data-astro-cid-l6gs42ny>Título (A-Z)</option> <option value="title-desc" data-astro-cid-l6gs42ny>Título (Z-A)</option> </select> </div> <div class="filter-group" data-astro-cid-l6gs42ny> <label for="time-period" data-astro-cid-l6gs42ny>Período:</label> <select id="time-period" class="filter-select" data-astro-cid-l6gs42ny> <option value="all" data-astro-cid-l6gs42ny>Todos</option> <option value="month" data-astro-cid-l6gs42ny>Último mes</option> <option value="quarter" data-astro-cid-l6gs42ny>Últimos 3 meses</option> <option value="year" data-astro-cid-l6gs42ny>Último año</option> </select> </div> <div class="search-filter" data-astro-cid-l6gs42ny> <input type="text" id="category-search" placeholder="Buscar en esta categoría..." data-astro-cid-l6gs42ny> <button type="button" id="search-btn" aria-label="Buscar" data-astro-cid-l6gs42ny> <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-l6gs42ny> <circle cx="11" cy="11" r="8" data-astro-cid-l6gs42ny></circle> <line x1="21" y1="21" x2="16.65" y2="16.65" data-astro-cid-l6gs42ny></line> </svg> </button> </div> </div> ${newsItems.length > 0 ? renderTemplate`<div class="news-grid" id="news-grid" data-astro-cid-l6gs42ny> ${newsItems.map((news) => renderTemplate`<div class="news-item"${addAttribute(news.title.toLowerCase(), "data-title")}${addAttribute(new Date(news.pubDate).toISOString(), "data-date")} data-astro-cid-l6gs42ny> ${renderComponent($$result2, "NewsCard", $$NewsCard, { "title": news.title, "description": news.description, "pubDate": new Date(news.pubDate), "category": news.category, "image": news.featured_image || "/blog-placeholder-1.jpg", "slug": news.slug, "data-astro-cid-l6gs42ny": true })} </div>`)} </div>` : renderTemplate`<div class="no-articles" data-astro-cid-l6gs42ny> <p data-astro-cid-l6gs42ny>${noArticlesMessage}</p> <!-- Información de depuración --> <div class="debug-info" data-astro-cid-l6gs42ny> <h3 data-astro-cid-l6gs42ny>Información de depuración (solo visible en desarrollo)</h3> <p data-astro-cid-l6gs42ny><strong data-astro-cid-l6gs42ny>Categoría solicitada:</strong> ${categoryId}</p> <p data-astro-cid-l6gs42ny><strong data-astro-cid-l6gs42ny>Categoría encontrada:</strong> ${category ? "S\xED" : "No"}</p> <p data-astro-cid-l6gs42ny><strong data-astro-cid-l6gs42ny>Nombre de categoría:</strong> ${category?.name}</p> <p data-astro-cid-l6gs42ny><strong data-astro-cid-l6gs42ny>ID de categoría:</strong> ${category?.id}</p> <p data-astro-cid-l6gs42ny><strong data-astro-cid-l6gs42ny>Total de categorías disponibles:</strong> ${categories.length}</p> <h4 data-astro-cid-l6gs42ny>Todas las categorías disponibles:</h4> <ul data-astro-cid-l6gs42ny> ${categories.map((cat) => renderTemplate`<li data-astro-cid-l6gs42ny> <strong data-astro-cid-l6gs42ny>${cat.name}</strong> (ID: ${cat.id})
${cat.id === categoryId && renderTemplate`<span class="highlight" data-astro-cid-l6gs42ny> ← COINCIDENCIA</span>`} </li>`)} </ul> </div> </div>`} <div class="pagination" data-astro-cid-l6gs42ny> <button class="pagination-btn" disabled data-astro-cid-l6gs42ny>Anterior</button> <span class="pagination-info" data-astro-cid-l6gs42ny>Página 1 de 1</span> <button class="pagination-btn" disabled data-astro-cid-l6gs42ny>Siguiente</button> </div> </div> </section> ` })}  ${renderScript($$result, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/category/[category].astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/category/[category].astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/category/[category].astro";
const $$url = "/category/[category].html";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$category,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
