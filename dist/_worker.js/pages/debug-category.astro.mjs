globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                 */
import { e as createAstro, c as createComponent, r as renderComponent, g as renderScript, a as renderTemplate, m as maybeRenderHead, F as Fragment, b as addAttribute } from '../chunks/astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseLayout } from '../chunks/BaseLayout_CnUDxPrG.mjs';
/* empty css                                          */
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro("https://colectivoabyayala.org");
const prerender = false;
const $$DebugCategory = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DebugCategory;
  const apiUrl = `${Astro2.url.origin}/api/content/debug/category-test`;
  let debugData = null;
  let error = null;
  try {
    console.log(`Realizando solicitud a: ${apiUrl}`);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      error = `Error HTTP: ${response.status} ${response.statusText}`;
    } else {
      debugData = await response.json();
    }
  } catch (e) {
    error = e.message || "Error desconocido";
  }
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": "Depuraci\xF3n de Categor\xEDas", "description": "Herramienta de depuraci\xF3n para categor\xEDas", "data-astro-cid-aym6tzfi": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="debug-container" data-astro-cid-aym6tzfi> <h1 data-astro-cid-aym6tzfi>Depuración de Categorías</h1> <div class="debug-section" data-astro-cid-aym6tzfi> <h2 data-astro-cid-aym6tzfi>Estado de la API</h2> ${error ? renderTemplate`<div class="error-message" data-astro-cid-aym6tzfi> <p data-astro-cid-aym6tzfi>Error: ${error}</p> </div>` : renderTemplate`<div class="success-message" data-astro-cid-aym6tzfi> <p data-astro-cid-aym6tzfi>API funcionando correctamente</p> <p data-astro-cid-aym6tzfi>Timestamp: ${debugData?.timestamp}</p> </div>`} </div> ${debugData && renderTemplate`${renderComponent($$result2, "Fragment", Fragment, { "data-astro-cid-aym6tzfi": true }, { "default": async ($$result3) => renderTemplate` <div class="debug-section" data-astro-cid-aym6tzfi> <h2 data-astro-cid-aym6tzfi>Categorías Disponibles (${debugData.categories.length})</h2> <div class="data-table" data-astro-cid-aym6tzfi> <table data-astro-cid-aym6tzfi> <thead data-astro-cid-aym6tzfi> <tr data-astro-cid-aym6tzfi> <th data-astro-cid-aym6tzfi>ID</th> <th data-astro-cid-aym6tzfi>Nombre</th> <th data-astro-cid-aym6tzfi>Acciones</th> </tr> </thead> <tbody data-astro-cid-aym6tzfi> ${debugData.categories.map((cat) => renderTemplate`<tr data-astro-cid-aym6tzfi> <td data-astro-cid-aym6tzfi>${cat.id}</td> <td data-astro-cid-aym6tzfi>${cat.name}</td> <td data-astro-cid-aym6tzfi> <a${addAttribute(`/category/${cat.id}`, "href")} target="_blank" class="action-link" data-astro-cid-aym6tzfi>Ver página</a> <button class="test-btn"${addAttribute(cat.id, "data-category")} data-astro-cid-aym6tzfi>Probar API</button> </td> </tr>`)} </tbody> </table> </div> </div> <div class="debug-section" data-astro-cid-aym6tzfi> <h2 data-astro-cid-aym6tzfi>Conteo de Artículos por Categoría</h2> <div class="data-table" data-astro-cid-aym6tzfi> <table data-astro-cid-aym6tzfi> <thead data-astro-cid-aym6tzfi> <tr data-astro-cid-aym6tzfi> <th data-astro-cid-aym6tzfi>Categoría</th> <th data-astro-cid-aym6tzfi>Cantidad</th> </tr> </thead> <tbody data-astro-cid-aym6tzfi> ${debugData.categoryCounts.map((count) => renderTemplate`<tr data-astro-cid-aym6tzfi> <td data-astro-cid-aym6tzfi>${count.category}</td> <td data-astro-cid-aym6tzfi>${count.count}</td> </tr>`)} </tbody> </table> </div> </div> <div class="debug-section" data-astro-cid-aym6tzfi> <h2 data-astro-cid-aym6tzfi>Ejemplos de Artículos (Agricultura)</h2> <p data-astro-cid-aym6tzfi>Total de artículos en categoría "agricultura": ${debugData.agriculturaCount}</p> ${debugData.agriculturaExamples.length > 0 ? renderTemplate`<div class="data-table" data-astro-cid-aym6tzfi> <table data-astro-cid-aym6tzfi> <thead data-astro-cid-aym6tzfi> <tr data-astro-cid-aym6tzfi> <th data-astro-cid-aym6tzfi>ID</th> <th data-astro-cid-aym6tzfi>Slug</th> <th data-astro-cid-aym6tzfi>Título</th> <th data-astro-cid-aym6tzfi>Categoría</th> </tr> </thead> <tbody data-astro-cid-aym6tzfi> ${debugData.agriculturaExamples.map((article) => renderTemplate`<tr data-astro-cid-aym6tzfi> <td data-astro-cid-aym6tzfi>${article.id}</td> <td data-astro-cid-aym6tzfi>${article.slug}</td> <td data-astro-cid-aym6tzfi>${article.title}</td> <td data-astro-cid-aym6tzfi>${article.category}</td> </tr>`)} </tbody> </table> </div>` : renderTemplate`<p data-astro-cid-aym6tzfi>No se encontraron ejemplos.</p>`} </div> <div class="debug-section" data-astro-cid-aym6tzfi> <h2 data-astro-cid-aym6tzfi>Prueba de API</h2> <div class="api-test" data-astro-cid-aym6tzfi> <div class="input-group" data-astro-cid-aym6tzfi> <label for="category-input" data-astro-cid-aym6tzfi>ID de Categoría:</label> <input type="text" id="category-input" placeholder="Ej: agricultura" data-astro-cid-aym6tzfi> <button id="test-api-btn" data-astro-cid-aym6tzfi>Probar</button> </div> <div class="result-container" data-astro-cid-aym6tzfi> <h3 data-astro-cid-aym6tzfi>Resultado:</h3> <pre id="api-result" data-astro-cid-aym6tzfi>Esperando prueba...</pre> </div> </div> </div> ` })}`} </div> ` })}  ${renderScript($$result, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/debug-category.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/debug-category.astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/debug-category.astro";
const $$url = "/debug-category.html";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$DebugCategory,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
