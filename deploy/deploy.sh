#!/bin/bash
# =============================================================================
# Ebenezer Tax Services CRM - Deployment Script
# =============================================================================
# Run this script to deploy or update the CRM application
# Usage: ./deploy.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/ebenezer-crm"
cd $APP_DIR

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Ebenezer CRM - Deployment                 ${NC}"
echo -e "${BLUE}=============================================${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "Run setup-vps.sh first or create .env from .env.example"
    exit 1
fi

# Load environment variables
source .env

# -----------------------------------------------------------------------------
# 1. Pull latest changes (if git repo)
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/6] Checking for updates...${NC}"
if [ -d ".git" ]; then
    git pull origin main || echo "Not a git repo or no updates"
fi

# -----------------------------------------------------------------------------
# 2. Build Docker images
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/6] Building Docker images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# -----------------------------------------------------------------------------
# 3. Stop existing containers
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/6] Stopping existing containers...${NC}"
docker-compose -f docker-compose.prod.yml down || true

# -----------------------------------------------------------------------------
# 4. Start services
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/6] Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
echo -e "Waiting for database to be ready..."
sleep 10

# -----------------------------------------------------------------------------
# 5. Run migrations
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/6] Running database migrations...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py migrate --noinput

# -----------------------------------------------------------------------------
# 6. Collect static files
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/6] Collecting static files...${NC}"
docker-compose -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --noinput

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${GREEN}  Deployment Complete!                      ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e ""
echo -e "Application URL: https://ebenezertaxservices1.od2.ejsupportit.com"
echo -e ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:      docker-compose -f docker-compose.prod.yml logs -f"
echo -e "  Restart:        docker-compose -f docker-compose.prod.yml restart"
echo -e "  Stop:           docker-compose -f docker-compose.prod.yml down"
echo -e "  Create admin:   docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo -e ""
echo -e "${YELLOW}Check status:${NC}"
docker-compose -f docker-compose.prod.yml ps
