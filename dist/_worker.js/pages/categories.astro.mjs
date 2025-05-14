globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                 */
import { e as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute } from '../chunks/astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_CnUDxPrG.mjs';
import { S as SITE_TITLE } from '../chunks/consts_BxY7SPQk.mjs';
import { $ as $$CategoryTag } from '../chunks/CategoryTag_CY8MwmrI.mjs';
import { g as getAllCategories } from '../chunks/contentApi_Cc54Enef.mjs';
/* empty css                                      */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://colectivoabyayala.org");
const prerender = false;
const $$Categories = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Categories;
  const categories = await getAllCategories(Astro2.url.origin);
  const pageTitle = `Categor\xEDas | ${SITE_TITLE}`;
  const pageDescription = "Explora todas las categor\xEDas de noticias de la plataforma Abya Yala. Encuentra informaci\xF3n sobre agricultura, sostenibilidad, comunidad y m\xE1s.";
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": pageTitle, "description": pageDescription, "data-astro-cid-hioekb44": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<main class="categories-page" data-astro-cid-hioekb44> <div class="container" data-astro-cid-hioekb44> <div class="page-header" data-astro-cid-hioekb44> <h1 data-astro-cid-hioekb44>Categorías</h1> <p class="lead" data-astro-cid-hioekb44>Explora nuestras noticias por temáticas. Selecciona una categoría para ver todas las noticias relacionadas.</p> </div> <div class="categories-grid" data-astro-cid-hioekb44> ${categories.map((category) => renderTemplate`<a${addAttribute(`/category/${category.id}`, "href")} class="category-card" data-astro-cid-hioekb44> <div class="category-header" data-astro-cid-hioekb44> ${renderComponent($$result2, "CategoryTag", $$CategoryTag, { "category": category.id, "size": "large", "absolute": false, "data-astro-cid-hioekb44": true })} </div> <div class="category-content" data-astro-cid-hioekb44> <h2 data-astro-cid-hioekb44>${category.name}</h2> <p data-astro-cid-hioekb44>${category.description}</p> </div> <div class="category-footer" data-astro-cid-hioekb44> <span class="view-more" data-astro-cid-hioekb44>Ver noticias</span> </div> </a>`)} </div> <div class="categories-info" data-astro-cid-hioekb44> <div class="info-card" data-astro-cid-hioekb44> <div class="info-icon" data-astro-cid-hioekb44> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-hioekb44> <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" data-astro-cid-hioekb44></path> <path d="M11 11h2v6h-2zm0-4h2v2h-2z" data-astro-cid-hioekb44></path> </svg> </div> <h3 data-astro-cid-hioekb44>¿No encuentras lo que buscas?</h3> <p data-astro-cid-hioekb44>Si estás interesado en algún tema específico que no aparece en nuestras categorías, no dudes en contactarnos. Estamos constantemente ampliando nuestras áreas de cobertura.</p> <a href="/contact" class="btn-link" data-astro-cid-hioekb44>Contactar</a> </div> <div class="info-card" data-astro-cid-hioekb44> <div class="info-icon" data-astro-cid-hioekb44> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-hioekb44> <path d="M19 3H5c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2zm0 16H5V5h14v14z" data-astro-cid-hioekb44></path> <path d="M11 7h2v10h-2zm-4 3h2v7H7zm8 2h2v5h-2z" data-astro-cid-hioekb44></path> </svg> </div> <h3 data-astro-cid-hioekb44>Estadísticas de contenido</h3> <p data-astro-cid-hioekb44>Actualmente contamos con más de 100 artículos distribuidos en 7 categorías. Publicamos nuevo contenido semanalmente para mantenerte informado sobre el mundo agrario.</p> <a href="/" class="btn-link" data-astro-cid-hioekb44>Ver últimas noticias</a> </div> </div> </div> </main> ` })} `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/categories.astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/categories.astro";
const $$url = "/categories.html";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Categories,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
