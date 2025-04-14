# Carga Masiva de Artículos - CMS Abya Yala

## Descripción General

Este módulo permite la importación masiva de artículos desde el blog original de Colectivo Agrario Abya Yala hacia el nuevo CMS. El sistema facilita la migración de contenido mediante la carga de archivos JSON estructurados, procesando automáticamente tanto el contenido textual como las imágenes asociadas.

## Estructura del JSON

El sistema acepta un archivo JSON con la siguiente estructura:

```json
{
  "articles": [
    {
      "slug": "titulo-del-articulo-en-formato-slug",
      "title": "Título del Artículo",
      "description": "Descripción breve del artículo",
      "content": "<p>Contenido HTML completo del artículo...</p>",
      "pubDate": "2025-04-14T00:00:00.000Z",
      "category": "politica-agraria",
      "featured_image": "/2025/04/imagen-destacada.jpg",
      "original_url": "https://colectivoagrarioabyayala.blogspot.com/2022/04/titulo-original.html",
      "tags": ["tag1", "tag2"]
    }
  ],
  "images": [
    {
      "original_url": "https://blogger.googleusercontent.com/img/original.jpg",
      "new_path": "/2025/04/imagen-destacada.jpg",
      "article_slug": "titulo-del-articulo-en-formato-slug",
      "is_featured": true
    }
  ],
  "stats": {
    "total_articles": 45,
    "total_images": 78,
    "categories": {
      "agricultura": 12,
      "politica-agraria": 15
    }
  }
}
```

## Categorías Disponibles

El sistema soporta las siguientes categorías para la clasificación de artículos:

| ID               | Nombre            | Descripción                                                    |
|------------------|-------------------|----------------------------------------------------------------|
| agricultura      | Agricultura       | Noticias sobre prácticas agrícolas, cultivos y temporadas      |
| comunidad        | Comunidad         | Historias de miembros, cooperación y testimonios               |
| sostenibilidad   | Sostenibilidad    | Prácticas ecológicas, conservación y biodiversidad             |
| politica-agraria | Política Agraria  | Legislación, derechos y movimientos sociales                   |
| tecnologia-rural | Tecnología Rural  | Innovaciones, herramientas y digitalización                    |
| cultura          | Cultura           | Tradiciones, gastronomía y artesanía                           |
| eventos          | Eventos           | Ferias, encuentros y capacitaciones                            |
| noticias         | Noticias          | Actualizaciones y eventos recientes del colectivo              |
| analisis         | Análisis          | Artículos de análisis sobre temas agrarios y territoriales     |
| investigacion    | Investigación     | Estudios y trabajos de investigación realizados por el colectivo |
| internacional    | Internacional     | Noticias y análisis de temas internacionales relacionados      |
| comunicados      | Comunicados       | Declaraciones oficiales y pronunciamientos del colectivo       |
| testimonios      | Testimonios       | Historias y experiencias de miembros de la comunidad           |

## Funcionalidades Principales

### 1. Carga de Archivos
- Interfaz de arrastrar y soltar para archivos JSON
- Validación de formato y estructura
- Soporte para archivos de gran tamaño

### 2. Previsualización de Contenido
- Tabla resumen de artículos a importar
- Vista detallada de cada artículo
- Estadísticas de la importación

### 3. Configuración de Importación
- Opciones para manejo de duplicados
- Filtrado por categorías
- Validación de URLs de imágenes
- Programación de publicación

### 4. Procesamiento de Imágenes
- Descarga automática desde URLs originales
- Optimización y redimensionamiento
- Carga a Cloudflare R2
- Actualización de referencias en el contenido

### 5. Importación a Base de Datos
- Procesamiento por lotes
- Validación de integridad de datos
- Manejo de errores y excepciones
- Registro de operaciones

### 6. Informe de Resultados
- Resumen de artículos importados
- Detalles de errores encontrados
- Estadísticas por categoría
- Opción para exportar log

## Flujo del Proceso

1. **Extracción** - Script Node.js extrae contenido del blog original
2. **Procesamiento** - Limpieza y formateo de contenido, categorización
3. **Generación de JSON** - Creación del archivo estructurado
4. **Carga en CMS** - Importación mediante la interfaz de carga masiva
5. **Verificación** - Comprobación de contenido importado

## Integración con el CMS

El módulo de carga masiva se integra con los componentes existentes del CMS:

- **API de Contenido**: Utiliza los endpoints existentes para la creación de artículos
- **Gestor de Medios**: Aprovecha la API de medios para la gestión de imágenes
- **Sistema de Autenticación**: Respeta los permisos y roles de usuario
- **Base de Datos D1**: Almacena los artículos en la estructura existente
- **Almacenamiento R2**: Guarda las imágenes en el bucket configurado

## Consideraciones Técnicas

- **Rendimiento**: Optimizado para manejar grandes volúmenes de datos
- **Seguridad**: Validación de contenido y permisos de usuario
- **Transacciones**: Soporte para rollback en caso de errores
- **Compatibilidad**: Adaptación al esquema de datos existente
- **Interfaz**: Diseño responsivo y amigable

## Próximos Pasos

1. Implementar la interfaz de usuario en el panel de administración
2. Desarrollar la lógica de procesamiento de archivos JSON
3. Crear el sistema de validación y previsualización
4. Implementar el procesador de imágenes
5. Integrar con la API existente para la creación de artículos
6. Realizar pruebas con datos reales
7. Documentar el proceso para usuarios finales

---

*Este documento describe la funcionalidad de carga masiva de artículos para el CMS de Abya Yala, diseñada para facilitar la migración de contenido desde el blog original a la nueva plataforma basada en Astro y Cloudflare.*
