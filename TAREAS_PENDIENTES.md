# Tareas Pendientes - CMS Abya Yala

## Prioridad Alta

1. **Mejora de UX: Ventanas de alertas y manejo de errores**
   - Implementar un sistema de notificaciones más amigable que reemplace los `alert()` actuales
   - Mostrar mensajes de error detallados y sugerencias de solución
   - Añadir feedback visual durante operaciones de carga/guardado

2. **Visualización de imágenes en editor de artículos**
   - Corregir la carga de imágenes al editar artículos existentes
   - Asegurar que la imagen destacada se muestre correctamente al abrir el editor
   - Implementar vista previa de imágenes en tiempo real

## Funcionalidades Nuevas

3. **CRUD completo para categorías**
   - Crear interfaz para gestionar categorías (crear, editar, eliminar)
   - Implementar endpoints de API para operaciones con categorías
   - Añadir validación para evitar eliminar categorías en uso

## Mejoras Técnicas

4. **Eliminar datos quemados (hardcoded)**
   - Remover toda información estática de la página principal
   - Asegurar que todos los datos vengan de la API o base de datos
   - Implementar sistema de configuración para elementos de la interfaz

5. **Revisar autenticación del panel de administración**
   - Mejorar la integración con Cloudflare Access
   - Implementar manejo de sesiones más robusto
   - Añadir niveles de permisos para diferentes tipos de usuarios

## Notas adicionales

- Priorizar la corrección de la visualización de imágenes en el editor de artículos
- Considerar implementar un sistema de logs para facilitar la depuración
- Evaluar la posibilidad de añadir tests automatizados para las funcionalidades críticas

---

*Última actualización: 13 de abril de 2025*
