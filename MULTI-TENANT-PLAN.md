# Plan: CRM Multi-Tenant SaaS Architecture

> **Estado:** PENDIENTE - Guardado para implementación futura
> **Fecha de análisis:** Febrero 2026
> **Prioridad actual:** Opción 2 - Continuar desarrollo de features para Ebenezer

---

## 1. Objetivo

Crear un CRM empresarial que pueda ser vendido a múltiples clientes, donde exista un sistema MATRIZ central que controle licencias y activaciones.

---

## 2. Requisitos Principales

### 2.1 Multi-tenant Architecture
- Cada cliente tiene su propia instancia o dominio
- Existe una plataforma MATRIZ central que controla licencias
- Arquitectura centralizada: 1 backend, 1 frontend, multi-tenant por `tenant_id`

### 2.2 License Control
- Los clientes pueden crear usuarios ilimitados
- SOLO el sistema MATRIZ puede activar usuarios
- Cada tenant tiene `license_max_users`
- Si se excede, nuevos usuarios quedan en estado `PENDING_LICENSE`

### 2.3 White-label Branding
Cada tenant puede modificar:
- Nombre del sistema
- Logo
- Colores/tema
- El frontend carga branding dinámicamente desde API

### 2.4 Mobile Linking
- La app móvil debe conectarse automáticamente al tenant correcto
- Implementar deep links: `appcrm://invite?tenant_id=UUID&token=XXXX`
- La app guarda `base_url` del tenant

### 2.5 Security
- Todas las requests incluyen `tenant_id`
- Validar license status en middleware
- Row-level security para aislamiento de datos

---

## 3. Stack Tecnológico

### Backend
- Django 5.x
- Django REST Framework
- PostgreSQL (shared database, tenant isolation)
- Redis (cache + Celery broker)
- JWT Authentication
- Celery (background tasks)

### Frontend
- Next.js 16+
- React 19
- Tailwind CSS
- shadcn/ui
- Dynamic theming system

### Mobile
- Expo / React Native
- Deep linking support
- Dynamic tenant configuration

---

## 4. Análisis de Impacto

### 4.1 Resumen

| Aspecto | Impacto |
|---------|---------|
| **Nivel de complejidad** | MUY ALTO |
| **Tiempo estimado** | 4-8 meses (equipo experimentado) |
| **Código afectado** | ~80-90% del codebase actual |
| **Riesgo** | Alto - cambio arquitectónico fundamental |

### 4.2 Modelos Afectados (agregar tenant_id)

```
apps/users/
├── User
├── Role
├── ModulePermission

apps/contacts/
├── Contact
├── ContactTag
├── ContactTagAssignment

apps/corporations/
├── Corporation

apps/cases/
├── TaxCase
├── TaxCaseNote
├── CaseChecklist
├── CaseChecklistItem

apps/documents/
├── Document
├── DocumentTemplate

apps/appointments/
├── Appointment

apps/emails/
├── Email
├── EmailTemplate
├── EmailAccount

apps/tasks/
├── Task

apps/workflows/
├── Workflow
├── WorkflowTrigger
├── WorkflowAction

apps/notifications/
├── Notification
├── NotificationPreference

apps/portal/
├── ClientPortalAccess
├── PortalMessage
├── PortalNotification
├── PortalDocumentUpload
├── PortalDeviceToken
├── PortalConfiguration

apps/quotes/
├── Quote
├── QuoteItem

apps/inventory/
├── InventoryItem

apps/dashboard/
├── DashboardWidget
├── UserPreference

apps/audit/
├── AuditLog

apps/comments/
├── Comment

apps/chatbot/
├── ChatSession
├── ChatMessage

apps/ai_agent/
├── AgentConfiguration
├── AgentAction
├── AgentLog
├── AgentInsight
```

### 4.3 Nuevos Componentes Requeridos

#### Backend - Nuevas Apps

```python
# apps/tenants/models.py
class Tenant(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)  # Para subdominios
    domain = models.CharField(max_length=255, blank=True)  # Custom domain
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Configuración
    settings = models.JSONField(default=dict)

    class Meta:
        db_table = "saas_tenants"


class TenantBranding(models.Model):
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE)
    system_name = models.CharField(max_length=100, default="CRM")
    logo_url = models.URLField(blank=True)
    favicon_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=7, default="#1976D2")
    secondary_color = models.CharField(max_length=7, default="#424242")
    custom_css = models.TextField(blank=True)

    class Meta:
        db_table = "saas_tenant_branding"


# apps/licenses/models.py
class License(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        EXPIRED = "expired", "Expired"
        TRIAL = "trial", "Trial"

    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices)
    max_users = models.IntegerField(default=5)
    activated_users = models.IntegerField(default=0)
    expires_at = models.DateTimeField(null=True)

    # Features/modules habilitados
    features = models.JSONField(default=dict)

    class Meta:
        db_table = "saas_licenses"


class UserActivation(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending License"
        ACTIVE = "active", "Active"
        DEACTIVATED = "deactivated", "Deactivated"

    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=Status.choices)
    activated_at = models.DateTimeField(null=True)
    activated_by = models.ForeignKey(
        'users.User',
        null=True,
        on_delete=models.SET_NULL,
        related_name='activations_made'
    )

    class Meta:
        db_table = "saas_user_activations"
```

#### Backend - Middleware

```python
# apps/tenants/middleware.py

class TenantMiddleware:
    """
    Resolve tenant from request (subdomain, header, or JWT claim).
    Sets request.tenant for use in views.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = self.resolve_tenant(request)
        request.tenant = tenant
        return self.get_response(request)

    def resolve_tenant(self, request):
        # 1. Check JWT claim
        # 2. Check X-Tenant-ID header
        # 3. Check subdomain
        # 4. Check custom domain
        pass


class LicenseMiddleware:
    """
    Validate tenant license on each request.
    Block access if license is expired/suspended.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'tenant') and request.tenant:
            license = request.tenant.license
            if license.status not in ['active', 'trial']:
                return JsonResponse(
                    {'error': 'License inactive'},
                    status=403
                )
        return self.get_response(request)
```

#### Backend - Base QuerySet

```python
# apps/core/models.py

class TenantManager(models.Manager):
    def get_queryset(self):
        # Automatically filter by tenant from current request
        from apps.tenants.utils import get_current_tenant
        tenant = get_current_tenant()
        if tenant:
            return super().get_queryset().filter(tenant=tenant)
        return super().get_queryset()


class TenantModel(models.Model):
    """Base model for all tenant-scoped models."""
    tenant = models.ForeignKey(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='%(class)s_set'
    )

    objects = TenantManager()
    all_objects = models.Manager()  # For admin/matrix access

    class Meta:
        abstract = True
```

---

## 5. Plan de Implementación por Fases

### Fase 1: Infraestructura Base (1-2 meses)

**Objetivos:**
- Crear modelos Tenant, License, UserActivation
- Implementar TenantMiddleware
- Agregar tenant_id al modelo User
- Crear sistema de autenticación multi-tenant

**Tareas:**
- [ ] Crear app `tenants` con modelos base
- [ ] Crear app `licenses` con modelos de licencia
- [ ] Implementar TenantMiddleware
- [ ] Implementar LicenseMiddleware
- [ ] Modificar User model para incluir tenant
- [ ] Modificar JWT para incluir tenant_id
- [ ] Crear endpoint de tenant discovery
- [ ] Tests de aislamiento básico

**Archivos nuevos:**
```
apps/tenants/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── middleware.py
├── utils.py
├── serializers.py
├── views.py
├── urls.py
└── tests/

apps/licenses/
├── __init__.py
├── admin.py
├── apps.py
├── models.py
├── services.py
├── serializers.py
├── views.py
├── urls.py
└── tests/
```

### Fase 2: Migración de Modelos (2-3 meses)

**Objetivos:**
- Agregar tenant_id a todos los modelos existentes
- Actualizar todas las queries
- Implementar row-level security

**Tareas:**
- [ ] Crear migraciones para agregar tenant_id a cada modelo
- [ ] Actualizar todos los ViewSets con TenantMixin
- [ ] Actualizar todos los Serializers
- [ ] Modificar signals para incluir tenant context
- [ ] Actualizar Celery tasks para tenant context
- [ ] Migrar datos existentes al tenant "Ebenezer"
- [ ] Tests exhaustivos de aislamiento de datos

**Modelos a migrar (por prioridad):**
1. Core: User, Role
2. CRM: Contact, Corporation, Case
3. Operaciones: Document, Appointment, Task, Email
4. Portal: PortalMessage, PortalNotification
5. Otros: Workflow, Quote, Inventory, etc.

### Fase 3: Sistema MATRIZ (1-2 meses)

**Objetivos:**
- Panel de administración central
- Sistema de licencias completo
- Activación de usuarios

**Tareas:**
- [ ] Crear app `matrix` para super-admin
- [ ] Dashboard de tenants (crear, editar, suspender)
- [ ] Gestión de licencias (asignar, renovar, modificar)
- [ ] Sistema de activación de usuarios
- [ ] Reportes de uso por tenant
- [ ] Alertas de licencias próximas a vencer
- [ ] API para comunicación MATRIZ ↔ Tenants

**Endpoints MATRIZ:**
```
/matrix/api/v1/tenants/              # CRUD tenants
/matrix/api/v1/tenants/{id}/license/ # Gestionar licencia
/matrix/api/v1/tenants/{id}/users/   # Ver/activar usuarios
/matrix/api/v1/tenants/{id}/usage/   # Estadísticas
/matrix/api/v1/activations/pending/  # Usuarios pendientes
```

### Fase 4: White-label + Mobile (1 mes)

**Objetivos:**
- Sistema de branding dinámico
- Deep links en mobile
- Tenant discovery en app

**Tareas Frontend:**
- [ ] Crear ThemeProvider dinámico
- [ ] Endpoint `/api/v1/branding/` para cargar tema
- [ ] Cargar logo/colores desde API
- [ ] CSS variables dinámicas
- [ ] Página de configuración de branding para admin

**Tareas Mobile:**
- [ ] Implementar deep linking: `appcrm://invite?tenant_id=X&token=Y`
- [ ] Pantalla de configuración de tenant
- [ ] Almacenar base_url en AsyncStorage
- [ ] QR code para invitar usuarios
- [ ] Branding dinámico en app

**Deep Link Flow:**
```
1. Usuario recibe link: appcrm://invite?tenant_id=UUID&token=TOKEN
2. App abre y detecta deep link
3. App llama API: GET /api/v1/tenants/{tenant_id}/info/
4. App guarda base_url del tenant
5. App redirige a registro/login con token
```

---

## 6. Consideraciones de Seguridad

### 6.1 Aislamiento de Datos
- NUNCA exponer datos de un tenant a otro
- Validar tenant_id en CADA query
- Tests automatizados de aislamiento
- Auditoría de accesos cross-tenant

### 6.2 Licencias
- Validar licencia en middleware (cada request)
- Cache de estado de licencia (Redis, 5 min TTL)
- Webhook cuando licencia cambia de estado
- Grace period para licencias expiradas (7 días)

### 6.3 Autenticación
- JWT incluye tenant_id como claim
- Refresh token scoped a tenant
- Invalidar tokens si tenant se suspende

---

## 7. Base de Datos

### 7.1 Estrategia: Shared Database with Tenant ID

```
┌─────────────────────────────────────────────┐
│              PostgreSQL Database             │
├─────────────────────────────────────────────┤
│  saas_tenants          (tenant info)        │
│  saas_licenses         (license info)       │
│  saas_user_activations (user status)        │
│  saas_tenant_branding  (white-label)        │
├─────────────────────────────────────────────┤
│  crm_users             + tenant_id (FK)     │
│  crm_contacts          + tenant_id (FK)     │
│  crm_cases             + tenant_id (FK)     │
│  crm_documents         + tenant_id (FK)     │
│  ... (todos los demás) + tenant_id (FK)     │
└─────────────────────────────────────────────┘
```

### 7.2 Índices Requeridos
```sql
-- Agregar a cada tabla con tenant_id
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);
CREATE INDEX idx_{table}_tenant_created ON {table}(tenant_id, created_at DESC);
```

### 7.3 Migración de Datos Existentes
```python
# Crear tenant para Ebenezer
tenant = Tenant.objects.create(
    name="Ebenezer Tax Services",
    slug="ebenezer",
    is_active=True
)

# Migrar todos los registros existentes
User.objects.update(tenant=tenant)
Contact.objects.update(tenant=tenant)
# ... etc para cada modelo
```

---

## 8. APIs Nuevas

### 8.1 Tenant Discovery (público)
```
GET /api/v1/tenants/discover/?domain=custom.domain.com
GET /api/v1/tenants/discover/?slug=ebenezer

Response:
{
  "tenant_id": "uuid",
  "name": "Ebenezer Tax Services",
  "api_url": "https://api.ebenezer.crm.com",
  "branding": {
    "logo_url": "...",
    "primary_color": "#1976D2"
  }
}
```

### 8.2 Branding (autenticado)
```
GET /api/v1/branding/

Response:
{
  "system_name": "Ebenezer CRM",
  "logo_url": "https://...",
  "favicon_url": "https://...",
  "primary_color": "#1976D2",
  "secondary_color": "#424242"
}
```

### 8.3 License Status (autenticado)
```
GET /api/v1/license/status/

Response:
{
  "status": "active",
  "max_users": 50,
  "active_users": 23,
  "pending_users": 2,
  "expires_at": "2027-02-08T00:00:00Z",
  "features": {
    "ai_agent": true,
    "esign": true,
    "portal": true
  }
}
```

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Data leak entre tenants | Media | Crítico | Tests automatizados, code review estricto |
| Performance degradation | Media | Alto | Índices, caching, query optimization |
| Migración fallida | Baja | Crítico | Backup, rollback plan, migración gradual |
| Complejidad de mantenimiento | Alta | Medio | Documentación, abstracciones claras |

---

## 10. Estimación de Esfuerzo

| Fase | Duración | Desarrolladores | Horas Aprox |
|------|----------|-----------------|-------------|
| Fase 1: Infraestructura | 6-8 semanas | 1-2 | 240-320h |
| Fase 2: Migración | 8-12 semanas | 2 | 320-480h |
| Fase 3: Sistema MATRIZ | 4-6 semanas | 1-2 | 160-240h |
| Fase 4: White-label + Mobile | 4 semanas | 1-2 | 160h |
| **TOTAL** | **22-30 semanas** | - | **880-1200h** |

---

## 11. Checklist Pre-Implementación

Antes de comenzar, verificar:

- [ ] ¿Hay clientes confirmados esperando?
- [ ] ¿Se definió modelo de precios/planes?
- [ ] ¿Se tiene infraestructura para múltiples tenants?
- [ ] ¿Se definió estrategia de soporte multi-tenant?
- [ ] ¿Se tiene sistema de billing (Stripe, etc.)?
- [ ] ¿Se definió SLA por tipo de plan?

---

## 12. Referencias

- Django Multi-Tenancy: https://django-tenants.readthedocs.io/
- Row Level Security PostgreSQL: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- SaaS Architecture Patterns: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/

---

**Documento creado:** Febrero 2026
**Última actualización:** Febrero 2026
**Estado:** Guardado para implementación futura
