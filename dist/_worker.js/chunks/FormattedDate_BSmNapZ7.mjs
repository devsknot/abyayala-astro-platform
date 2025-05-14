globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, c as createComponent, m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './astro/server_Dxfbqb1K.mjs';
import { f as formatDate, a as formatRelativeDate, b as formatShortDate } from './formatDate_BpCoZLmW.mjs';
/* empty css                          */

const $$Astro = createAstro("https://colectivoabyayala.org");
const $$FormattedDate = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$FormattedDate;
  const { date, format = "long", class: className = "", showIcon = false } = Astro2.props;
  let formattedDate = "";
  switch (format) {
    case "long":
      formattedDate = formatDate(date);
      break;
    case "short":
      formattedDate = formatShortDate(date);
      break;
    case "relative":
      formattedDate = formatRelativeDate(date);
      break;
    default:
      formattedDate = formatDate(date);
  }
  const getISODateSafely = (date2) => {
    if (!date2) return "";
    try {
      const dateObj = typeof date2 === "string" ? new Date(date2) : date2;
      if (isNaN(dateObj.getTime())) {
        return "";
      }
      return dateObj.toISOString();
    } catch (error) {
      console.error("Error al formatear la fecha ISO:", error);
      return "";
    }
  };
  const isoDate = getISODateSafely(date);
  return renderTemplate`${maybeRenderHead()}<time${addAttribute(isoDate, "datetime")}${addAttribute(`date-display ${className}`, "class")} data-astro-cid-baakmyjh> ${showIcon && renderTemplate`<span class="date-icon" data-astro-cid-baakmyjh> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-astro-cid-baakmyjh> <rect x="3" y="4" width="18" height="18" rx="2" ry="2" data-astro-cid-baakmyjh></rect> <line x1="16" y1="2" x2="16" y2="6" data-astro-cid-baakmyjh></line> <line x1="8" y1="2" x2="8" y2="6" data-astro-cid-baakmyjh></line> <line x1="3" y1="10" x2="21" y2="10" data-astro-cid-baakmyjh></line> </svg> </span>`} <span class="date-text" data-astro-cid-baakmyjh>${formattedDate}</span> </time> `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/FormattedDate.astro", void 0);

export { $$FormattedDate as $ };
