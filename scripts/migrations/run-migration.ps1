# Script para ejecutar la migración en la base de datos D1 de Cloudflare

Write-Host "Ejecutando migración para añadir columna author a la tabla articles..." -ForegroundColor Green

# Ejecutar el comando SQL directamente usando Wrangler
npx wrangler d1 execute DB --file=./scripts/migrations/add-author-column.sql

Write-Host "Migración completada." -ForegroundColor Green
