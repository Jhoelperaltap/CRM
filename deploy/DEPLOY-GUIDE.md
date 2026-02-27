# Ebenezer Tax Services CRM - Deployment Guide

## Server Information
- **VPS IP**: 148.230.83.208
- **SSH Port**: 2222
- **Domain**: ebenezertaxservices1.od2.ejsupportit.com
- **User**: appuser

## Prerequisites
- Docker & Docker Compose installed
- Nginx installed on host
- DNS configured to point subdomain to VPS IP

---

## Quick Deployment Steps

### 1. Connect to VPS
```bash
ssh -p 2222 appuser@148.230.83.208
```

### 2. Create application directory
```bash
sudo mkdir -p /opt/ebenezer-crm
sudo chown appuser:appuser /opt/ebenezer-crm
cd /opt/ebenezer-crm
```

### 3. Clone repository (or upload files)
```bash
# Option A: Clone from GitHub
git clone https://github.com/Jhoelperaltap/CRM.git .

# Option B: Upload via SCP from your local machine
# scp -P 2222 -r "CRM Back end" "CRM Front end" deploy appuser@148.230.83.208:/opt/ebenezer-crm/
```

### 4. Set up environment
```bash
cd /opt/ebenezer-crm/deploy

# Copy example env and edit
cp .env.example .env
nano .env  # Edit with your values

# Generate secure keys (run these in Python):
# python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 5. Build and start services
```bash
cd /opt/ebenezer-crm/deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

### 6. Run database migrations
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### 7. Create admin user
```bash
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
```

### 8. Configure host Nginx
```bash
# Copy nginx config
sudo cp nginx-host-config.conf /etc/nginx/sites-available/ebenezer-crm
sudo ln -s /etc/nginx/sites-available/ebenezer-crm /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 9. Set up SSL certificate
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d ebenezertaxservices1.od2.ejsupportit.com

# Or standalone method (stop nginx first):
sudo systemctl stop nginx
sudo certbot certonly --standalone -d ebenezertaxservices1.od2.ejsupportit.com
sudo systemctl start nginx
```

---

## Useful Commands

### View logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```

### Restart services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop all services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update application (Zero-Downtime)
```bash
cd /opt/ebenezer-crm/deploy

# Método recomendado: usar script de deployment
./deploy.sh

# O para rebuild completo (más lento):
./deploy.sh --full
```

**¿Qué hace el script?**
1. Descarga cambios de git
2. Crea backup de seguridad
3. Construye nuevas imágenes
4. Actualiza servicios UNO POR UNO (sin detener los demás)
5. Ejecuta migraciones mientras el servicio corre
6. Recarga Nginx sin reiniciar

**Actualización manual (método antiguo):**
```bash
cd /opt/ebenezer-crm
git pull origin main
cd deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps backend
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
docker compose -f docker-compose.prod.yml up -d --no-deps frontend
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Database backup
```bash
docker-compose -f docker-compose.prod.yml exec db pg_dump -U ebenezer ebenezer_crm > backup_$(date +%Y%m%d).sql
```

### Database restore
```bash
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T db psql -U ebenezer ebenezer_crm
```

---

## Ports Used
- **8080**: Docker Nginx (internal)
- **80/443**: Host Nginx (public)
- **5432**: PostgreSQL (internal only)
- **6379**: Redis (internal only)

---

## File Structure
```
/opt/ebenezer-crm/
├── CRM Back end/          # Django backend
├── CRM Front end/         # Next.js frontend
├── deploy/
│   ├── docker-compose.prod.yml
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── conf.d/
│   │       └── ebenezer.conf
│   ├── .env               # Environment variables (sensitive!)
│   └── nginx-host-config.conf
└── ...
```

---

## Troubleshooting

### Container not starting
```bash
docker-compose -f docker-compose.prod.yml logs [service_name]
```

### Database connection issues
```bash
docker-compose -f docker-compose.prod.yml exec db psql -U ebenezer -d ebenezer_crm
```

### Permission issues
```bash
sudo chown -R appuser:appuser /opt/ebenezer-crm
```

### SSL certificate renewal
```bash
sudo certbot renew
```
