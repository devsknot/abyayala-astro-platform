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

### 3. Configurar Cloudflare R2 (opcional, para almacenamiento de medios)

1. Navega a **R2** > **Create bucket**
2. Crea un bucket llamado `abyayala-media`
3. Anota el ID de acceso y la clave secreta
4. Añade estas credenciales como variables de entorno en tu proyecto de Pages:
   - `R2_ACCESS_KEY_ID`: Tu ID de acceso
   - `R2_SECRET_ACCESS_KEY`: Tu clave secreta
   - `R2_BUCKET_NAME`: `abyayala-media`

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
- `/functions/api/auth.js`: Funciones para autenticación
- `/functions/api/content.js`: Funciones para gestión de contenido
- `/functions/api/media.js`: Funciones para gestión de archivos multimedia

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
