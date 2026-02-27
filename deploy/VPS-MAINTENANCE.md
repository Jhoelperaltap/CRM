# VPS Maintenance & Safety Guide

## CRITICAL: Protecting Data During Updates

### Docker Volumes (NEVER DELETE)

The following volumes contain persistent data:

| Volume | Content | CRITICAL |
|--------|---------|----------|
| `postgres_data` | Database (users, contacts, cases, etc.) | **YES** |
| `redis_data` | Cache and Celery broker data | Medium |
| `media_data` | Uploaded files and documents | **YES** |
| `static_data` | Static files (can be regenerated) | No |
| `logs_data` | Application logs | No |

### Safe Update Procedure

```bash
cd /opt/ebenezer-crm

# 1. ALWAYS backup database BEFORE updating
cd deploy
docker compose -f docker-compose.prod.yml exec db pg_dump -U ebenezer ebenezer_crm > /tmp/backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull code changes
cd /opt/ebenezer-crm
sudo git pull origin main

# 3. Rebuild images (this is safe, doesn't affect data)
cd deploy
docker compose -f docker-compose.prod.yml build

# 4. Restart services ONE BY ONE (zero-downtime)
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate backend
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate celery_worker celery_beat
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate frontend
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# 5. Run migrations (safe, adds new tables/columns)
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

### DANGEROUS Commands (AVOID)

```bash
# NEVER use these without understanding the consequences:

docker compose down -v          # -v DELETES ALL VOLUMES (DATA LOSS!)
docker volume prune             # Deletes unused volumes (RISKY!)
docker system prune -a --volumes # DELETES EVERYTHING including volumes!

# SAFE alternatives:
docker compose down             # Stops containers, keeps volumes
docker compose restart          # Restarts without rebuilding
docker image prune              # Only removes unused images (safe)
```

### Environment Variables (.env)

The `.env` file in `/opt/ebenezer-crm/deploy/` contains:

```
DB_NAME=ebenezer_crm
DB_USER=ebenezer
DB_PASSWORD=<secure_password>
SECRET_KEY=<django_secret_key>
JWT_SIGNING_KEY=<jwt_key>
FIELD_ENCRYPTION_KEY=<encryption_key>
DOCUMENT_ENCRYPTION_KEY=<document_key>
ALLOWED_HOSTS=ebenezertaxservices1.od2.ejsupportit.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://ebenezertaxservices1.od2.ejsupportit.com
CSRF_TRUSTED_ORIGINS=https://ebenezertaxservices1.od2.ejsupportit.com
SECURE_SSL_REDIRECT=False
```

**IMPORTANT:**
- This file is NOT in git (it's in .gitignore)
- Always backup this file separately
- If lost, you need to regenerate keys (and users will need to reset passwords)

### Backup Commands

```bash
# Full database backup
docker compose -f docker-compose.prod.yml exec db pg_dump -U ebenezer ebenezer_crm > backup.sql

# Restore database
cat backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U ebenezer ebenezer_crm

# Backup media files
docker cp deploy-backend-1:/app/media ./media_backup

# Backup .env
cp .env .env.backup
```

### Scheduled Backups (Recommended)

Add to crontab (`crontab -e`):

```bash
# Daily database backup at 2 AM
0 2 * * * cd /opt/ebenezer-crm/deploy && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U ebenezer ebenezer_crm > /opt/backups/db_$(date +\%Y\%m\%d).sql

# Weekly cleanup of old backups (keep 30 days)
0 3 * * 0 find /opt/backups -name "*.sql" -mtime +30 -delete
```

### Recovery Procedure

If database is lost:

```bash
# 1. Run migrations to create tables
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# 2. Create superuser
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# 3. If you have a backup, restore it
cat /path/to/backup.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U ebenezer ebenezer_crm
```

### VPS Connection Info

- **IP:** 148.230.83.208
- **SSH Port:** 2222
- **User:** appuser
- **App Directory:** /opt/ebenezer-crm
- **Docker Compose:** /opt/ebenezer-crm/deploy/docker-compose.prod.yml

### Services Ports

| Service | Internal Port | External Port |
|---------|---------------|---------------|
| Nginx (Docker) | 80 | 8080 |
| Nginx (Host) | 80/443 | 80/443 |
| Backend | 8000 | - |
| Frontend | 3000 | - |
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |

### Monitoring Commands

```bash
# Check all services status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery_worker

# Check disk usage
docker system df
df -h

# Check database size
docker compose -f docker-compose.prod.yml exec db psql -U ebenezer -d ebenezer_crm -c "SELECT pg_size_pretty(pg_database_size('ebenezer_crm'));"
```
