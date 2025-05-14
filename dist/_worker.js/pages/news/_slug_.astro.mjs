globalThis.process ??= {}; globalThis.process.env ??= {};
/* empty css                                    */
import { e as createAstro, c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead, b as addAttribute, f as renderSlot, u as unescapeHTML } from '../../chunks/astro/server_Dxfbqb1K.mjs';
import { $ as $$BaseLayout } from '../../chunks/BaseLayout_CnUDxPrG.mjs';
import { $ as $$CategoryTag } from '../../chunks/CategoryTag_CY8MwmrI.mjs';
import { $ as $$FormattedDate } from '../../chunks/FormattedDate_BSmNapZ7.mjs';
import { $ as $$NewsletterSignup } from '../../chunks/NewsletterSignup_DpgYBErg.mjs';
import { C as CATEGORIES, b as SITE_URL } from '../../chunks/consts_BxY7SPQk.mjs';
/* empty css                                     */
import { $ as $$NewsCard } from '../../chunks/NewsCard_B450BOGA.mjs';
import { b as getArticleBySlug, c as getAllArticles } from '../../chunks/contentApi_Cc54Enef.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro$3 = createAstro("https://colectivoabyayala.org");
const $$NewsLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$NewsLayout;
  const { title, description, pubDate, updatedDate, heroImage, category, author } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title, "description": description, "image": heroImage, "data-astro-cid-yxb4v43h": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<article class="news-article" data-astro-cid-yxb4v43h> <div class="hero-container" data-astro-cid-yxb4v43h> <div class="hero-image" data-astro-cid-yxb4v43h> <img${addAttribute(heroImage, "src")}${addAttribute(title, "alt")} onerror="this.onerror=null; this.src='/images/CAAY Logo sin fondo.png'; this.classList.add('fallback-hero-image');" data-astro-cid-yxb4v43h> </div> <div class="hero-overlay" data-astro-cid-yxb4v43h> <div class="container" data-astro-cid-yxb4v43h> ${renderComponent($$result2, "CategoryTag", $$CategoryTag, { "category": category, "size": "large", "absolute": false, "data-astro-cid-yxb4v43h": true })} <h1 data-astro-cid-yxb4v43h>${title}</h1> <div class="meta" data-astro-cid-yxb4v43h> <div class="author" data-astro-cid-yxb4v43h>Por ${author}</div> <div class="date" data-astro-cid-yxb4v43h>${renderComponent($$result2, "FormattedDate", $$FormattedDate, { "date": pubDate, "data-astro-cid-yxb4v43h": true })}</div> ${updatedDate && renderTemplate`<div class="updated" data-astro-cid-yxb4v43h>
Actualizado el ${renderComponent($$result2, "FormattedDate", $$FormattedDate, { "date": updatedDate, "data-astro-cid-yxb4v43h": true })} </div>`} </div> </div> </div> </div> <div class="container" data-astro-cid-yxb4v43h> <div class="content-wrapper" data-astro-cid-yxb4v43h> <div class="content" data-astro-cid-yxb4v43h> <p class="description" data-astro-cid-yxb4v43h>${description}</p> <div class="article-content" data-astro-cid-yxb4v43h> ${renderSlot($$result2, $$slots["default"])} </div> </div> <aside class="sidebar" data-astro-cid-yxb4v43h> <div class="author-widget" data-astro-cid-yxb4v43h> <h3 data-astro-cid-yxb4v43h>Sobre el autor</h3> <div class="author-info" data-astro-cid-yxb4v43h> <div class="author-avatar" data-astro-cid-yxb4v43h> <img src="/author-placeholder.jpg"${addAttribute(author, "alt")} onerror="this.onerror=null; this.src='/images/CAAY Logo sin fondo.png'; this.classList.add('fallback-author-image');" data-astro-cid-yxb4v43h> </div> <div class="author-name" data-astro-cid-yxb4v43h>${author}</div> <p class="author-bio" data-astro-cid-yxb4v43h>Periodista especializado en temas agrarios y de sostenibilidad. Colaborador del colectivo Abya Yala desde 2020.</p> </div> </div> <div class="categories-widget" data-astro-cid-yxb4v43h> <h3 data-astro-cid-yxb4v43h>Categorías</h3> <div class="categories-list" data-astro-cid-yxb4v43h> ${CATEGORIES.map((cat) => renderTemplate`<a${addAttribute(`/category/${cat.id}`, "href")}${addAttribute(`category-link ${cat.id === category ? "active" : ""}`, "class")} data-astro-cid-yxb4v43h> ${cat.name} </a>`)} </div> </div> ${renderComponent($$result2, "NewsletterSignup", $$NewsletterSignup, { "title": "Suscr\xEDbete", "description": "Recibe las \xFAltimas noticias del colectivo Abya Yala en tu correo.", "variant": "compact", "data-astro-cid-yxb4v43h": true })} </aside> </div> </div> </article> ` })} `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/layouts/NewsLayout.astro", void 0);

const $$Astro$2 = createAstro("https://colectivoabyayala.org");
const $$ShareButtons = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ShareButtons;
  const { title, url, description = "", class: className = "" } = Astro2.props;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const emailShareUrl = `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(`share-buttons ${className}`, "class")} data-astro-cid-zllr3mxm> <span class="share-label" data-astro-cid-zllr3mxm>Compartir:</span> <div class="buttons-container" data-astro-cid-zllr3mxm> <a${addAttribute(facebookShareUrl, "href")} target="_blank" rel="noopener noreferrer" class="share-button facebook" aria-label="Compartir en Facebook" data-astro-cid-zllr3mxm> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zllr3mxm> <path d="M12.001 2.002c-5.522 0-9.999 4.477-9.999 9.999 0 4.99 3.656 9.126 8.437 9.879v-6.988h-2.54v-2.891h2.54V9.798c0-2.508 1.493-3.891 3.776-3.891 1.094 0 2.24.195 2.24.195v2.459h-1.264c-1.24 0-1.628.772-1.628 1.563v1.875h2.771l-.443 2.891h-2.328v6.988C18.344 21.129 22 16.992 22 12.001c0-5.522-4.477-9.999-9.999-9.999z" data-astro-cid-zllr3mxm></path> </svg> </a> <a${addAttribute(twitterShareUrl, "href")} target="_blank" rel="noopener noreferrer" class="share-button twitter" aria-label="Compartir en Twitter" data-astro-cid-zllr3mxm> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zllr3mxm> <path d="M19.633 7.997c.013.175.013.349.013.523 0 5.325-4.053 11.461-11.46 11.461-2.282 0-4.402-.661-6.186-1.809.324.037.636.05.973.05a8.07 8.07 0 0 0 5.001-1.721 4.036 4.036 0 0 1-3.767-2.793c.249.037.499.062.761.062.361 0 .724-.05 1.061-.137a4.027 4.027 0 0 1-3.23-3.953v-.05c.537.299 1.16.486 1.82.511a4.022 4.022 0 0 1-1.796-3.354c0-.748.199-1.434.548-2.032a11.457 11.457 0 0 0 8.306 4.215c-.062-.3-.1-.599-.1-.899a4.026 4.026 0 0 1 4.028-4.028c1.16 0 2.207.486 2.943 1.272a7.957 7.957 0 0 0 2.556-.973 4.02 4.02 0 0 1-1.771 2.22 8.073 8.073 0 0 0 2.319-.624 8.645 8.645 0 0 1-2.019 2.083z" data-astro-cid-zllr3mxm></path> </svg> </a> <a${addAttribute(whatsappShareUrl, "href")} target="_blank" rel="noopener noreferrer" class="share-button whatsapp" aria-label="Compartir en WhatsApp" data-astro-cid-zllr3mxm> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zllr3mxm> <path fill-rule="evenodd" clip-rule="evenodd" d="M18.403 5.633A8.919 8.919 0 0 0 12.053 3c-4.948 0-8.976 4.027-8.978 8.977 0 1.582.413 3.126 1.198 4.488L3 21.116l4.759-1.249a8.981 8.981 0 0 0 4.29 1.093h.004c4.947 0 8.975-4.027 8.977-8.977a8.926 8.926 0 0 0-2.627-6.35m-6.35 13.812h-.003a7.446 7.446 0 0 1-3.798-1.041l-.272-.162-2.824.741.753-2.753-.177-.282a7.448 7.448 0 0 1-1.141-3.971c.002-4.114 3.349-7.461 7.465-7.461a7.413 7.413 0 0 1 5.275 2.188 7.42 7.42 0 0 1 2.183 5.279c-.002 4.114-3.349 7.462-7.461 7.462m4.093-5.589c-.225-.113-1.327-.655-1.533-.73-.205-.075-.354-.112-.504.112s-.58.729-.711.879-.262.168-.486.056-.947-.349-1.804-1.113c-.667-.595-1.117-1.329-1.248-1.554s-.014-.346.099-.458c.101-.1.224-.262.336-.393.112-.131.149-.224.224-.374s.038-.281-.019-.393c-.056-.113-.505-1.217-.692-1.666-.181-.435-.366-.377-.504-.383a9.65 9.65 0 0 0-.429-.008.826.826 0 0 0-.599.28c-.206.225-.785.767-.785 1.871s.804 2.171.916 2.321c.112.15 1.582 2.415 3.832 3.387.536.231.954.369 1.279.473.537.171 1.026.146 1.413.089.431-.064 1.327-.542 1.514-1.066.187-.524.187-.973.131-1.067-.056-.094-.207-.151-.43-.263" data-astro-cid-zllr3mxm></path> </svg> </a> <a${addAttribute(linkedinShareUrl, "href")} target="_blank" rel="noopener noreferrer" class="share-button linkedin" aria-label="Compartir en LinkedIn" data-astro-cid-zllr3mxm> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zllr3mxm> <path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM8.339 18.337H5.667v-8.59h2.672v8.59zM7.003 8.574a1.548 1.548 0 1 1 0-3.096 1.548 1.548 0 0 1 0 3.096zm11.335 9.763h-2.669V14.16c0-.996-.018-2.277-1.388-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248h-2.667v-8.59h2.56v1.174h.037c.355-.675 1.227-1.387 2.524-1.387 2.704 0 3.203 1.778 3.203 4.092v4.71z" data-astro-cid-zllr3mxm></path> </svg> </a> <a${addAttribute(emailShareUrl, "href")} class="share-button email" aria-label="Compartir por Email" data-astro-cid-zllr3mxm> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-astro-cid-zllr3mxm> <path d="M20 4H4c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2V6c0-1.103-.897-2-2-2zm0 2v.511l-8 6.223-8-6.222V6h16zM4 18V9.044l7.386 5.745a.994.994 0 0 0 1.228 0L20 9.044 20.002 18H4z" data-astro-cid-zllr3mxm></path> </svg> </a> </div> </div> `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/ShareButtons.astro", void 0);

const $$Astro$1 = createAstro("https://colectivoabyayala.org");
const $$RelatedNews = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$RelatedNews;
  const { currentSlug, category, allNews, count = 3, title = "Noticias relacionadas" } = Astro2.props;
  const relatedNews = allNews.filter((news) => news.slug !== currentSlug && news.category === category).slice(0, count);
  let finalRelatedNews = [...relatedNews];
  if (finalRelatedNews.length < count) {
    const otherNews = allNews.filter((news) => news.slug !== currentSlug && news.category !== category).slice(0, count - finalRelatedNews.length);
    finalRelatedNews = [...finalRelatedNews, ...otherNews];
  }
  return renderTemplate`${finalRelatedNews.length > 0 && renderTemplate`${maybeRenderHead()}<section class="related-news" data-astro-cid-nscm2htv><h3 class="section-title" data-astro-cid-nscm2htv>${title}</h3><div class="news-grid" data-astro-cid-nscm2htv>${finalRelatedNews.map((news) => renderTemplate`${renderComponent($$result, "NewsCard", $$NewsCard, { "title": news.title, "description": news.description, "image": news.featured_image || news.image || "/blog-placeholder-1.jpg", "slug": news.slug, "category": news.category, "date": news.pubDate, "data-astro-cid-nscm2htv": true })}`)}</div></section>`}`;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/RelatedNews.astro", void 0);

const $$Astro = createAstro("https://colectivoabyayala.org");
const prerender = false;
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  if (!slug) {
    return Astro2.redirect("/");
  }
  const article = await getArticleBySlug(slug, Astro2.url.origin);
  if (!article) {
    return Astro2.redirect("/");
  }
  const allArticles = await getAllArticles(Astro2.url.origin);
  const relatedArticles = allArticles.filter((a) => a.category === article.category && a.slug !== article.slug).slice(0, 3);
  `${SITE_URL}/news/${article.slug}`;
  const pubDate = new Date(article.pubDate);
  const currentUrl = `${SITE_URL}/news/${article.slug}/`;
  const contentHtml = article.content;
  return renderTemplate`${renderComponent($$result, "NewsLayout", $$NewsLayout, { "title": article.title, "description": article.description, "pubDate": pubDate, "heroImage": article.featured_image || "/blog-placeholder-1.jpg", "category": article.category, "author": article.author || "Colectivo Abya Yala", "data-astro-cid-vcwz2lde": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="news-header" data-astro-cid-vcwz2lde> ${renderComponent($$result2, "CategoryTag", $$CategoryTag, { "category": article.category, "absolute": false, "data-astro-cid-vcwz2lde": true })} <h1 data-astro-cid-vcwz2lde>${article.title}</h1> <div class="news-meta" data-astro-cid-vcwz2lde> <div class="author-date" data-astro-cid-vcwz2lde> <span class="author" data-astro-cid-vcwz2lde>Por ${article.author || "Colectivo Abya Yala"}</span> <span class="date-separator" data-astro-cid-vcwz2lde>•</span> ${renderComponent($$result2, "FormattedDate", $$FormattedDate, { "date": pubDate, "data-astro-cid-vcwz2lde": true })} </div> ${renderComponent($$result2, "ShareButtons", $$ShareButtons, { "title": article.title, "url": currentUrl, "description": article.description, "data-astro-cid-vcwz2lde": true })} </div> </div> <div class="news-content" data-astro-cid-vcwz2lde> <div data-astro-cid-vcwz2lde>${unescapeHTML(contentHtml)}</div> </div> ${renderComponent($$result2, "ShareButtons", $$ShareButtons, { "title": article.title, "url": currentUrl, "description": article.description, "class": "share-bottom", "data-astro-cid-vcwz2lde": true })} ${renderComponent($$result2, "RelatedNews", $$RelatedNews, { "currentSlug": article.slug, "category": article.category, "allNews": relatedArticles, "count": 3, "data-astro-cid-vcwz2lde": true })} ` })} `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/news/[slug].astro", void 0);

const $$file = "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/pages/news/[slug].astro";
const $$url = "/news/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
