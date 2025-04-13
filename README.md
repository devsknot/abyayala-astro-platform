# Plataforma de Noticias Abya Yala

Plataforma de noticias moderna y funcional para el colectivo agrario "Abya Yala", desarrollada con Astro para ofrecer un sitio web rápido, accesible y fácil de mantener.

![Abya Yala](https://github.com/odpuentesg/abyayala-astro-platform/assets/placeholder-image.jpg)

## ✨ Características

- ✅ Diseño moderno y responsivo optimizado para dispositivos móviles
- ✅ Sistema de categorías para organizar noticias
- ✅ Búsqueda integrada para encontrar contenido fácilmente
- ✅ Filtrado y ordenación de noticias por fecha, categoría y relevancia
- ✅ Componentes para compartir en redes sociales
- ✅ Sección de noticias relacionadas
- ✅ Formulario de suscripción a newsletter
- ✅ Página de contacto con formulario
- ✅ Página "Acerca de" con información del colectivo
- ✅ Política de privacidad
- ✅ SEO optimizado con metadatos, URLs canónicas y datos OpenGraph
- ✅ Soporte para Sitemap y RSS Feed
- ✅ Contenido en formato Markdown para fácil mantenimiento

## 🚀 Estructura del Proyecto

```text
├── public/               # Archivos estáticos (imágenes, favicon, etc.)
│   ├── images/           # Imágenes generales del sitio
│   └── favicon.svg       # Favicon del sitio
├── src/
│   ├── components/       # Componentes reutilizables
│   │   ├── Header.astro  # Encabezado del sitio
│   │   ├── Footer.astro  # Pie de página
│   │   ├── NewsCard.astro # Tarjeta de noticia
│   │   ├── CategoryTag.astro # Etiqueta de categoría
│   │   ├── ShareButtons.astro # Botones para compartir
│   │   ├── RelatedNews.astro # Noticias relacionadas
│   │   ├── NewsletterSignup.astro # Formulario de newsletter
│   │   ├── SearchBar.astro # Barra de búsqueda
│   │   └── FormattedDate.astro # Formateador de fechas
│   ├── layouts/          # Plantillas de página
│   │   ├── BaseLayout.astro # Plantilla base
│   │   └── NewsLayout.astro # Plantilla para noticias
│   ├── pages/            # Páginas del sitio
│   │   ├── index.astro   # Página principal
│   │   ├── about.astro   # Acerca de
│   │   ├── contact.astro # Contacto
│   │   ├── privacy.astro # Política de privacidad
│   │   ├── newsletter.astro # Página de suscripción
│   │   ├── search.astro  # Resultados de búsqueda
│   │   ├── categories.astro # Todas las categorías
│   │   ├── 404.astro     # Página de error 404
│   │   ├── category/     # Páginas de categorías
│   │   │   └── [category].astro # Página dinámica por categoría
│   │   └── news/         # Páginas de noticias
│   │       ├── index.astro # Listado de noticias
│   │       └── [slug].astro # Página de noticia individual
│   ├── content/          # Contenido en Markdown
│   │   └── news/         # Noticias en formato Markdown
│   └── consts.ts         # Constantes globales
├── astro.config.mjs      # Configuración de Astro
├── package.json          # Dependencias y scripts
└── tsconfig.json         # Configuración de TypeScript
```

## 🧞 Comandos

Todos los comandos se ejecutan desde la raíz del proyecto, desde una terminal:

| Comando                   | Acción                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Instala dependencias                             |
| `npm run dev`             | Inicia servidor de desarrollo en `localhost:4321`|
| `npm run build`           | Construye el sitio para producción en `./dist/`  |
| `npm run preview`         | Vista previa de la build antes de desplegar      |
| `npm run astro ...`       | Ejecuta comandos CLI como `astro add`, `astro check` |

## 📝 Gestión de Contenido

Las noticias se almacenan como archivos Markdown en el directorio `src/content/news/`. Cada archivo tiene un frontmatter con metadatos como título, fecha, categoría, imagen destacada, etc.

Para añadir una nueva noticia:
1. Crea un nuevo archivo `.md` en `src/content/news/`
2. Añade el frontmatter con los metadatos necesarios
3. Escribe el contenido de la noticia en formato Markdown

## 🚀 Despliegue

Este proyecto está configurado para ser desplegado en Cloudflare Pages. Para desplegar:

1. Conecta tu repositorio de GitHub a Cloudflare Pages
2. Configura el comando de build como `npm run build`
3. Configura el directorio de salida como `dist`

## 👥 Contribución

Si deseas contribuir a este proyecto, por favor:

1. Haz un fork del repositorio
2. Crea una rama para tu característica (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo `LICENSE` para más información.

## 📧 Contacto

Colectivo Agrario Abya Yala - [contacto@abyayala.org](mailto:contacto@abyayala.org)

Sitio web: [https://abyayala.org](https://abyayala.org)

## Implementación de API y Base de Datos

El CMS ahora utiliza Cloudflare D1 como base de datos SQL para almacenar artículos y categorías. La implementación incluye:

### Base de Datos D1

- Tablas para artículos y categorías
- Esquema SQL completo en `schema.sql`
- Script de inicialización en `scripts/init-database.js`

Para inicializar la base de datos:

```bash
# Instalar dependencias
npm install

# Inicializar la base de datos D1
npm run init-db
```

### API RESTful

La API implementada en Cloudflare Functions proporciona los siguientes endpoints:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/content/articles` | GET | Obtener todos los artículos |
| `/api/content/articles` | POST | Crear un nuevo artículo |
| `/api/content/articles/{slug}` | GET | Obtener un artículo específico |
| `/api/content/articles/{slug}` | PUT | Actualizar un artículo existente |
| `/api/content/articles/{slug}` | DELETE | Eliminar un artículo |
| `/api/content/categories` | GET | Obtener todas las categorías |

### Características de la API

- Autenticación mediante Cloudflare Access
- Manejo de CORS para solicitudes desde el frontend
- Validación de datos en todas las operaciones
- Modo fallback para desarrollo sin conexión a D1
- Manejo de errores robusto

Para más detalles sobre la implementación y despliegue, consulta el archivo [DEPLOYMENT.md](./DEPLOYMENT.md).
