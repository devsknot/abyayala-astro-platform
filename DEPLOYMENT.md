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

### 2. Configurar Cloudflare Access

Para proteger el panel de administración:

1. Navega a **Access** > **Applications** > **Add an application**
2. Selecciona **Self-hosted**
3. Configura las siguientes opciones:
   - **Application name**: `Abya Yala CMS`
   - **Session duration**: `24 hours`
   - **Application domain**: `tu-dominio.com/admin*` (ajusta según tu dominio)
4. En **Policies**, crea una nueva política:
   - **Policy name**: `Admin Access`
   - **Action**: `Allow`
   - **Configure rules**: Configura quién puede acceder (por email, grupo, etc.)
5. Guarda la configuración

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

## Configuración de Cloudflare D1 (Base de datos)

Para almacenar el contenido del CMS, utilizamos Cloudflare D1, una base de datos SQL que se integra con Cloudflare Pages Functions:

1. **Crear una base de datos D1**:
   ```bash
   # Instalar o actualizar Wrangler si es necesario
   npm install -g wrangler@latest
   
   # Iniciar sesión en Cloudflare
   wrangler login
   
   # Crear la base de datos
   wrangler d1 create abyayala-cms
   ```

2. **Configurar el binding en wrangler.toml**:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "abyayala-cms"
   database_id = "ID-de-tu-base-de-datos"
   ```

3. **Crear el esquema de la base de datos**:
   Crea un archivo `schema.sql` con el siguiente contenido:
   ```sql
   CREATE TABLE articles (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     content TEXT,
     pub_date TEXT,
     category TEXT,
     featured_image TEXT,
     created_at TEXT DEFAULT (datetime('now')),
     updated_at TEXT DEFAULT (datetime('now')),
     author_id INTEGER REFERENCES authors(id)
   );

   CREATE TABLE authors (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     bio TEXT,
     email TEXT,
     avatar TEXT,
     social_media TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_authors_slug ON authors(slug);

   CREATE TABLE categories (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT
   );

   CREATE TABLE media (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     path TEXT NOT NULL,
     type TEXT NOT NULL,
     size INTEGER NOT NULL,
     uploaded TEXT NOT NULL
   );

   -- Insertar categorías predefinidas
   INSERT INTO categories (id, name, description) VALUES
     ('agricultura', 'Agricultura', 'Noticias sobre prácticas agrícolas, cultivos y temporadas'),
     ('comunidad', 'Comunidad', 'Historias de miembros, cooperación y testimonios'),
     ('sostenibilidad', 'Sostenibilidad', 'Prácticas ecológicas, conservación y biodiversidad'),
     ('politica-agraria', 'Política Agraria', 'Legislación, derechos y movimientos sociales'),
     ('tecnologia-rural', 'Tecnología Rural', 'Innovaciones, herramientas y digitalización'),
     ('cultura', 'Cultura', 'Tradiciones, gastronomía y artesanía'),
     ('eventos', 'Eventos', 'Ferias, encuentros y capacitaciones');

   -- Insertar autores predefinidos
   INSERT INTO authors (slug, name, bio) VALUES
     ('colectivo-abyayala', 'Colectivo Agrario Abya Yala', 'Colectivo de agricultores y activistas dedicados a la promoción de la agricultura sostenible y la soberanía alimentaria.'),
     ('equipo-editorial', 'Equipo Editorial', 'Equipo de redacción y edición de la plataforma de noticias del Colectivo Agrario Abya Yala.'),
     ('corresponsales-comunitarios', 'Corresponsales Comunitarios', 'Red de corresponsales locales que reportan desde sus comunidades sobre temas agrarios y ambientales.');
   ```

4. **Aplicar el esquema a la base de datos**:
   ```bash
   wrangler d1 execute abyayala-cms --file=schema.sql
   ```

5. **Ejecutar migraciones de base de datos**:
   El proyecto incluye un sistema de migraciones para mantener el esquema de la base de datos actualizado. Estas migraciones deben ejecutarse después de cada despliegue o cuando se realicen cambios en el esquema.

   Para ejecutar todas las migraciones disponibles:
   ```bash
   # Desde la raíz del proyecto
   bash ./scripts/migrations/run-migration.sh
   ```

   También puedes ejecutar migraciones individuales:
   ```bash
   # Ejecutar una migración específica
   npx wrangler d1 execute DB --remote --file=./scripts/migrations/nombre-migracion.sql
   ```

   **Migraciones disponibles**:
   - `add-author-column.sql`: Añade la columna `author` (TEXT) a la tabla `articles`
   - `add-tags-column.sql`: Añade la columna `tags` (TEXT) a la tabla `articles`
   - `create-authors-table.sql`: Crea la tabla `authors` y añade la columna `author_id` (INTEGER) a `articles`
   - `remove-author-column.sql`: Elimina la columna `author` redundante de la tabla `articles`, dejando solo `author_id`

   **Estado actual de la base de datos**:
   La base de datos en producción actualmente tiene las siguientes tablas:
   - `articles`: Artículos del blog con campos para título, contenido, categoría, autor_id, etc.
   - `authors`: Información de autores con campos para nombre, biografía, avatar, etc.
   - `categories`: Categorías predefinidas para clasificar los artículos
   - `media`: Información sobre archivos multimedia subidos al sistema
   - `activities`: Registro de actividades del sistema (creación, edición, eliminación de contenido)

   **Estructura actual de la tabla `articles`**:
   ```sql
   CREATE TABLE articles (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     content TEXT,
     pub_date TEXT,
     category TEXT,
     featured_image TEXT,
     created_at TEXT DEFAULT (datetime('now')),
     updated_at TEXT DEFAULT (datetime('now')),
     author_id INTEGER REFERENCES authors(id)
   );
   ```

   **Estructura actual de la tabla `authors`**:
   ```sql
   CREATE TABLE authors (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     slug TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     bio TEXT,
     email TEXT,
     avatar TEXT,
     social_media TEXT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   ```

   **Nota**: Es recomendable ejecutar las migraciones como parte del proceso de despliegue para garantizar que la base de datos esté siempre actualizada.

### 5. Automatizar migraciones en el despliegue

Para automatizar la ejecución de migraciones durante el despliegue, puedes configurar un script de post-despliegue en Cloudflare Pages:

1. En el dashboard de Cloudflare Pages, ve a tu proyecto
2. Navega a **Settings** > **Functions**
3. En la sección **Post-deployment script**, añade:
   ```bash
   bash ./scripts/migrations/run-migration.sh
   ```
4. Guarda los cambios

Esto ejecutará automáticamente todas las migraciones después de cada despliegue exitoso, asegurando que la base de datos esté siempre sincronizada con el código más reciente.

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
