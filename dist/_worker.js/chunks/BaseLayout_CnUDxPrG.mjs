globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, c as createComponent, b as addAttribute, r as renderComponent, d as renderHead, f as renderSlot, a as renderTemplate } from './astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseHead, a as $$Header, b as $$Footer } from './Footer_DTxTTm51.mjs';
import { S as SITE_TITLE, a as SITE_DESCRIPTION } from './consts_BxY7SPQk.mjs';
/* empty css                          */

const $$Astro = createAstro("https://colectivoabyayala.org");
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const {
    title = SITE_TITLE,
    description = SITE_DESCRIPTION,
    image = "/images/default-og.jpg"
  } = Astro2.props;
  return renderTemplate`<html lang="es"> <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="generator"${addAttribute(Astro2.generator, "content")}><meta name="theme-color" content="#1A5B92"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default">${renderComponent($$result, "BaseHead", $$BaseHead, { "title": title, "description": description, "image": image })}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Roboto:wght@300;400;500;700&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">${renderHead()}</head> <body> <div class="page-wrapper"> ${renderComponent($$result, "Header", $$Header, {})} <main> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} </div> </body></html>`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/layouts/BaseLayout.astro", void 0);

export { $$BaseLayout as $ };
