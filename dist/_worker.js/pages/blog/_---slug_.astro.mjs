globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                    */
import { e as createAstro, c as createComponent, r as renderComponent, d as renderHead, f as renderSlot, b as addAttribute, a as renderTemplate } from '../../chunks/astro/server_Dxfbqb1K.mjs';
import { g as getCollection, r as renderEntry } from '../../chunks/_astro_content_qN6ZoGmM.mjs';
import { $ as $$BaseHead, a as $$Header, b as $$Footer } from '../../chunks/Footer_DTxTTm51.mjs';
import { $ as $$FormattedDate } from '../../chunks/FormattedDate_BSmNapZ7.mjs';
/* empty css                                     */
export { renderers } from '../../renderers.mjs';

const $$Astro$1 = createAstro("https://colectivoabyayala.org");
const $$BlogPost = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$BlogPost;
  const { title, description, pubDate, updatedDate, heroImage } = Astro2.props;
  return renderTemplate`<html lang="en" data-astro-cid-bvzihdzo> <head>${renderComponent($$result, "BaseHead", $$BaseHead, { "title": title, "description": description, "data-astro-cid-bvzihdzo": true })}${renderHead()}</head> <body data-astro-cid-bvzihdzo> ${renderComponent($$result, "Header", $$Header, { "data-astro-cid-bvzihdzo": true })} <main data-astro-cid-bvzihdzo> <article data-astro-cid-bvzihdzo> <div class="hero-image" data-astro-cid-bvzihdzo> ${heroImage && renderTemplate`<img${addAttribute(1020, "width")}${addAttribute(510, "height")}${addAttribute(heroImage, "src")} alt="" data-astro-cid-bvzihdzo>`} </div> <div class="prose" data-astro-cid-bvzihdzo> <div class="title" data-astro-cid-bvzihdzo> <div class="date" data-astro-cid-bvzihdzo> ${renderComponent($$result, "FormattedDate", $$FormattedDate, { "date": pubDate, "data-astro-cid-bvzihdzo": true })} ${updatedDate && renderTemplate`<div class="last-updated-on" data-astro-cid-bvzihdzo>
Last updated on ${renderComponent($$result, "FormattedDate", $$FormattedDate, { "date": updatedDate, "data-astro-cid-bvzihdzo": true })} </div>`} </div> <h1 data-astro-cid-bvzihdzo>${title}</h1> <hr data-astro-cid-bvzihdzo> </div> ${renderSlot($$result, $$slots["default"])} </div> </article> </main> ${renderComponent($$result, "Footer", $$Footer, { "data-astro-cid-bvzihdzo": true })} </body></html>`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/layouts/BlogPost.astro", void 0);

const $$Astro = createAstro("https://colectivoabyayala.org");
const prerender = false;
const $$ = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$;
  const { slug } = Astro2.params;
  const allPosts = await getCollection("blog");
  const post = allPosts.find((post2) => post2.id === slug);
  if (!post) {
    return Astro2.redirect("/blog");
  }
  const { Content } = await renderEntry(post);
  return renderTemplate`${renderComponent($$result, "BlogPost", $$BlogPost, { ...post.data }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "Content", Content, {})} ` })}`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/blog/[...slug].astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/blog/[...slug].astro";
const $$url = "/blog/[...slug].html";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$,
	file: $$file,
	prerender,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
