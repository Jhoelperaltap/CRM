#!/bin/bash
# =============================================================================
# Ebenezer Tax Services CRM - VPS Setup Script
# =============================================================================
# Run this script on your VPS to set up the CRM application
# Usage: ./setup-vps.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}  Ebenezer Tax Services CRM - VPS Setup     ${NC}"
echo -e "${BLUE}=============================================${NC}"

# -----------------------------------------------------------------------------
# 1. Check if running as root or with sudo
# -----------------------------------------------------------------------------
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo ./setup-vps.sh${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# 2. Update system packages
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update && apt-get upgrade -y

# -----------------------------------------------------------------------------
# 3. Install Docker if not installed
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    usermod -aG docker $SUDO_USER || true
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# -----------------------------------------------------------------------------
# 4. Install Docker Compose if not installed
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# -----------------------------------------------------------------------------
# 5. Install Certbot for SSL
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/8] Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot
    echo -e "${GREEN}Certbot installed successfully${NC}"
else
    echo -e "${GREEN}Certbot already installed${NC}"
fi

# -----------------------------------------------------------------------------
# 6. Create application directory
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/8] Setting up application directory...${NC}"
APP_DIR="/opt/ebenezer-crm"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${GREEN}Application directory: $APP_DIR${NC}"

# -----------------------------------------------------------------------------
# 7. Generate security keys
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/8] Generating security keys...${NC}"

# Generate random passwords and keys
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
SECRET_KEY=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9!@#$%^&*' | head -c 64)
JWT_SIGNING_KEY=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
FIELD_ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || openssl rand -base64 32)
DOCUMENT_ENCRYPTION_KEY=$(openssl rand -base64 32)

echo -e "${GREEN}Security keys generated${NC}"

# -----------------------------------------------------------------------------
# 8. Create .env file
# -----------------------------------------------------------------------------
echo -e "\n${YELLOW}[7/8] Creating environment configuration...${NC}"

cat > $APP_DIR/.env << EOF
# =============================================================================
# Ebenezer Tax Services CRM - Production Environment
# Generated: $(date)
# =============================================================================

# Database
DB_NAME=ebenezer_crm
DB_USER=ebenezer
DB_PASSWORD=$DB_PASSWORD

# Security Keys
SECRET_KEY=$SECRET_KEY
JWT_SIGNING_KEY=$JWT_SIGNING_KEY
FIELD_ENCRYPTION_KEY=$FIELD_ENCRYPTION_KEY
DOCUMENT_ENCRYPTION_KEY=$DOCUMENT_ENCRYPTION_KEY

# Domain
ALLOWED_HOSTS=ebenezertaxservices1.od2.ejsupportit.com,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://ebenezertaxservices1.od2.ejsupportit.com
CSRF_TRUSTED_ORIGINS=https://ebenezertaxservices1.od2.ejsupportit.com
EOF

chmod 600 $APP_DIR/.env
echo -e "${GREEN}Environment file created: $APP_DIR/.env${NC}"

# -----------------------------------------------------------------------------
# 9. Print next steps
# -----------------------------------------------------------------------------
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${GREEN}  VPS Setup Complete!                       ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Clone or copy the CRM repository to: $APP_DIR"
echo -e "2. Copy deploy files to $APP_DIR"
echo -e "3. Run: cd $APP_DIR && docker-compose -f docker-compose.prod.yml up -d"
echo -e "4. Run migrations: docker-compose exec backend python manage.py migrate"
echo -e "5. Create superuser: docker-compose exec backend python manage.py createsuperuser"
echo -e "6. Set up SSL with Certbot (instructions below)"
echo -e ""
echo -e "${YELLOW}SSL Setup:${NC}"
echo -e "certbot certonly --standalone -d ebenezertaxservices1.od2.ejsupportit.com"
echo -e ""
echo -e "${YELLOW}Important Files:${NC}"
echo -e "- Environment: $APP_DIR/.env"
echo -e "- Docker Compose: $APP_DIR/docker-compose.prod.yml"
echo -e ""
echo -e "${RED}IMPORTANT: Save the .env file securely!${NC}"
echo -e "${RED}The passwords and keys are only generated once.${NC}"
