globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, c as createComponent, m as maybeRenderHead, b as addAttribute, r as renderComponent, a as renderTemplate } from './astro/server_Dxfbqb1K.mjs';
import { f as formatDate } from './formatDate_BpCoZLmW.mjs';
import { $ as $$CategoryTag } from './CategoryTag_CY8MwmrI.mjs';
/* empty css                          */

const $$Astro = createAstro("https://colectivoabyayala.org");
const $$NewsCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$NewsCard;
  const {
    title,
    description,
    pubDate,
    date,
    category,
    image,
    slug,
    url,
    featured = false
  } = Astro2.props;
  const dateToUse = pubDate || date;
  const formatDateSafely = (date2) => {
    if (!date2) return "";
    try {
      if (typeof date2 === "string") {
        const dateObj = new Date(date2);
        return dateObj.toISOString();
      } else if (date2 instanceof Date) {
        return date2.toISOString();
      }
      return "";
    } catch (error) {
      console.error("Error al formatear la fecha:", error);
      return "";
    }
  };
  const href = url || (slug ? `/news/${slug}/` : "#");
  const isoDate = formatDateSafely(dateToUse);
  const displayDate = dateToUse ? formatDate(dateToUse) : "";
  return renderTemplate`${maybeRenderHead()}<article${addAttribute(`news-card ${featured ? "featured" : ""}`, "class")}${addAttribute(title, "data-title")}${addAttribute(description, "data-description")}${addAttribute(isoDate, "data-date")}${addAttribute(category, "data-category")} data-astro-cid-ibl2wg7k> <a${addAttribute(href, "href")} class="news-card-link" data-astro-cid-ibl2wg7k> <div class="image-container" data-astro-cid-ibl2wg7k> <img${addAttribute(image, "src")}${addAttribute(title, "alt")} loading="lazy" onerror="this.onerror=null; this.src='/images/CAAY Logo sin fondo.png'; this.classList.add('fallback-image');" data-astro-cid-ibl2wg7k> ${renderComponent($$result, "CategoryTag", $$CategoryTag, { "category": category, "data-astro-cid-ibl2wg7k": true })} </div> <div class="content" data-astro-cid-ibl2wg7k> ${isoDate && renderTemplate`<time${addAttribute(isoDate, "datetime")} data-astro-cid-ibl2wg7k>${displayDate}</time>`} <h3 data-astro-cid-ibl2wg7k>${title}</h3> <p data-astro-cid-ibl2wg7k>${description}</p> <div class="read-more" data-astro-cid-ibl2wg7k> <span data-astro-cid-ibl2wg7k>Leer más</span> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-ibl2wg7k> <line x1="5" y1="12" x2="19" y2="12" data-astro-cid-ibl2wg7k></line> <polyline points="12 5 19 12 12 19" data-astro-cid-ibl2wg7k></polyline> </svg> </div> </div> </a> </article> `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/NewsCard.astro", void 0);

export { $$NewsCard as $ };
