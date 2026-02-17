# Security Audit Report - EJFLOW CRM

**Fecha:** Febrero 2026
**Auditor:** Claude Code
**Versión:** 1.6 (Actualizado con validación de tamaño en CSV Import)

---

## Resumen Ejecutivo

Se realizó una auditoría de seguridad completa del sistema CRM incluyendo:
- Backend Django REST Framework
- Frontend Next.js
- Aplicación móvil React Native/Expo

### Hallazgos Totales

| Severidad | Encontradas | Corregidas | Pendientes |
|-----------|-------------|------------|------------|
| **CRÍTICA** | 15 | 9 | **6** |
| **ALTA** | 14 | 9 | **5** |
| **MEDIA** | 13 | 3 | **10** |
| **BAJA** | 2 | 0 | **2** |
| **TOTAL** | 44 | 21 | **23** |

### Correcciones Aplicadas en esta Sesión

| # | Vulnerabilidad | Severidad | Estado |
|---|----------------|-----------|--------|
| 1 | CORS Allow All Origins | CRÍTICA | ✅ Corregido |
| 2 | Rate Limiting Portal Login | ALTA | ✅ Corregido |
| 3 | Rate Limiting Password Reset | ALTA | ✅ Corregido |
| 4 | Security Headers Frontend | ALTA | ✅ Corregido |
| 5 | .env en .gitignore Mobile | ALTA | ✅ Corregido |
| 6 | JWT Tokens en URL (Documents) | CRÍTICA | ✅ Corregido |
| 7 | Portal/Staff comparten JWT Key | CRÍTICA | ✅ Corregido |
| 8 | XSS en Webforms | ALTA | ✅ Corregido |
| 9 | Reset Token en texto plano | ALTA | ✅ Corregido |
| 10 | JWT Tokens en localStorage | CRÍTICA | ✅ Corregido |
| 11 | Middleware Auth Server-Side | ALTA | ✅ Corregido |
| 12 | Content Security Policy | MEDIA | ✅ Ya implementado |
| 13 | HTTP en lugar de HTTPS (Mobile) | ALTA | ✅ Corregido |
| 14 | Console.log con errores sensibles | ALTA | ✅ Corregido |
| 15 | Session Timeout puede ser evitado | MEDIA | ✅ Corregido |
| 16 | Sin validación de tamaño en CSV Import | MEDIA | ✅ Corregido |

---

## Correcciones Aplicadas

### ✅ CORREGIDO: CORS Allow All Origins
**Archivo:** `config/settings/base.py`
```python
# ANTES (INSEGURO)
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=True)

# DESPUÉS (SEGURO)
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
```

### ✅ CORREGIDO: Rate Limiting en Portal Login
**Archivo:** `apps/portal/views.py`
```python
class PortalLoginThrottle(AnonRateThrottle):
    rate = "5/minute"

class PortalLoginView(APIView):
    throttle_classes = [PortalLoginThrottle]
```

### ✅ CORREGIDO: Rate Limiting en Password Reset
**Archivo:** `apps/portal/views.py`
```python
class PortalPasswordResetThrottle(AnonRateThrottle):
    rate = "3/hour"

class PortalPasswordResetRequestView(APIView):
    throttle_classes = [PortalPasswordResetThrottle]
```

### ✅ CORREGIDO: Security Headers en Frontend
**Archivo:** `next.config.ts`
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

### ✅ CORREGIDO: .env en .gitignore (Mobile)
**Archivo:** `crm-mobile/.gitignore`
```
.env
.env.local
.env*.local
.env.development
.env.production
```

### ✅ CORREGIDO: JWT Tokens en URL (Document Download)
**Riesgo:** Tokens expuestos en logs, historial, referer headers
**Archivos modificados:**
- `apps/documents/models.py` - Nuevo modelo `DocumentDownloadToken` para tokens seguros de un solo uso
- `apps/documents/views.py` - Nuevo endpoint `download-token/` y actualización de `download/`
- `apps/documents/tasks.py` - Tarea Celery para limpieza de tokens expirados
- `src/lib/api/documents.ts` - Funciones actualizadas para usar tokens seguros
- `src/components/documents/document-viewer.tsx` - Actualizado para tokens async
- `src/components/documents/documents-by-year.tsx` - Actualizado para tokens async
- `src/app/(dashboard)/documents/[id]/page.tsx` - Actualizado para tokens async

**Solución implementada:**
- Tokens de descarga de 5 minutos de duración
- Tokens de un solo uso (invalidados después del primer acceso)
- Tokens vinculados a documento y usuario específicos
- Limpieza automática diaria de tokens expirados

### ✅ CORREGIDO: Portal y Staff comparten JWT Secret
**Riesgo:** Escalamiento de privilegios - tokens de portal podían usarse en APIs de staff
**Archivos modificados:**
- `config/settings/base.py` - Nueva configuración `PORTAL_JWT_SIGNING_KEY`
- `apps/portal/auth.py` - Usa clave separada para tokens de portal

**Solución implementada:**
- Clave JWT separada para portal (`PORTAL_JWT_SIGNING_KEY`)
- Warning en producción si no está configurada
- Tokens de portal y staff son incompatibles entre sí

### ✅ CORREGIDO: XSS en Webform HTML Generation
**Riesgo:** Inyección de scripts maliciosos a través de nombres de campos
**Archivo modificado:** `apps/webforms/views.py`

**Solución implementada:**
- Uso de `django.utils.html.escape()` para todos los valores insertados en HTML
- Campos afectados: field_name, override_value, url_parameter, webform.name

### ✅ CORREGIDO: Reset Token almacenado en texto plano
**Riesgo:** Si la base de datos es comprometida, los tokens de reset pueden ser usados
**Archivo modificado:** `apps/portal/views.py`

**Solución implementada:**
- Tokens de reset se hashean con SHA256 antes de almacenar
- El token sin hashear se envía al usuario por email
- La validación compara el hash del token entrante con el hash almacenado

### ✅ CORREGIDO: JWT Tokens en localStorage
**Riesgo:** Ataques XSS pueden robar tokens de autenticación almacenados en localStorage
**Archivos modificados:**

**Backend:**
- `apps/users/authentication.py` - Ya tenía soporte de cookies httpOnly
- `apps/users/views.py` - Ya configuraba cookies en login/refresh
- `apps/portal/auth.py` - Añadidas funciones para cookies de portal
- `apps/portal/views.py` - PortalLoginView y PortalLogoutView ahora usan cookies

**Frontend:**
- `src/stores/auth-store.ts` - Removido almacenamiento de tokens
- `src/stores/portal-auth-store.ts` - Removido almacenamiento de tokens
- `src/lib/auth.ts` - Actualizado para no guardar tokens
- `src/lib/api.ts` - Removido interceptor que añadía header de Authorization
- `src/lib/api/portal.ts` - Añadido withCredentials para cookies
- `src/hooks/use-inactivity-timeout.ts` - Usa user en lugar de tokens
- `src/hooks/use-portal-auth.ts` - Usa contact en lugar de tokens
- `src/components/portal/portal-login-form.tsx` - No guarda tokens

**Solución implementada:**
- JWT tokens se almacenan SOLO en cookies httpOnly (no accesibles via JavaScript)
- Frontend solo almacena perfil de usuario para UI (no tokens)
- Todas las peticiones API usan `withCredentials: true`
- Backend verifica token desde cookie (con fallback a header para mobile)
- Cookies tienen flags: httpOnly, SameSite=Lax, Secure (en producción)

### ✅ CORREGIDO: Middleware de Autenticación Server-Side
**Riesgo:** Sin validación server-side, contenido protegido era visible brevemente antes del redirect del cliente
**Archivo creado:** `src/middleware.ts`

**Solución implementada:**
- Middleware Next.js que corre en Edge Runtime antes de renderizar
- Verifica presencia de cookie `access_token` para rutas protegidas
- Redirige a `/login` si no está autenticado
- Redirige a `/dashboard` si ya está autenticado y accede a `/login`
- Soporte separado para rutas del portal (`/portal/*`)
- Preserva URL de origen para redirect post-login (`?from=`)

**Rutas protegidas:**
- `/dashboard`, `/contacts`, `/corporations`, `/cases`
- `/appointments`, `/documents`, `/tasks`, `/settings`
- `/reports`, `/inbox`, `/notifications`, `/quotes`
- `/inventory`, `/ai-agent`, `/sales-insights`, `/forecasts`

### ✅ CORREGIDO: HTTP en lugar de HTTPS (Mobile)
**Riesgo:** Datos sensibles transmitidos sin encriptación (man-in-the-middle)
**Archivos modificados:**
- `crm-mobile/src/constants/api.ts` - Validación de HTTPS en producción
- `crm-mobile/.env.example` - Documentación de seguridad
- `crm-mobile/app.json` - Rebranding a EJFLOW Client

**Solución implementada:**
- Función `getSecureApiUrl()` que valida y normaliza URLs
- En builds de producción (`!__DEV__`): HTTP se actualiza automáticamente a HTTPS
- Excepciones solo para localhost/emulador en desarrollo (192.168.x.x, 10.0.x.x, localhost)
- Warnings en consola para URLs HTTP no locales durante desarrollo
- Documentación clara en `.env.example` sobre requisitos de HTTPS

### ✅ CORREGIDO: Console.log con errores sensibles
**Riesgo:** Exposición de información sensible (tokens, datos de usuario) en consola
**Archivos creados/modificados:**
- `CRM Front end/src/lib/logger.ts` - Nuevo módulo de logging seguro
- `crm-mobile/src/utils/logger.ts` - Nuevo módulo de logging seguro para mobile
- `crm-mobile/src/utils/index.ts` - Exportación del logger
- `CRM Back end/apps/portal/views.py` - Removidos print statements de debug

**Solución implementada:**
- Logger que sanitiza datos sensibles en producción (passwords, tokens, secrets)
- En desarrollo: logs completos para debugging
- En producción: solo errores/warnings, sin datos sensibles
- Backend: removidos print() de debug, usar logging.getLogger() apropiado
- Soporte para integración con servicios externos (Sentry, LogRocket)

### ✅ CORREGIDO: Session Timeout puede ser evitado
**Riesgo:** Atacante puede mantener sesión activa indefinidamente con requests periódicos
**Archivos modificados:**
- `apps/users/models.py` - Añadido campo `max_session_duration_hours`
- `apps/users/middleware.py` - Verificación de timeout absoluto
- `apps/users/serializers_settings.py` - Campo en API

**Solución implementada:**
- Timeout absoluto de sesión (default: 24 horas)
- La sesión expira después de X horas sin importar la actividad
- Configurable en AuthenticationPolicy (0 = deshabilitado)
- Complementa el idle timeout existente (240 min por defecto)
- Previene sesiones perpetuas por actividad automatizada

### ✅ CORREGIDO: Sin validación de tamaño en CSV Import
**Riesgo:** Ataques de denegación de servicio mediante archivos CSV muy grandes
**Archivos modificados:**
- `apps/core/validators.py` - Nueva función `validate_csv_import()`
- `apps/contacts/views.py` - Validación en import_csv
- `apps/corporations/views.py` - Validación en import_csv
- `apps/users/views.py` - Validación en import_csv

**Solución implementada:**
- Límite de tamaño de archivo: 10 MB máximo
- Límite de filas: 10,000 filas máximo
- Validación de extensión .csv
- Validación de codificación UTF-8
- Logging de imports grandes (>1000 filas)
- Mensajes de error claros para el usuario

### ✅ YA IMPLEMENTADO: Content Security Policy
**Ubicación:** `next.config.ts`
**Estado:** CSP ya estaba configurado con:
- `default-src 'self'`
- `frame-ancestors 'self'`
- `form-action 'self'`
- HSTS en producción

---

## Vulnerabilidades Pendientes (Por Prioridad)

### 🔴 CRÍTICAS - Corregir Inmediatamente

#### 1. SECRET_KEY con valor por defecto
**Riesgo:** Compromete toda la seguridad criptográfica
**Ubicación:** `config/settings/base.py:13`
**Solución:** Remover default, requerir variable de entorno
**Estado:** Ya tiene validación en producción - lanza error si usa default

#### 2. JWT_SIGNING_KEY con valor por defecto
**Riesgo:** Tokens JWT pueden ser falsificados
**Ubicación:** `config/settings/base.py:261`
**Solución:** Configurar en variables de entorno de producción

### 🟡 MEDIAS - Corregir este mes

#### 4. No hay Certificate Pinning (Mobile)
**Solución:** Implementar SSL pinning

#### 5. Credenciales DB en código por defecto
**Ubicación:** `config/settings/base.py:134`
**Solución:** Usar sqlite para desarrollo local

---

## Checklist de Producción

Antes de desplegar a producción, verificar:

### Variables de Entorno Requeridas
```bash
# Django
SECRET_KEY=<clave-segura-64-caracteres>
JWT_SIGNING_KEY=<clave-segura-32-bytes>
PORTAL_JWT_SIGNING_KEY=<clave-segura-32-bytes-separada>
FIELD_ENCRYPTION_KEY=<fernet-key-base64>
DEBUG=False
ALLOWED_HOSTS=tudominio.com,api.tudominio.com

# CORS
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://tudominio.com

# Database
DATABASE_URL=postgres://user:password@host:5432/dbname
```

### Configuración de Servidor
- [ ] HTTPS habilitado con certificado válido
- [ ] HSTS habilitado
- [ ] Firewall configurado
- [ ] Rate limiting en nginx/load balancer
- [ ] Logs de acceso habilitados

### Configuración de Aplicación
- [ ] DEBUG=False en producción
- [ ] Secretos únicos y seguros
- [ ] Backups automatizados
- [ ] Monitoreo de errores (Sentry)

---

## Prácticas de Seguridad Positivas Encontradas

El sistema implementa correctamente:

1. ✅ **JWT Token Blacklisting** - Rotación de tokens
2. ✅ **Historial de Contraseñas** - Previene reutilización
3. ✅ **IP Whitelisting/Blacklisting** - Control de acceso
4. ✅ **Session Timeout** - Cierre por inactividad
5. ✅ **Límite de Sesiones Concurrentes** - Un dispositivo a la vez
6. ✅ **Soporte 2FA** - TOTP implementado
7. ✅ **Audit Logging** - Registro de actividades
8. ✅ **RBAC** - Control de acceso basado en roles
9. ✅ **Permisos por Módulo** - Granularidad de acceso
10. ✅ **SecureStore en Mobile** - Almacenamiento seguro nativo

---

## Recomendaciones de Testing

1. **Penetration Testing:** Enfocarse en bypass de autenticación
2. **SAST/DAST:** Ejecutar Bandit, Safety, OWASP ZAP
3. **Auditoría de Dependencias:** `pip-audit`, `npm audit`
4. **Revisión de Configuración:** Verificar todas las variables de entorno
5. **Code Review:** Revisar todos los endpoints con `AllowAny`

---

## Cumplimiento Normativo

Dado que es un CRM de servicios fiscales que maneja SSN:

| Normativa | Estado | Notas |
|-----------|--------|-------|
| **GDPR** | ⚠️ Parcial | localStorage viola minimización de datos |
| **SOC 2** | ⚠️ Parcial | Faltan algunos headers de seguridad |
| **IRS Pub 4557** | ⚠️ Parcial | SSN requiere encriptación y auditoría |

---

## Próximos Pasos

### Inmediato (24-48 horas)
1. Configurar variables de entorno de producción
2. Migrar tokens de localStorage a cookies httpOnly
3. Implementar HTTPS en todos los entornos

### Corto Plazo (1-2 semanas)
4. Separar claves JWT de portal y staff
5. Implementar middleware de auth server-side
6. Agregar CSP headers

### Mediano Plazo (1 mes)
7. Implementar certificate pinning en mobile
8. Auditoría de dependencias completa
9. Penetration testing profesional

---

**Documento generado automáticamente por Claude Code**
**Fecha:** Febrero 2026
