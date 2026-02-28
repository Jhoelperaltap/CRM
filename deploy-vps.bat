@echo off
echo ============================================
echo   EJFLOW CRM - Deploy to VPS (Docker)
echo ============================================
echo.
echo Conectando al VPS...
echo Host: 148.230.83.208:2222
echo User: appuser
echo.

REM Primero aceptar la clave SSH si es necesario
echo y | "C:\Program Files\PuTTY\plink.exe" -P 2222 -pw Albertashley1808@ appuser@148.230.83.208 "echo Conexion exitosa"

echo.
echo [1/4] Actualizando codigo desde GitHub...
"C:\Program Files\PuTTY\plink.exe" -P 2222 -pw Albertashley1808@ appuser@148.230.83.208 "cd /home/appuser/crm && git pull origin main"

echo.
echo [2/4] Reconstruyendo contenedores Docker...
"C:\Program Files\PuTTY\plink.exe" -P 2222 -pw Albertashley1808@ appuser@148.230.83.208 "cd /home/appuser/crm && docker-compose build"

echo.
echo [3/4] Reiniciando servicios...
"C:\Program Files\PuTTY\plink.exe" -P 2222 -pw Albertashley1808@ appuser@148.230.83.208 "cd /home/appuser/crm && docker-compose up -d"

echo.
echo [4/4] Ejecutando migraciones de base de datos...
"C:\Program Files\PuTTY\plink.exe" -P 2222 -pw Albertashley1808@ appuser@148.230.83.208 "cd /home/appuser/crm && docker-compose exec -T backend python manage.py migrate"

echo.
echo ============================================
echo   Deploy completado!
echo ============================================
echo.
echo Verificando estado de contenedores...
"C:\Program Files\PuTTY\plink.exe" -P 2222 -pw Albertashley1808@ appuser@148.230.83.208 "cd /home/appuser/crm && docker-compose ps"

echo.
pause
