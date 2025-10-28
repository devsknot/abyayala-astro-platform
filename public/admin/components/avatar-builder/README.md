# Avatar Builder

Componente para crear avatares personalizables usando DiceBear Avatars.

## Características

- ✅ **7 estilos diferentes** de avatares
- ✅ **Generación aleatoria** con un clic
- ✅ **Personalización completa** de características
- ✅ **Vista previa en tiempo real**
- ✅ **100% gratuito** y open source
- ✅ **Sin necesidad de subir imágenes**

## Estilos Disponibles

1. **Avataaars** - Estilo ilustrado popular (como Slack)
2. **Bottts** - Robots adorables
3. **Personas** - Personas realistas
4. **Lorelei** - Estilo moderno
5. **Adventurer** - Personajes de aventura
6. **Big Ears** - Orejas grandes (divertido)
7. **Pixel Art** - Estilo retro 8-bit

## Uso

### Importar el componente

```javascript
import { AvatarBuilder } from './components/avatar-builder/AvatarBuilder.js';
```

### Crear una instancia

```javascript
const container = document.getElementById('avatar-container');
const avatarBuilder = new AvatarBuilder(container);
avatarBuilder.render();
```

### Obtener la configuración del avatar

```javascript
const config = avatarBuilder.getConfig();
// {
//   style: 'avataaars',
//   seed: 'Juan Pérez',
//   options: {
//     backgroundColor: 'b6e3f4',
//     eyes: 'happy',
//     mouth: 'smile'
//   },
//   url: 'https://api.dicebear.com/7.x/avataaars/svg?...'
// }
```

### Cargar una configuración existente

```javascript
const savedConfig = {
  style: 'avataaars',
  seed: 'María García',
  options: {
    backgroundColor: 'ffd5dc',
    eyes: 'wink',
    mouth: 'smile'
  }
};

avatarBuilder.loadConfig(savedConfig);
```

## Opciones de Personalización

### Avataaars
- Color de fondo (6 opciones)
- Ojos (12 opciones)
- Boca (12 opciones)
- Color de cabello (8 opciones)
- Color de piel (7 tonos)

### Bottts
- Color de fondo (6 opciones)
- Ojos (14 opciones)
- Boca (9 opciones)
- Color primario (6 opciones)

### Personas
- Color de fondo (6 opciones)
- Ojos (3 opciones)
- Cabello (7 opciones)
- Color de cabello (6 opciones)

## Integración con Base de Datos

El Avatar Builder guarda la configuración como JSON en el campo `avatar_config`:

```sql
ALTER TABLE authors ADD COLUMN avatar_config TEXT;
```

### Guardar en la base de datos

```javascript
const config = avatarBuilder.getConfig();
const authorData = {
  name: 'Juan Pérez',
  avatar: config.url,
  avatar_config: JSON.stringify(config)
};
```

### Cargar desde la base de datos

```javascript
const author = await getAuthor('juan-perez');
if (author.avatar_config) {
  const config = JSON.parse(author.avatar_config);
  avatarBuilder.loadConfig(config);
}
```

## API de DiceBear

El componente utiliza la API pública de DiceBear:

```
https://api.dicebear.com/7.x/{style}/svg?seed={seed}&{options}
```

### Ejemplo de URL generada

```
https://api.dicebear.com/7.x/avataaars/svg?seed=Juan+Perez&backgroundColor=b6e3f4&eyes=happy&mouth=smile
```

## Ventajas

1. **Sin almacenamiento de imágenes** - Los avatares se generan dinámicamente
2. **Consistencia** - El mismo nombre siempre genera el mismo avatar
3. **Personalización** - Los usuarios pueden ajustar cada detalle
4. **Rendimiento** - SVG ligero y escalable
5. **Privacidad** - No se suben fotos personales

## Recursos

- [DiceBear Documentation](https://www.dicebear.com/docs)
- [DiceBear Playground](https://www.dicebear.com/playground)
- [GitHub Repository](https://github.com/dicebear/dicebear)

## Licencia

DiceBear Avatars está bajo licencia MIT - 100% gratuito para uso comercial y personal.
