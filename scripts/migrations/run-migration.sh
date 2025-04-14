#!/bin/bash
# Script para ejecutar todas las migraciones en la base de datos D1 de Cloudflare

echo "=== Iniciando proceso de migración de base de datos ==="
echo "Fecha: $(date)"

# Directorio de migraciones
MIGRATIONS_DIR="./scripts/migrations"

# Verificar si estamos en entorno de producción
if [ "$NODE_ENV" = "production" ]; then
  REMOTE_FLAG="--remote"
  echo "Ejecutando migraciones en PRODUCCIÓN"
else
  REMOTE_FLAG="--remote"  # Por defecto usar remote, cambiar a --local si se desea
  echo "Ejecutando migraciones en DESARROLLO"
fi

# Ejecutar todas las migraciones SQL
echo "Buscando archivos de migración en $MIGRATIONS_DIR..."
MIGRATION_FILES=$(find $MIGRATIONS_DIR -name "*.sql" | sort)

if [ -z "$MIGRATION_FILES" ]; then
  echo "No se encontraron archivos de migración."
  exit 0
fi

# Contador de migraciones
TOTAL=0
SUCCESS=0
FAILED=0

# Ejecutar cada migración
for FILE in $MIGRATION_FILES; do
  FILENAME=$(basename $FILE)
  echo ""
  echo "Ejecutando migración: $FILENAME"
  
  # Ejecutar el comando SQL usando Wrangler
  if npx wrangler d1 execute DB $REMOTE_FLAG --file="$FILE"; then
    echo "✅ Migración $FILENAME completada con éxito."
    SUCCESS=$((SUCCESS + 1))
  else
    echo "❌ Error al ejecutar migración $FILENAME."
    FAILED=$((FAILED + 1))
  fi
  
  TOTAL=$((TOTAL + 1))
done

# Mostrar resumen
echo ""
echo "=== Resumen de migraciones ==="
echo "Total: $TOTAL"
echo "Exitosas: $SUCCESS"
echo "Fallidas: $FAILED"

if [ $FAILED -gt 0 ]; then
  echo "⚠️ Algunas migraciones fallaron. Revisar los logs para más detalles."
  exit 1
else
  echo "✅ Todas las migraciones se ejecutaron correctamente."
  exit 0
fi
