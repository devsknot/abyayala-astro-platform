globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, c as createComponent, m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './astro/server_Dxfbqb1K.mjs';
/* empty css                          */

const $$Astro = createAstro("https://colectivoabyayala.org");
const $$CategoryTag = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$CategoryTag;
  const { category, size = "small", absolute = true } = Astro2.props;
  const categoryNames = {
    "agricultura": "Agricultura",
    "comunidad": "Comunidad",
    "sostenibilidad": "Sostenibilidad",
    "politica-agraria": "Pol\xEDtica Agraria",
    "tecnologia-rural": "Tecnolog\xEDa Rural",
    "cultura": "Cultura",
    "eventos": "Eventos"
  };
  const categoryColors = {
    "agricultura": "#2E7D32",
    // Verde oscuro
    "comunidad": "#1976D2",
    // Azul
    "sostenibilidad": "#388E3C",
    // Verde claro
    "politica-agraria": "#D32F2F",
    // Rojo
    "tecnologia-rural": "#0288D1",
    // Azul claro
    "cultura": "#7B1FA2",
    // Púrpura
    "eventos": "#F57C00"
    // Naranja
  };
  const displayName = categoryNames[category] || category;
  const color = categoryColors[category] || "var(--color-primary)";
  const classes = [
    "category-tag",
    size,
    absolute ? "absolute" : ""
  ].filter(Boolean).join(" ");
  return renderTemplate`${maybeRenderHead()}<span${addAttribute(classes, "class")}${addAttribute(`background-color: ${color};`, "style")} data-astro-cid-fxd2ypyh> ${displayName} </span> `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/CategoryTag.astro", void 0);

export { $$CategoryTag as $ };
