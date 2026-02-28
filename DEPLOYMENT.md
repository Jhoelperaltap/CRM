# EJFLOW CRM - Guía de Despliegue

## Información del VPS

| Campo | Valor |
|-------|-------|
| **Host** | 148.230.83.208 |
| **Puerto SSH** | 2222 |
| **Usuario** | appuser |
| **Password** | Albertashley1808@ |
| **Directorio del proyecto** | /home/appuser/crm |

## Conexión SSH

```bash
ssh -p 2222 appuser@148.230.83.208
# Password: Albertashley1808@
```

## Arquitectura del Servidor

El proyecto corre con **Docker Compose**:
- **Backend**: Django + Gunicorn en contenedor
- **Frontend**: Next.js en contenedor
- **Database**: PostgreSQL en contenedor
- **Cache/Broker**: Redis en contenedor
- **Reverse Proxy**: Nginx

## Comandos de Despliegue

### 1. Conectar al VPS
```bash
ssh -p 2222 appuser@148.230.83.208
```

### 2. Ir al directorio del proyecto
```bash
cd /home/appuser/crm
```

### 3. Actualizar código desde GitHub
```bash
git pull origin main
```

### 4. Reconstruir y reiniciar contenedores Docker
```bash
# Reconstruir imágenes y reiniciar
docker-compose down
docker-compose build
docker-compose up -d

# O para reconstruir solo un servicio específico:
docker-compose build backend
docker-compose up -d backend
```

### 5. Ejecutar migraciones de base de datos
```bash
docker-compose exec backend python manage.py migrate
```

### 6. Recolectar archivos estáticos (si hay cambios de frontend)
```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

## Secuencia Completa de Deploy

```bash
ssh -p 2222 appuser@148.230.83.208
cd /home/appuser/crm
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec backend python manage.py migrate
```

## Comandos Útiles

### Ver logs de contenedores
```bash
docker-compose logs -f              # Todos los servicios
docker-compose logs -f backend      # Solo backend
docker-compose logs -f frontend     # Solo frontend
```

### Verificar estado de contenedores
```bash
docker-compose ps
```

### Reiniciar un servicio específico
```bash
docker-compose restart backend
docker-compose restart frontend
```

### Entrar al shell de un contenedor
```bash
docker-compose exec backend bash
docker-compose exec frontend sh
```

### Ver uso de recursos
```bash
docker stats
```

## URLs de Producción

| Servicio | URL |
|----------|-----|
| **CRM Dashboard** | https://crm.tudominio.com |
| **Portal Cliente** | https://crm.tudominio.com/portal |
| **API** | https://crm.tudominio.com/api/v1/ |

## Versión Actual

- **Versión**: 1.0.0
- **Última actualización**: 2026-02-28
- **Último commit**: Ver `git log -1` en el servidor

## Notas Importantes

1. **Siempre hacer backup antes de deploy grande**
   ```bash
   docker-compose exec db pg_dump -U postgres crm > backup_$(date +%Y%m%d).sql
   ```

2. **Si hay cambios en requirements.txt**, reconstruir el contenedor backend:
   ```bash
   docker-compose build --no-cache backend
   ```

3. **Si hay cambios en package.json**, reconstruir el contenedor frontend:
   ```bash
   docker-compose build --no-cache frontend
   ```

4. **Archivos de medios (uploads)** están en un volumen persistente, no se pierden al reconstruir.

## Troubleshooting

### El contenedor no inicia
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Error de migración
```bash
docker-compose exec backend python manage.py showmigrations
docker-compose exec backend python manage.py migrate --fake-initial
```

### Problemas de permisos en archivos
```bash
docker-compose exec backend chown -R www-data:www-data /app/media
```
