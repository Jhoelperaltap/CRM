@echo off
echo ============================================
echo   EJFLOW CRM - Deploy to VPS (Docker)
echo ============================================
echo.
echo Host: 148.230.83.208:2222
echo User: appuser
echo Directorio: /opt/ebenezer-crm
echo.

set PLINK="C:\Program Files\PuTTY\plink.exe"
set HOST=appuser@148.230.83.208
set HOSTKEY=-hostkey "SHA256:tqbgS6cl0phtTBJzU68R1PhKoehEAWLTzARw2p13Uak"
set SSH_OPTS=-P 2222 -pw Albertashley1808@ %HOSTKEY%

echo [1/5] Actualizando codigo desde GitHub...
%PLINK% %SSH_OPTS% %HOST% "cd /opt/ebenezer-crm && git pull origin main"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo al actualizar codigo
    pause
    exit /b 1
)

echo.
echo [2/5] Reconstruyendo contenedor backend...
%PLINK% %SSH_OPTS% %HOST% "cd /opt/ebenezer-crm/deploy && docker compose -f docker-compose.prod.yml build backend"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo al construir backend
    pause
    exit /b 1
)

echo.
echo [3/5] Reiniciando servicio backend...
%PLINK% %SSH_OPTS% %HOST% "cd /opt/ebenezer-crm/deploy && docker compose -f docker-compose.prod.yml up -d backend"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Fallo al reiniciar backend
    pause
    exit /b 1
)

echo.
echo [4/5] Esperando que el servicio inicie...
timeout /t 15 /nobreak > nul

echo.
echo [5/5] Verificando estado de contenedores...
%PLINK% %SSH_OPTS% %HOST% "cd /opt/ebenezer-crm/deploy && docker compose -f docker-compose.prod.yml ps"

echo.
echo ============================================
echo   Deploy completado exitosamente!
echo ============================================
echo.
echo URL: https://ebenezertaxservices1.od2.ejsupportit.com
echo.
pause
