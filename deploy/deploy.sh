#!/bin/bash
# =============================================================================
# EJFLOW CRM - Zero-Downtime Deployment Script
# =============================================================================
# Este script actualiza la aplicación SIN detener los servicios actuales.
# Uso: ./deploy.sh [--full]
#   --full: Hace rebuild completo (más lento pero más limpio)
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/ebenezer-crm/deploy"
COMPOSE_FILE="docker-compose.prod.yml"
VERSION=$(date +%Y%m%d%H%M%S)
FULL_REBUILD=false

# Parse arguments
if [ "$1" == "--full" ]; then
    FULL_REBUILD=true
fi

cd $APP_DIR

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  EJFLOW CRM - Zero-Downtime Deployment     ${NC}"
echo -e "${BLUE}  Version: ${VERSION}                       ${NC}"
echo -e "${BLUE}=============================================${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "Run setup-vps.sh first or create .env from .env.example"
    exit 1
fi

# Load environment variables
source .env

# Function to check if service is healthy
check_health() {
    local service=$1
    local max_attempts=${2:-30}
    local attempt=0

    echo -n "  Verificando salud de $service"
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f $COMPOSE_FILE exec -T $service curl -sf http://localhost:8000/api/v1/health/ > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo -e " ${RED}✗${NC}"
    return 1
}

# -----------------------------------------------------------------------------
# 1. Pull latest changes (if git repo)
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/7] Descargando actualizaciones...${NC}"
REPO_DIR="/opt/ebenezer-crm"
if [ -d "$REPO_DIR/.git" ]; then
    cd $REPO_DIR
    git fetch origin main
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo -e "  Hay cambios nuevos. Actualizando..."
        git pull origin main
    else
        echo -e "  ${GREEN}Ya está actualizado.${NC}"
    fi
    cd $APP_DIR
else
    echo -e "  (No es repositorio git, saltando)"
fi

# -----------------------------------------------------------------------------
# 2. Backup de seguridad (solo base de datos pequeña)
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/7] Creando backup de seguridad...${NC}"
BACKUP_FILE="/tmp/backup_${VERSION}.sql"
if docker compose -f $COMPOSE_FILE ps db --status running > /dev/null 2>&1; then
    docker compose -f $COMPOSE_FILE exec -T db pg_dump -U ${DB_USER:-ebenezer} ${DB_NAME:-ebenezer_crm} > $BACKUP_FILE 2>/dev/null && \
    echo -e "  ${GREEN}Backup creado: $BACKUP_FILE${NC}" || \
    echo -e "  ${YELLOW}No se pudo crear backup (continuando...)${NC}"
else
    echo -e "  ${YELLOW}DB no está corriendo (primer deploy?)${NC}"
fi

# -----------------------------------------------------------------------------
# 3. Build de nuevas imágenes
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/7] Construyendo nuevas imágenes...${NC}"
if [ "$FULL_REBUILD" = true ]; then
    echo -e "  Modo: Rebuild completo (--no-cache)"
    docker compose -f $COMPOSE_FILE build --no-cache
else
    echo -e "  Modo: Build incremental (más rápido)"
    docker compose -f $COMPOSE_FILE build
fi

# -----------------------------------------------------------------------------
# 4. Actualizar Celery Workers (no afectan usuarios)
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/7] Actualizando Celery workers...${NC}"
docker compose -f $COMPOSE_FILE up -d --no-deps --force-recreate celery_worker celery_beat
echo -e "  ${GREEN}Workers actualizados${NC}"
sleep 3

# -----------------------------------------------------------------------------
# 5. Actualizar Backend (rolling update)
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/7] Actualizando Backend API...${NC}"
echo -e "  ${BLUE}(Los usuarios siguen conectados mientras se actualiza)${NC}"

# Recrear backend con la nueva imagen
docker compose -f $COMPOSE_FILE up -d --no-deps --force-recreate backend

# Esperar a que esté saludable
sleep 5
if ! check_health backend 30; then
    echo -e "${RED}ERROR: Backend no respondió. Verificar logs:${NC}"
    echo -e "  docker compose -f $COMPOSE_FILE logs backend"
    exit 1
fi

# Ejecutar migraciones mientras el servicio corre
echo -e "  Ejecutando migraciones..."
docker compose -f $COMPOSE_FILE exec -T backend python manage.py migrate --noinput
echo -e "  ${GREEN}Migraciones completadas${NC}"

# Recolectar estáticos
echo -e "  Recolectando archivos estáticos..."
docker compose -f $COMPOSE_FILE exec -T backend python manage.py collectstatic --noinput
echo -e "  ${GREEN}Estáticos actualizados${NC}"

# -----------------------------------------------------------------------------
# 6. Actualizar Frontend
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/7] Actualizando Frontend...${NC}"
docker compose -f $COMPOSE_FILE up -d --no-deps --force-recreate frontend
sleep 3
echo -e "  ${GREEN}Frontend actualizado${NC}"

# -----------------------------------------------------------------------------
# 7. Recargar Nginx (sin reiniciar)
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[7/7] Recargando Nginx...${NC}"
docker compose -f $COMPOSE_FILE exec -T nginx nginx -s reload 2>/dev/null || \
docker compose -f $COMPOSE_FILE restart nginx
echo -e "  ${GREEN}Nginx recargado${NC}"

# -----------------------------------------------------------------------------
# Limpieza
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}Limpiando imágenes antiguas...${NC}"
docker image prune -f > /dev/null 2>&1

# -----------------------------------------------------------------------------
# Verificación Final
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${GREEN}  Deployment Completado - v${VERSION}        ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e ""
echo -e "${YELLOW}Estado de servicios:${NC}"
docker compose -f $COMPOSE_FILE ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

echo -e ""
echo -e "${YELLOW}Verificación de endpoints:${NC}"

# Check backend
if curl -sf http://localhost:8080/api/v1/health/ > /dev/null 2>&1; then
    echo -e "  Backend API:  ${GREEN}✓ OK${NC}"
else
    echo -e "  Backend API:  ${RED}✗ ERROR${NC}"
fi

# Check frontend
if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
    echo -e "  Frontend:     ${GREEN}✓ OK${NC}"
else
    echo -e "  Frontend:     ${RED}✗ ERROR${NC}"
fi

echo -e ""
echo -e "Application URL: https://ebenezertaxservices1.od2.ejsupportit.com"
echo -e ""
echo -e "${YELLOW}Comandos útiles:${NC}"
echo -e "  Ver logs:       docker compose -f $COMPOSE_FILE logs -f"
echo -e "  Ver logs API:   docker compose -f $COMPOSE_FILE logs -f backend"
echo -e "  Reiniciar:      docker compose -f $COMPOSE_FILE restart"
echo -e "  Estado:         docker compose -f $COMPOSE_FILE ps"
echo -e ""
