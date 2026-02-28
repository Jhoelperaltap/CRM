# EJFLOW CRM - Guía de Despliegue

## Información del VPS

| Campo | Valor |
|-------|-------|
| **Host** | 148.230.83.208 |
| **Puerto SSH** | 2222 |
| **Usuario** | appuser |
| **Password** | Albertashley1808@ |
| **Directorio del proyecto** | /opt/ebenezer-crm |
| **Directorio de deploy** | /opt/ebenezer-crm/deploy |
| **URL producción** | https://ebenezertaxservices1.od2.ejsupportit.com |

## Conexión SSH

```bash
ssh -p 2222 appuser@148.230.83.208
# Password: Albertashley1808@
```

### Desde Windows (PuTTY/plink)
```cmd
plink -P 2222 -pw Albertashley1808@ -hostkey "SHA256:tqbgS6cl0phtTBJzU68R1PhKoehEAWLTzARw2p13Uak" appuser@148.230.83.208 "comando"
```

## Arquitectura del Servidor

El proyecto corre con **Docker Compose** en `/opt/ebenezer-crm/deploy/`:

| Contenedor | Servicio | Puerto |
|------------|----------|--------|
| deploy-db-1 | PostgreSQL 16 | 5432 (interno) |
| deploy-redis-1 | Redis 7 | 6379 (interno) |
| deploy-backend-1 | Django/Gunicorn | 8000 (interno) |
| deploy-frontend-1 | Next.js | 3000 (interno) |
| deploy-celery_worker-1 | Celery Worker | - |
| deploy-celery_beat-1 | Celery Beat | - |
| deploy-nginx-1 | Nginx Reverse Proxy | 8080 → 80 |

**Nota:** También hay servicios nativos corriendo (PostgreSQL 17, Redis, Nginx) que manejan otros proyectos en el VPS.

## Comandos de Despliegue

### Secuencia Completa de Deploy

```bash
# 1. Conectar al VPS
ssh -p 2222 appuser@148.230.83.208

# 2. Ir al directorio del proyecto
cd /opt/ebenezer-crm

# 3. Actualizar código desde GitHub
git pull origin main

# 4. Ir al directorio de deploy
cd deploy

# 5. Reconstruir imagen del backend (sin caché si hay cambios en requirements)
docker compose -f docker-compose.prod.yml build backend
# O con --no-cache si hay cambios en requirements.txt:
docker compose -f docker-compose.prod.yml build --no-cache backend

# 6. Reiniciar el servicio backend
docker compose -f docker-compose.prod.yml up -d backend

# 7. Ejecutar migraciones (sin entrypoint para evitar auto-migrate)
docker compose -f docker-compose.prod.yml run --rm --entrypoint '' backend python manage.py migrate

# 8. Verificar estado
docker compose -f docker-compose.prod.yml ps
```

### Deploy Rápido (solo código, sin cambios en dependencias)

```bash
cd /opt/ebenezer-crm && git pull origin main
cd deploy
docker compose -f docker-compose.prod.yml build backend
docker compose -f docker-compose.prod.yml restart backend
```

### Reconstruir Frontend

```bash
cd /opt/ebenezer-crm/deploy
docker compose -f docker-compose.prod.yml build --no-cache frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Comandos Útiles

### Ver logs de contenedores
```bash
cd /opt/ebenezer-crm/deploy
docker compose -f docker-compose.prod.yml logs -f              # Todos
docker compose -f docker-compose.prod.yml logs -f backend      # Solo backend
docker compose -f docker-compose.prod.yml logs -f frontend     # Solo frontend
docker compose -f docker-compose.prod.yml logs --tail 100 backend  # Últimas 100 líneas
```

### Verificar estado de contenedores
```bash
cd /opt/ebenezer-crm/deploy
docker compose -f docker-compose.prod.yml ps
```

### Entrar al shell de un contenedor
```bash
docker exec -it deploy-backend-1 bash
docker exec -it deploy-frontend-1 sh
docker exec -it deploy-db-1 psql -U ebenezer -d ebenezer_crm
```

### Ejecutar comandos Django
```bash
# Con el contenedor corriendo:
docker exec -it deploy-backend-1 python manage.py shell
docker exec -it deploy-backend-1 python manage.py createsuperuser

# Crear nuevo contenedor temporal:
docker compose -f docker-compose.prod.yml run --rm --entrypoint '' backend python manage.py <comando>
```

### Base de datos
```bash
# Conectar a PostgreSQL
docker exec -it deploy-db-1 psql -U ebenezer -d ebenezer_crm

# Backup
docker exec deploy-db-1 pg_dump -U ebenezer ebenezer_crm > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker exec -i deploy-db-1 psql -U ebenezer -d ebenezer_crm
```

## Troubleshooting

### El contenedor backend no inicia o se reinicia constantemente
```bash
# Ver logs para identificar el error
docker compose -f docker-compose.prod.yml logs backend --tail 100

# Si es problema de migración, hacer fake de la migración problemática:
docker compose -f docker-compose.prod.yml run --rm --entrypoint '' backend python manage.py migrate <app> <migration_name> --fake
```

### Error de índice no existe en migraciones
```bash
# Ver índices existentes en una tabla
docker exec deploy-db-1 psql -U ebenezer -d ebenezer_crm -c "\di *rental*"

# Hacer fake de la migración
docker compose -f docker-compose.prod.yml run --rm --entrypoint '' backend python manage.py migrate portal 0008 --fake

# Agregar campo manualmente si es necesario
docker exec deploy-db-1 psql -U ebenezer -d ebenezer_crm -c "ALTER TABLE tabla ADD COLUMN campo VARCHAR(255) NULL;"
```

### Problemas de permisos en archivos media
```bash
docker exec deploy-backend-1 chown -R www-data:www-data /app/media
```

### Ver uso de recursos
```bash
docker stats
```

## Variables de Entorno

Las variables de entorno están en `/opt/ebenezer-crm/deploy/.env`:

```bash
# Ver variables actuales
cat /opt/ebenezer-crm/deploy/.env

# Editar
nano /opt/ebenezer-crm/deploy/.env
```

**Variables importantes:**
- `SECRET_KEY` - Clave secreta de Django
- `JWT_SIGNING_KEY` - Clave para tokens JWT
- `DB_PASSWORD` - Contraseña de PostgreSQL
- `FIELD_ENCRYPTION_KEY` - Clave para encriptar campos sensibles
- `DOCUMENT_ENCRYPTION_KEY` - Clave para encriptar documentos

## Estructura de Tablas (Nombres Reales)

| Modelo Django | Tabla PostgreSQL |
|---------------|------------------|
| RentalProperty | crm_rental_properties |
| RentalTransaction | crm_rental_transactions |
| RentalExpenseCategory | crm_rental_expense_categories |

## Versión Actual

- **Versión**: 1.0.0
- **Última actualización**: 2026-02-28
- **Último commit**: Ver con `git log -1` en el servidor

## Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `/opt/ebenezer-crm/deploy/docker-compose.prod.yml` | Configuración Docker producción |
| `/opt/ebenezer-crm/deploy/.env` | Variables de entorno |
| `/opt/ebenezer-crm/deploy/nginx/` | Configuración Nginx |
| `/opt/ebenezer-crm/DEPLOYMENT.md` | Esta guía |

## Notas Importantes

1. **Siempre usar `docker-compose.prod.yml`** - El archivo en el directorio `/deploy/`
2. **No usar `docker-compose up -d` sin -f** - Puede levantar contenedores incorrectos
3. **Las migraciones se ejecutan automáticamente** en el entrypoint, pero pueden fallar si hay problemas
4. **Hacer backup antes de cambios grandes**
5. **Los volúmenes de media y static son persistentes** - No se pierden al reconstruir
