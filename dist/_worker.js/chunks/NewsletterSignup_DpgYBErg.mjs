globalThis.process ??= {}; globalThis.process.env ??= {};
import { e as createAstro, c as createComponent, m as maybeRenderHead, b as addAttribute, a as renderTemplate } from './astro/server_Dxfbqb1K.mjs';
/* empty css                          */

const $$Astro = createAstro("https://colectivoabyayala.org");
const $$NewsletterSignup = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$NewsletterSignup;
  const {
    title = "Suscr\xEDbete a nuestro bolet\xEDn",
    description = "Recibe las \xFAltimas noticias y actualizaciones del colectivo agrario Abya Yala directamente en tu correo.",
    buttonText = "Suscribirse",
    class: className = "",
    variant = "default"
  } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(`newsletter-signup ${variant} ${className}`, "class")} data-astro-cid-bfbmamsi> <div class="newsletter-content" data-astro-cid-bfbmamsi> ${variant !== "inline" && renderTemplate`<h3 class="newsletter-title" data-astro-cid-bfbmamsi>${title}</h3>`} ${variant !== "compact" && renderTemplate`<p class="newsletter-description" data-astro-cid-bfbmamsi>${description}</p>`} </div> <form class="newsletter-form" data-astro-cid-bfbmamsi> ${variant === "inline" && renderTemplate`<label for="email" class="inline-label" data-astro-cid-bfbmamsi>${title}</label>`} <div class="input-group" data-astro-cid-bfbmamsi> <input type="email" name="email" id="email" placeholder="Tu correo electrónico" required aria-label="Tu correo electrónico" data-astro-cid-bfbmamsi> <button type="submit" class="submit-button" data-astro-cid-bfbmamsi> ${buttonText} </button> </div> <div class="privacy-notice" data-astro-cid-bfbmamsi> <small data-astro-cid-bfbmamsi>Al suscribirte, aceptas nuestra <a href="/politica-privacidad" data-astro-cid-bfbmamsi>política de privacidad</a>.</small> </div> </form> </div> `;
}, "C:/Users/PorTacho/Documents/Knot/Proyecto/Prototipados/abyayala-astro-platform/src/components/NewsletterSignup.astro", void 0);

export { $$NewsletterSignup as $ };
