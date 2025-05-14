globalThis.process ??= {}; globalThis.process.env ??= {};
const SITE_TITLE = "Abya Yala";
const SITE_DESCRIPTION = "Plataforma de noticias del colectivo agrario Abya Yala";
const SITE_URL = "https://abyayala.org";
const CATEGORIES = [
  {
    id: "agricultura",
    name: "Agricultura",
    description: "Noticias sobre prácticas agrícolas, cultivos y temporadas"
  },
  {
    id: "comunidad",
    name: "Comunidad",
    description: "Historias de miembros, cooperación y testimonios"
  },
  {
    id: "sostenibilidad",
    name: "Sostenibilidad",
    description: "Prácticas ecológicas, conservación y biodiversidad"
  },
  {
    id: "politica-agraria",
    name: "Política Agraria",
    description: "Legislación, derechos y movimientos sociales"
  },
  {
    id: "tecnologia-rural",
    name: "Tecnología Rural",
    description: "Innovaciones, herramientas y digitalización"
  },
  {
    id: "cultura",
    name: "Cultura",
    description: "Tradiciones, gastronomía y artesanía"
  },
  {
    id: "eventos",
    name: "Eventos",
    description: "Ferias, encuentros y capacitaciones"
  }
];

export { CATEGORIES as C, SITE_TITLE as S, SITE_DESCRIPTION as a, SITE_URL as b };
