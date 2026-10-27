# Guía de Despliegue - Abya Yala CMS

Esta guía te ayudará a desplegar la plataforma Abya Yala en Cloudflare Pages, incluyendo el CMS y las Cloudflare Functions.

## Requisitos Previos

1. Una cuenta de Cloudflare
2. Un repositorio de GitHub con el código del proyecto
3. Node.js y npm instalados en tu máquina local

## Configuración de Cloudflare Pages

### 1. Conectar el Repositorio

1. Inicia sesión en tu [dashboard de Cloudflare](https://dash.cloudflare.com)
2. Navega a **Pages** > **Create a project** > **Connect to Git**
3. Selecciona tu repositorio de GitHub
4. Configura las siguientes opciones de despliegue:
   - **Project name**: `abyayala-astro-platform`
   - **Production branch**: `main` (o la rama que uses para producción)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `NODE_VERSION`: `18.0.0` (o la versión que estés utilizando)
     - `ENVIRONMENT`: `production`

### 2. Autenticación del panel (Cloudflare Access)

- La aplicación de Access **"Abya Yala CMS"** protege `colectivoabyayala.org/admin`
  (team domain `devknot.cloudflareaccess.com`).
- La API **verifica el JWT de Access en el servidor** (`src/middleware.ts` + `src/lib/auth.ts`):
  firma (claves de `/cdn-cgi/access/certs`), emisor y audiencia (`CF_ACCESS_AUD`).
  El token llega en la cookie `CF_Authorization` o en la cabecera `Cf-Access-Jwt-Assertion`.
  Si `CF_ACCESS_TEAM_DOMAIN` o `CF_ACCESS_AUD` no están configuradas, la API rechaza toda escritura.
- Requieren sesión: todo `POST`/`PUT`/`DELETE` bajo `/api/*`, `GET /api/content/activities`
  y `GET /api/media/list`. `GET /api/auth/me` devuelve el usuario actual.
- Las escrituras desde otro origen se rechazan (comprobación de `Origin`).
- Recomendado: añadir también `www.colectivoabyayala.org/admin` y
  `abyayala-astro-platform.pages.dev/admin` a la aplicación de Access, o redirigir `www` al dominio principal.
  Aunque el HTML del panel se vea en esos dominios, la API no acepta escrituras sin un JWT válido.

### 3. Configurar Cloudflare R2 (para almacenamiento de medios)

1. Navega a **R2** > **Create bucket**
2. Crea un bucket llamado `abyayala-media`
3. Anota el ID de acceso y la clave secreta
4. Añade estas credenciales como variables de entorno en tu proyecto de Pages:
   - `R2_ACCESS_KEY_ID`: Tu ID de acceso
   - `R2_SECRET_ACCESS_KEY`: Tu clave secreta
   - `R2_BUCKET_NAME`: `abyayala-media`

#### Estructura de Archivos en R2

Los archivos multimedia se organizan en el bucket R2 siguiendo esta estructura:
```
/YYYY/MM/nombre-archivo.jpg
```

Por ejemplo: `/2025/04/cafe-organico.jpg`

Esta estructura permite una organización cronológica de los archivos y facilita la gestión de versiones.

#### Integración con la Base de Datos

Los archivos multimedia almacenados en R2 tienen sus metadatos guardados en la tabla `media` de la base de datos D1. Esto permite:

1. Listar todos los archivos disponibles en el CMS
2. Buscar archivos por nombre, tipo o fecha
3. Relacionar imágenes con artículos a través del campo `featured_image`

#### Acceso a los Archivos

Los archivos almacenados en R2 son accesibles a través de la API:
- Listado: `GET /api/media/list`
- Obtener archivo: `GET /api/media/{fileId}`
- Subir archivo: `POST /api/media/upload`
- Eliminar archivo: `DELETE /api/media/{fileId}`

El CMS incluye un modo fallback para desarrollo que simula la interacción con R2 cuando no se tiene acceso al bucket real.

## Base de datos D1 y migraciones (Drizzle ORM)

El esquema vive en `src/db/schema.ts` (Drizzle ORM) y es la **única fuente de verdad**.
Cada cambio de esquema genera una migración SQL versionada en `migrations/`, y wrangler
registra en la tabla `d1_migrations` de la base cuáles se aplicaron. Así queda trazado
qué cambió, cuándo y en qué orden.

| Migración | Contenido |
|---|---|
| `0000_baseline.sql` | Esquema existente en producción antes de adoptar el ORM. Usa `IF NOT EXISTS`: en producción no modifica nada, solo queda registrada. |
| `0001_articles_listing_indexes.sql` | Índices `(category, pub_date)` y `(pub_date)` para listados y páginas de categoría. |

### Flujo para cambiar el esquema

```bash
# 1. Editar src/db/schema.ts
# 2. Generar la migración (crea migrations/NNNN_nombre.sql + snapshot en migrations/meta)
npx drizzle-kit generate --name descripcion_del_cambio
# 3. Revisar el SQL generado y commitearlo junto con el cambio de código
# 4. Aplicarla en producción ANTES (o junto con) el despliegue del código que la usa
npm run db:migrate:remote
# Ver estado
npm run db:migrations:list
```

Reglas:
- Nunca editar una migración ya aplicada; crear una nueva.
- Nunca ejecutar `ALTER`/`CREATE` a mano en la consola de D1: el cambio quedaría fuera del historial.
- `npm run db:migrate:remote` necesita credenciales con permiso de escritura en D1
  (`wrangler login` o un `CLOUDFLARE_API_TOKEN` con *D1 Edit*).

### Base local (opcional)

```bash
npm run db:migrate:local
npm run db:seed:local   # categorías y autores base (scripts/seed-local.sql)
npm run dev
```

## Sistema de Seguimiento de Actividades

El CMS de Abya Yala incluye un sistema completo de seguimiento de actividades que registra todas las acciones realizadas en la plataforma. Este sistema proporciona transparencia y trazabilidad para los administradores del sitio.

### Estructura de la Tabla de Actividades

La tabla `activities` en la base de datos D1 almacena el registro de todas las acciones:

```sql
CREATE TABLE activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- create, edit, delete, media_upload, bulk_import
  entity_type TEXT NOT NULL, -- article, media, author
  entity_id TEXT NOT NULL,
  entity_title TEXT NOT NULL,
  user_name TEXT NOT NULL,
  details TEXT, -- JSON con información adicional
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Tipos de Actividades Registradas

El sistema registra los siguientes tipos de actividades:

1. **Artículos**:
   - Creación de nuevos artículos
   - Edición de artículos existentes
   - Eliminación de artículos

2. **Medios**:
   - Carga de nuevas imágenes
   - Eliminación de archivos multimedia

3. **Autores**:
   - Creación de nuevos autores
   - Edición de información de autores
   - Eliminación de autores

4. **Importación Masiva**:
   - Registro de operaciones de importación en lote

### Endpoints de API

El sistema expone los siguientes endpoints para interactuar con el registro de actividades:

- `GET /api/content/activities`: Obtiene la lista de actividades recientes
  - Parámetros opcionales:
    - `limit`: Número máximo de actividades a devolver (default: 10)
    - `type`: Filtrar por tipo de actividad
    - `entity_type`: Filtrar por tipo de entidad

- `POST /api/content/activities`: Registra una nueva actividad
  - Requiere autenticación
  - Cuerpo de la solicitud:
    ```json
    {
      "type": "create",
      "entity_type": "article",
      "entity_id": "slug-del-articulo",
      "entity_title": "Título del artículo",
      "user_name": "Nombre del usuario",
      "details": {
        "category": "agricultura",
        "author_id": 1
      }
    }
    ```

### Visualización en el Dashboard

El panel de administración incluye una sección de "Actividades Recientes" que muestra en tiempo real las últimas acciones realizadas en la plataforma, permitiendo a los administradores monitorear el uso del CMS.

## Despliegue Local con Wrangler

Para probar el proyecto localmente con las Cloudflare Functions:

```bash
# Instalar Wrangler
npm install -g wrangler

# Iniciar sesión en Cloudflare
wrangler login

# Iniciar el servidor de desarrollo
wrangler pages dev --compatibility-date=2025-03-31 --binding ENVIRONMENT=development
```

## Despliegue Manual

Si prefieres desplegar manualmente:

```bash
# Construir el proyecto
npm run build

# Publicar en Cloudflare Pages
wrangler pages publish dist
```

## Estructura de las Funciones de Cloudflare

El proyecto utiliza Cloudflare Functions para la API del CMS:

- `/functions/_middleware.js`: Middleware para autenticación y CORS
- `/functions/api/content.js`: Funciones para gestión de contenido (artículos y categorías)
- `/functions/api/media.js`: Funciones para gestión de archivos multimedia
- `/functions/api/auth.js`: Funciones para autenticación

### API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/content/articles` | GET | Obtener todos los artículos |
| `/api/content/articles` | POST | Crear un nuevo artículo |
| `/api/content/articles/{slug}` | GET | Obtener un artículo específico |
| `/api/content/articles/{slug}` | PUT | Actualizar un artículo existente |
| `/api/content/articles/{slug}` | DELETE | Eliminar un artículo |
| `/api/content/categories` | GET | Obtener todas las categorías |
| `/api/media/upload` | POST | Subir un archivo multimedia |
| `/api/media/list` | GET | Listar archivos multimedia |
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/auth/verify` | GET | Verificar autenticación |

## Configuración del CMS

Una vez desplegado, deberás:

1. Acceder a `tu-dominio.com/admin`
2. Iniciar sesión a través de Cloudflare Access
3. Configurar las categorías y ajustes iniciales

## Solución de Problemas

### Error 401 No Autorizado

Si recibes errores de autenticación:

1. Verifica que Cloudflare Access esté correctamente configurado
2. Asegúrate de que las cabeceras de autenticación se estén enviando correctamente
3. Revisa los logs en el dashboard de Cloudflare

### Errores en las Funciones

Si las funciones no responden:

1. Verifica los logs en **Pages** > **tu-proyecto** > **Functions**
2. Asegúrate de que las variables de entorno estén configuradas correctamente
3. Prueba las funciones localmente con Wrangler

## Mantenimiento

### Actualización de Contenido

El contenido se gestiona a través del CMS en `/admin`. Los artículos se almacenan como archivos Markdown en `src/content/blog/`.

### Actualización del Código

Para actualizar el código:

1. Haz los cambios en tu repositorio local
2. Haz commit y push a GitHub
3. Cloudflare Pages desplegará automáticamente los cambios

## Recursos Adicionales

- [Documentación de Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Documentación de Cloudflare Functions](https://developers.cloudflare.com/pages/platform/functions/)
- [Documentación de Cloudflare Access](https://developers.cloudflare.com/access/)
- [Documentación de Astro](https://docs.astro.build/)
