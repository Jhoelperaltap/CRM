# Manual de IT - Ebenezer Tax Services CRM

**Versión:** 1.1
**Fecha:** Febrero 2026
**Audiencia:** Personal de Tecnología de Información

---

## Tabla de Contenidos

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Requisitos del Servidor](#requisitos-del-servidor)
3. [Instalación y Despliegue](#instalación-y-despliegue)
4. [Configuración de Entorno](#configuración-de-entorno)
5. [Base de Datos](#base-de-datos)
6. [Servicios Backend](#servicios-backend)
7. [Frontend Web](#frontend-web)
8. [Aplicación Móvil](#aplicación-móvil)
9. [Seguridad](#seguridad)
10. [Monitoreo y Logs](#monitoreo-y-logs)
11. [Respaldos](#respaldos)
12. [Solución de Problemas](#solución-de-problemas)
13. [Actualizaciones](#actualizaciones)

---

## Arquitectura del Sistema

### Visión General

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │     (Nginx)     │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Frontend      │ │    Backend      │ │   Mobile API    │
│   (Next.js)     │ │    (Django)     │ │   (Django)      │
│   Port: 3000    │ │   Port: 8000    │ │   Port: 8000    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │     Redis       │ │     Celery      │
│   Port: 5432    │ │   Port: 6379    │ │    Workers      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Componentes

| Componente | Tecnología | Puerto | Descripción |
|------------|------------|--------|-------------|
| Backend API | Django 5.1 + DRF | 8000 | API REST principal |
| Frontend | Next.js 15 | 3000 | Interfaz web |
| Base de Datos | PostgreSQL 16 | 5432 | Almacenamiento persistente |
| Cache | Redis 7 | 6379 | Cache y broker de mensajes |
| Task Queue | Celery | - | Tareas asíncronas |
| Scheduler | Celery Beat | - | Tareas programadas |
| Proxy | Nginx | 80/443 | Reverse proxy y SSL |

---

## Requisitos del Servidor

### Producción (Mínimo)

| Recurso | Especificación |
|---------|---------------|
| CPU | 4 cores |
| RAM | 8 GB |
| Disco | 100 GB SSD |
| OS | Ubuntu 22.04 LTS / Windows Server 2022 |

### Producción (Recomendado)

| Recurso | Especificación |
|---------|---------------|
| CPU | 8+ cores |
| RAM | 16+ GB |
| Disco | 250+ GB SSD |
| OS | Ubuntu 22.04 LTS |

### Software Requerido

```bash
# Versiones mínimas
Python 3.11+
Node.js 18+
PostgreSQL 15+
Redis 7+
Nginx 1.24+
```

---

## Instalación y Despliegue

### Despliegue con Docker (Recomendado)

#### 1. Clonar Repositorio

```bash
git clone https://github.com/empresa/ebenezer-crm.git
cd ebenezer-crm
```

#### 2. Configurar Variables de Entorno

```bash
cp .env.example .env
# Editar .env con valores de producción
```

#### 3. Iniciar Servicios

```bash
# Desarrollo
docker-compose up -d

# Producción (con Nginx)
docker-compose --profile production up -d
```

#### 4. Ejecutar Migraciones

```bash
docker-compose exec backend python manage.py migrate
```

#### 5. Crear Superusuario

```bash
docker-compose exec backend python manage.py createsuperuser
```

### Despliegue Manual (Sin Docker)

#### Backend

```bash
cd "CRM Back end"

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux
.\venv\Scripts\activate   # Windows

# Instalar dependencias
pip install -r requirements/production.txt

# Configurar variables
export DJANGO_SETTINGS_MODULE=config.settings.production

# Migraciones
python manage.py migrate

# Recopilar archivos estáticos
python manage.py collectstatic --noinput

# Iniciar con Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

#### Frontend

```bash
cd "CRM Front end"

# Instalar dependencias
npm install

# Build de producción
npm run build

# Iniciar servidor
npm start
```

#### Celery Workers

```bash
# Worker principal
celery -A config worker --loglevel=info

# Scheduler (Celery Beat)
celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

---

## Configuración de Entorno

### Variables de Entorno Requeridas

```bash
# =============================================================================
# DJANGO
# =============================================================================
DEBUG=False
SECRET_KEY=<clave-segura-64-caracteres>
ALLOWED_HOSTS=dominio.com,api.dominio.com

# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgres://usuario:password@host:5432/ebenezer_crm

# =============================================================================
# REDIS
# =============================================================================
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1

# =============================================================================
# JWT / SEGURIDAD
# =============================================================================
JWT_SIGNING_KEY=<clave-32-bytes-para-staff>
PORTAL_JWT_SIGNING_KEY=<clave-32-bytes-para-portal-diferente>
FIELD_ENCRYPTION_KEY=<fernet-key-base64>

# =============================================================================
# CORS
# =============================================================================
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://dominio.com,https://app.dominio.com

# =============================================================================
# EMAIL
# =============================================================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=correo@dominio.com
EMAIL_HOST_PASSWORD=<app-password>

# =============================================================================
# AI (Opcional)
# =============================================================================
OPENAI_API_KEY=<key>
ANTHROPIC_API_KEY=<key>
```

### Generar Claves Seguras

```bash
# SECRET_KEY (Django)
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# JWT_SIGNING_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# FIELD_ENCRYPTION_KEY (Fernet)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## Base de Datos

### Estructura de la Base de Datos

```
ebenezer_crm
├── auth_* (Django auth)
├── django_* (Django admin, sessions)
├── crm_users (Usuarios del sistema)
├── crm_departments (Departamentos)
├── crm_contacts (Contactos/Clientes)
├── crm_corporations (Empresas)
├── crm_tax_cases (Casos de impuestos)
├── crm_documents (Documentos)
├── crm_department_client_folders (Carpetas por departamento/cliente)
├── crm_document_access_logs (Logs de acceso a documentos)
├── crm_appointments (Citas)
├── crm_tasks (Tareas)
├── crm_emails (Correos)
├── crm_portal_* (Portal del cliente)
├── crm_audit_logs (Auditoría)
└── celery_* (Tareas programadas)
```

### Modelo de Departamentos

El sistema utiliza departamentos para organizar usuarios y documentos:

```
Department (crm_departments)
├── id (UUID)           # Identificador único
├── name                # Nombre (ej: "Accounting")
├── code                # Código corto (ej: "ACCT")
├── color               # Color hex para UI (ej: "#3B82F6")
├── icon                # Icono Lucide (ej: "Calculator")
├── is_active           # Si está activo
├── order               # Orden de visualización
└── created_at/updated_at

DepartmentClientFolder (crm_department_client_folders)
├── id (UUID)           # Identificador único
├── name                # Nombre de la carpeta
├── department_id       # FK a Department
├── contact_id          # FK a Contact (opcional)
├── corporation_id      # FK a Corporation (opcional)
├── parent_id           # FK a sí mismo (jerarquía)
├── is_default          # Si es carpeta predeterminada
├── created_by_id       # Usuario que la creó
└── created_at/updated_at

CONSTRAINT: contact_id OR corporation_id (no ambos)
```

### Conexión

```bash
# PostgreSQL CLI
psql -h localhost -U ebenezer -d ebenezer_crm

# Desde Django
python manage.py dbshell
```

### Migraciones

```bash
# Ver estado
python manage.py showmigrations

# Crear migración
python manage.py makemigrations app_name

# Aplicar migraciones
python manage.py migrate

# Revertir migración
python manage.py migrate app_name 0001_previous
```

### Respaldo Manual

```bash
# Respaldo completo
pg_dump -h localhost -U ebenezer ebenezer_crm > backup_$(date +%Y%m%d).sql

# Respaldo comprimido
pg_dump -h localhost -U ebenezer ebenezer_crm | gzip > backup_$(date +%Y%m%d).sql.gz

# Restaurar
psql -h localhost -U ebenezer ebenezer_crm < backup.sql
```

---

## Servicios Backend

### Estructura del Proyecto

```
CRM Back end/
├── config/
│   ├── settings/
│   │   ├── base.py          # Configuración compartida
│   │   ├── development.py   # Desarrollo
│   │   ├── production.py    # Producción
│   │   └── test.py          # Tests
│   ├── urls.py              # Rutas principales
│   ├── celery.py            # Configuración Celery
│   └── wsgi.py              # WSGI entry point
├── apps/
│   ├── core/                # Utilidades compartidas
│   ├── users/               # Usuarios, autenticación, departamentos
│   ├── contacts/            # Contactos
│   ├── corporations/        # Corporaciones
│   ├── cases/               # Casos de impuestos
│   ├── documents/           # Documentos y carpetas de departamento
│   ├── appointments/        # Citas
│   ├── tasks/               # Tareas
│   ├── emails/              # Integración email
│   ├── notifications/       # Notificaciones
│   ├── portal/              # Portal del cliente
│   ├── audit/               # Auditoría
│   ├── workflows/           # Automatizaciones
│   ├── reports/             # Reportes
│   └── ai_agent/            # Agente IA
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
└── manage.py
```

### Tareas de Celery

```python
# Tareas programadas (Celery Beat)
CELERY_BEAT_SCHEDULE = {
    # Sincronización de emails cada 5 minutos
    "sync-all-email-accounts": {
        "task": "apps.emails.tasks.sync_all_accounts",
        "schedule": 300.0,
    },
    # Recordatorios de citas cada 15 minutos
    "process-appointment-reminders": {
        "task": "apps.appointments.tasks.process_appointment_reminders",
        "schedule": 900.0,
    },
    # Ciclo del agente IA cada 5 minutos
    "ai-agent-cycle": {
        "task": "apps.ai_agent.tasks.run_agent_cycle",
        "schedule": 300.0,
    },
    # Limpieza de tokens expirados diaria
    "cleanup-expired-download-tokens": {
        "task": "apps.documents.tasks.cleanup_expired_download_tokens",
        "schedule": crontab(hour=3, minute=0),
    },
}
```

### Comandos Útiles

```bash
# Shell de Django
python manage.py shell_plus

# Crear superusuario
python manage.py createsuperuser

# Verificar configuración
python manage.py check --deploy

# Limpiar sesiones expiradas
python manage.py clearsessions

# Recopilar archivos estáticos
python manage.py collectstatic
```

---

## Frontend Web

### Estructura del Proyecto

```
CRM Front end/
├── src/
│   ├── app/                  # Pages (App Router)
│   │   ├── (auth)/           # Páginas de autenticación
│   │   ├── (dashboard)/      # Páginas principales
│   │   └── layout.tsx        # Layout principal
│   ├── components/           # Componentes React
│   │   ├── ui/               # Componentes base
│   │   ├── contacts/         # Componentes de contactos
│   │   ├── cases/            # Componentes de casos
│   │   └── ...
│   ├── lib/
│   │   ├── api/              # Funciones de API
│   │   └── utils.ts          # Utilidades
│   ├── stores/               # Estado global (Zustand)
│   └── types/                # TypeScript types
├── public/                   # Archivos estáticos
├── next.config.ts            # Configuración Next.js
└── package.json
```

### Variables de Entorno

```bash
# .env.local
NEXT_PUBLIC_API_URL=https://api.dominio.com/api/v1
```

### Build y Deploy

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Iniciar producción
npm start

# Análisis de bundle
npm run build && npm run analyze
```

---

## Aplicación Móvil

### Estructura del Proyecto

```
crm-mobile/
├── app/                      # Páginas (Expo Router)
│   ├── (auth)/               # Autenticación
│   ├── (tabs)/               # Tabs principales
│   └── _layout.tsx           # Layout
├── src/
│   ├── api/                  # Llamadas API
│   ├── components/           # Componentes
│   ├── stores/               # Estado (Zustand)
│   ├── hooks/                # Custom hooks
│   └── utils/                # Utilidades
├── app.json                  # Configuración Expo
└── package.json
```

### Variables de Entorno

```bash
# .env
EXPO_PUBLIC_API_URL=https://api.dominio.com/api/v1
```

### Build

```bash
# Desarrollo
npx expo start

# Build Android
eas build --platform android

# Build iOS
eas build --platform ios

# Preview build
eas build --profile preview
```

---

## Seguridad

### Implementaciones de Seguridad

| Característica | Implementación |
|----------------|----------------|
| Autenticación | JWT con access/refresh tokens |
| 2FA | TOTP (Google Authenticator) |
| Encriptación PII | Fernet (AES-128) |
| Password Hashing | Argon2 |
| Rate Limiting | DRF Throttling |
| CORS | Whitelist de dominios |
| Session Timeout | 30 min inactividad |
| IP Blacklisting | Middleware personalizado |
| Audit Logging | Middleware completo |
| HTTPS | Obligatorio en producción |
| Permisos Departamento | Acceso basado en departamento del usuario |

### Permisos de Departamento

El sistema implementa control de acceso basado en departamentos:

| Rol | Acceso a Carpetas |
|-----|-------------------|
| Admin | Todas las carpetas de todos los departamentos |
| Manager | Todas las carpetas de su departamento |
| Preparer/Receptionist | Solo carpetas de su departamento |

Los documentos heredan permisos de la carpeta de departamento donde están ubicados.

### Headers de Seguridad (Next.js)

```typescript
// next.config.ts
headers: [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
]
```

### Rate Limits

| Endpoint | Límite |
|----------|--------|
| Anónimo | 20/minuto |
| Autenticado | 200/minuto |
| Login | 5/minuto |
| Password Reset | 3/hora |

### Tokens de Descarga Seguros

Los documentos no usan JWT en URLs. Se generan tokens de un solo uso:
- Duración: 5 minutos
- Un solo uso
- Vinculado a documento y usuario específico

---

## Monitoreo y Logs

### Logs de Aplicación

```bash
# Django logs
tail -f /var/log/ebenezer/django.log

# Celery logs
tail -f /var/log/ebenezer/celery.log

# Nginx access logs
tail -f /var/log/nginx/access.log
```

### Configuración de Logging

```python
# settings/production.py
LOGGING = {
    'version': 1,
    'handlers': {
        'file': {
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/ebenezer/django.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
        },
    },
}
```

### Monitoreo Recomendado

- **APM:** Sentry, New Relic, Datadog
- **Métricas:** Prometheus + Grafana
- **Alertas:** PagerDuty, OpsGenie
- **Uptime:** UptimeRobot, Pingdom

---

## Respaldos

### Estrategia de Respaldos

| Tipo | Frecuencia | Retención |
|------|------------|-----------|
| Base de datos completa | Diario | 30 días |
| Base de datos incremental | Cada hora | 7 días |
| Documentos | Semanal | 90 días |
| Configuración | Por cambio | Indefinido |

### Script de Respaldo Automático

```bash
#!/bin/bash
# /opt/scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M)
BACKUP_DIR=/backups/ebenezer

# Database
pg_dump -h localhost -U ebenezer ebenezer_crm | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Media files
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /var/www/ebenezer/media/

# Limpiar backups antiguos (30 días)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Subir a S3 (opcional)
aws s3 sync $BACKUP_DIR s3://ebenezer-backups/
```

### Cron Job

```bash
# crontab -e
0 2 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## Solución de Problemas

### Problemas Comunes

#### Error 500 en API

```bash
# Verificar logs
tail -f /var/log/ebenezer/django.log

# Verificar configuración
python manage.py check

# Verificar conexión DB
python manage.py dbshell
```

#### Celery no procesa tareas

```bash
# Verificar estado de workers
celery -A config inspect active

# Verificar conexión a Redis
redis-cli ping

# Reiniciar workers
sudo systemctl restart celery
```

#### Problemas de conexión móvil

1. Verificar URL de API en `.env` del móvil
2. Verificar que el backend acepta conexiones externas
3. Verificar CORS permite el origen
4. Verificar firewall permite el puerto

#### Tokens JWT inválidos

```bash
# Verificar que las claves coincidan
python -c "
import os
os.environ['DJANGO_SETTINGS_MODULE']='config.settings.production'
import django; django.setup()
from django.conf import settings
print('JWT Key:', settings.SIMPLE_JWT['SIGNING_KEY'][:20])
print('Portal Key:', settings.PORTAL_JWT_SIGNING_KEY[:20])
"
```

### Comandos de Diagnóstico

```bash
# Estado de servicios
sudo systemctl status nginx postgresql redis celery

# Uso de recursos
htop
df -h
free -m

# Conexiones de red
netstat -tlnp

# Procesos de Python
ps aux | grep python
```

---

## Actualizaciones

### Procedimiento de Actualización

1. **Crear respaldo**
   ```bash
   ./backup.sh
   ```

2. **Activar modo mantenimiento**
   ```bash
   touch /var/www/ebenezer/maintenance.flag
   ```

3. **Actualizar código**
   ```bash
   git pull origin main
   ```

4. **Actualizar dependencias**
   ```bash
   pip install -r requirements/production.txt
   npm install
   ```

5. **Ejecutar migraciones**
   ```bash
   python manage.py migrate
   ```

6. **Rebuild frontend**
   ```bash
   npm run build
   ```

7. **Reiniciar servicios**
   ```bash
   sudo systemctl restart gunicorn celery nginx
   ```

8. **Desactivar modo mantenimiento**
   ```bash
   rm /var/www/ebenezer/maintenance.flag
   ```

9. **Verificar funcionamiento**
   ```bash
   curl https://api.dominio.com/api/v1/health/
   ```

---

## Contacto de Soporte

- **Email Técnico:** it@ebenezer-crm.com
- **Documentación:** `/docs/`
- **API Docs:** `/api/docs/`

---

**© 2026 Ebenezer Tax Services. Documento Confidencial.**
