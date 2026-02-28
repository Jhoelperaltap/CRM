# Manual Técnico - Ebenezer Tax Services CRM

**Versión:** 1.2
**Fecha:** Febrero 2026
**Documento Confidencial**

---

## Tabla de Contenidos

1. [Visión General del Sistema](#visión-general-del-sistema)
2. [Arquitectura de Software](#arquitectura-de-software)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Módulos del Sistema](#módulos-del-sistema)
6. [Base de Datos](#base-de-datos)
7. [API REST](#api-rest)
8. [Autenticación y Autorización](#autenticación-y-autorización)
9. [Seguridad Implementada](#seguridad-implementada)
10. [Procesamiento Asíncrono](#procesamiento-asíncrono)
11. [Integraciones](#integraciones)
12. [Frontend Web](#frontend-web)
13. [Aplicación Móvil](#aplicación-móvil)
14. [Testing](#testing)
15. [Despliegue](#despliegue)
16. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)

---

## Visión General del Sistema

### Descripción

El CRM de Ebenezer Tax Services es un sistema completo para la gestión de servicios de impuestos que incluye:

- **Backend API:** Django REST Framework
- **Frontend Web:** Next.js 15 con React 19
- **Aplicación Móvil:** React Native con Expo
- **Base de Datos:** PostgreSQL 16
- **Cache/Broker:** Redis 7
- **Task Queue:** Celery

### Diagrama de Arquitectura

```
                           ┌─────────────────────────────────────┐
                           │            INTERNET                 │
                           └──────────────┬──────────────────────┘
                                          │
                           ┌──────────────▼──────────────────────┐
                           │         LOAD BALANCER               │
                           │            (Nginx)                  │
                           │        SSL Termination              │
                           └──────────────┬──────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
   ┌──────────▼──────────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
   │   FRONTEND WEB      │    │    BACKEND API      │    │   MOBILE APP        │
   │    (Next.js)        │    │     (Django)        │    │   (React Native)    │
   │    Port: 3000       │    │    Port: 8000       │    │                     │
   └─────────────────────┘    └──────────┬──────────┘    └─────────────────────┘
                                         │
              ┌──────────────────────────┼───────────────────────────┐
              │                          │                           │
   ┌──────────▼──────────┐    ┌─────────▼──────────┐    ┌──────────▼──────────┐
   │    PostgreSQL       │    │      Redis          │    │      Celery         │
   │    (Database)       │    │   (Cache/Broker)    │    │    (Task Queue)     │
   │    Port: 5432       │    │    Port: 6379       │    │    Workers + Beat   │
   └─────────────────────┘    └────────────────────┘    └─────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   EXTERNAL SERVICES │
                              │  - Email (SMTP)     │
                              │  - AI (OpenAI/      │
                              │       Anthropic)    │
                              │  - Push (Expo)      │
                              └─────────────────────┘
```

---

## Stack Tecnológico

### Backend

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | Django | 5.1.x |
| API | Django REST Framework | 3.15.x |
| Auth JWT | djangorestframework-simplejwt | 5.3.x |
| Task Queue | Celery | 5.4.x |
| Scheduler | django-celery-beat | 2.6.x |
| CORS | django-cors-headers | 4.x |
| Filtering | django-filter | 24.x |
| API Docs | drf-spectacular | 0.27.x |
| Environment | django-environ | 0.11.x |

### Frontend Web

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | Next.js | 15.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x |
| State | Zustand | 5.x |
| Data Fetching | TanStack Query | 5.x |
| UI Components | shadcn/ui | latest |
| Styling | Tailwind CSS | 3.4.x |
| Forms | React Hook Form | 7.x |
| Validation | Zod | 3.x |

### Aplicación Móvil

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Framework | React Native | 0.76.x |
| Platform | Expo | 52.x |
| Navigation | Expo Router | 4.x |
| UI | React Native Paper | 5.x |
| State | Zustand | 5.x |
| Data | TanStack Query | 5.x |
| Storage | Expo SecureStore | latest |

### Infraestructura

| Componente | Tecnología | Versión |
|------------|------------|---------|
| Database | PostgreSQL | 16.x |
| Cache | Redis | 7.x |
| Web Server | Nginx | 1.24+ |
| WSGI | Gunicorn | 21.x |
| Container | Docker | 24.x |

---

## Estructura del Proyecto

### Backend (`CRM Back end/`)

```
CRM Back end/
├── config/
│   ├── __init__.py
│   ├── asgi.py
│   ├── celery.py                 # Configuración Celery
│   ├── urls.py                   # URLs principales
│   ├── wsgi.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py               # Configuración base
│       ├── development.py        # Desarrollo
│       ├── production.py         # Producción
│       └── test.py               # Testing
├── apps/
│   ├── core/                     # Utilidades compartidas
│   │   ├── models.py             # TimeStampedModel base
│   │   ├── pagination.py         # Paginación estándar
│   │   ├── exceptions.py         # Manejador de excepciones
│   │   └── encryption.py         # Encriptación de campos
│   ├── users/                    # Gestión de usuarios
│   │   ├── models.py             # User, Role, ModulePermission, Department
│   │   ├── views.py              # UserViewSet
│   │   ├── views_department.py   # DepartmentViewSet
│   │   ├── serializers.py
│   │   ├── serializers_department.py
│   │   ├── permissions.py        # ModulePermission
│   │   ├── middleware.py         # Session, IP middleware
│   │   └── password_validators.py
│   ├── contacts/                 # Contactos
│   │   ├── models.py             # Contact
│   │   ├── views.py              # ContactViewSet
│   │   └── serializers.py
│   ├── corporations/             # Corporaciones
│   ├── cases/                    # Casos de impuestos
│   │   ├── models.py             # TaxCase, TaxCaseNote
│   │   └── views.py
│   ├── documents/                # Gestión de documentos
│   │   ├── models.py             # Document, Folder, Tag, DownloadToken, DepartmentClientFolder
│   │   ├── views.py
│   │   ├── views_department_folder.py  # DepartmentClientFolderViewSet
│   │   ├── serializers_department_folder.py
│   │   └── tasks.py              # Limpieza de tokens
│   ├── appointments/             # Citas
│   │   ├── models.py             # Appointment
│   │   └── tasks.py              # Recordatorios
│   ├── tasks/                    # Tareas
│   ├── emails/                   # Integración email
│   │   ├── models.py             # EmailAccount, Email
│   │   └── tasks.py              # Sincronización
│   ├── notifications/            # Notificaciones staff
│   ├── portal/                   # Portal del cliente
│   │   ├── models.py             # ClientPortalAccess, PortalMessage
│   │   ├── views.py              # Portal endpoints
│   │   ├── auth.py               # JWT portal
│   │   └── permissions.py        # IsPortalAuthenticated
│   ├── audit/                    # Auditoría
│   │   ├── models.py             # AuditLog
│   │   └── middleware.py         # AuditMiddleware
│   ├── workflows/                # Automatización
│   ├── reports/                  # Reportes
│   ├── quotes/                   # Cotizaciones
│   ├── esign/                    # Firmas electrónicas
│   ├── inventory/                # Inventario
│   ├── webforms/                 # Formularios web
│   ├── chatbot/                  # Chatbot
│   │   └── ai_service.py         # Integración IA
│   └── ai_agent/                 # Agente autónomo
│       ├── models.py             # AgentConfiguration, AgentAction
│       ├── services/             # Brain, Analyzers
│       └── tasks.py              # Tareas programadas
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── templates/                    # Templates HTML
├── staticfiles/                  # Archivos estáticos
├── media/                        # Archivos subidos
├── docker-compose.yml
├── Dockerfile
├── pytest.ini
└── manage.py
```

### Frontend (`CRM Front end/`)

```
CRM Front end/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/               # Rutas de autenticación
│   │   │   ├── login/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/          # Rutas autenticadas
│   │   │   ├── contacts/
│   │   │   ├── cases/
│   │   │   ├── documents/
│   │   │   ├── appointments/
│   │   │   ├── tasks/
│   │   │   ├── emails/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── ai-agent/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # Componentes base (shadcn)
│   │   ├── layout/               # Layout, Sidebar, Header
│   │   ├── contacts/
│   │   ├── cases/
│   │   ├── documents/
│   │   └── ...
│   ├── lib/
│   │   ├── api/                  # Funciones de API
│   │   │   ├── index.ts          # Cliente Axios
│   │   │   ├── contacts.ts
│   │   │   ├── cases.ts
│   │   │   ├── departments.ts    # CRUD departamentos y carpetas
│   │   │   └── ...
│   │   └── utils.ts
│   ├── stores/                   # Zustand stores
│   │   ├── auth-store.ts
│   │   └── ui-store.ts
│   ├── types/                    # TypeScript types
│   │   ├── index.ts
│   │   ├── api.ts
│   │   ├── department.ts         # Department, DepartmentClientFolder
│   │   └── ...
│   └── hooks/                    # Custom hooks
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Móvil (`crm-mobile/`)

```
crm-mobile/
├── app/                          # Expo Router pages
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             # Home
│   │   ├── cases/
│   │   ├── documents/
│   │   ├── messages/
│   │   ├── appointments/
│   │   ├── notifications/
│   │   ├── chat/
│   │   ├── profile/
│   │   └── _layout.tsx
│   └── _layout.tsx
├── src/
│   ├── api/                      # API calls
│   │   ├── client.ts
│   │   ├── cases.ts
│   │   ├── documents.ts
│   │   └── ...
│   ├── components/
│   │   └── ui/
│   ├── stores/
│   │   └── auth-store.ts
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── constants/
│       └── api.ts
├── app.json
├── eas.json
└── package.json
```

---

## Módulos del Sistema

### Módulos Principales

| Módulo | App Django | Descripción |
|--------|-----------|-------------|
| **Core** | `apps.core` | Modelos base, utilidades, paginación |
| **Users** | `apps.users` | Usuarios, roles, permisos, 2FA, departamentos |
| **Contacts** | `apps.contacts` | Gestión de clientes |
| **Corporations** | `apps.corporations` | Empresas/entidades |
| **Cases** | `apps.cases` | Casos de impuestos |
| **Documents** | `apps.documents` | Gestión de archivos, carpetas por departamento |
| **Appointments** | `apps.appointments` | Citas y calendario |
| **Tasks** | `apps.tasks` | Asignación de tareas |
| **Emails** | `apps.emails` | Integración email |
| **Notifications** | `apps.notifications` | Notificaciones internas |
| **Portal** | `apps.portal` | Portal del cliente |
| **Audit** | `apps.audit` | Logs de auditoría |
| **Workflows** | `apps.workflows` | Automatizaciones |
| **Reports** | `apps.reports` | Generación de reportes |
| **Quotes** | `apps.quotes` | Cotizaciones |
| **E-Sign** | `apps.esign` | Firmas electrónicas |
| **Inventory** | `apps.inventory` | Control de inventario |
| **Webforms** | `apps.webforms` | Formularios públicos |
| **Chatbot** | `apps.chatbot` | Asistente virtual |
| **AI Agent** | `apps.ai_agent` | Agente autónomo IA |

---

## Configuración del Agente de IA

### Campos de Personalización

El modelo `AgentConfiguration` incluye dos campos clave para personalizar el comportamiento del agente:

#### custom_instructions (TextField)

**Definición en modelo:**
```python
custom_instructions = models.TextField(
    blank=True,
    help_text=_("Additional instructions for the AI agent"),
)
```

**Cómo se utiliza:**

El campo `custom_instructions` se inyecta en el system prompt de todas las llamadas a la IA. En `ai_service.py`:

```python
# apps/ai_agent/services/ai_service.py
full_system_prompt = system_prompt or ""
if self.config.custom_instructions:
    full_system_prompt = (
        f"{full_system_prompt}\n\n{self.config.custom_instructions}".strip()
    )
```

**Valores válidos:**
- Texto libre en cualquier idioma
- Instrucciones sobre contexto del negocio
- Prioridades de comunicación
- Reglas específicas de la empresa

**Ejemplo de uso:**
```
Somos Ebenezer Tax Services, una empresa de preparación de impuestos.
Nuestros clientes son principalmente hispanos.
Priorizar comunicaciones en español.
Temporada alta: enero-abril.
Casos con refund > $5000 son prioritarios.
```

#### focus_areas (JSONField)

**Definición en modelo:**
```python
focus_areas = models.JSONField(
    default=list,
    blank=True,
    help_text=_(
        'Priority areas for analysis (e.g., ["revenue", "client_retention"])'
    ),
)
```

**Cómo se utiliza:**

El campo `focus_areas` se utiliza en el `MarketAnalyzer` para priorizar el análisis de métricas:

```python
# apps/ai_agent/services/market_analyzer.py
focus_areas = self.config.focus_areas or [
    "revenue",
    "efficiency",
    "client_satisfaction",
]

prompt = f"""
Analyze these business metrics and generate insights.
...
Focus Areas: {', '.join(focus_areas)}
...
"""
```

**Valores reconocidos:**

| Valor | Descripción | Métricas relacionadas |
|-------|-------------|----------------------|
| `revenue` | Ingresos | Facturación, cobros, tendencias |
| `efficiency` | Eficiencia | Tiempo por caso, productividad |
| `client_satisfaction` | Satisfacción | Retención, quejas, NPS |
| `growth` | Crecimiento | Nuevos clientes, casos nuevos |
| `compliance` | Cumplimiento | Plazos, documentación |
| `team_performance` | Rendimiento | Por preparador, por rol |
| `case_completion` | Completitud | Tasa finalización, pendientes |

**Ejemplo de valor:**
```json
["revenue", "client_satisfaction", "case_completion"]
```

### Capacidades y Limitaciones del Agente

#### Lo que el Agente PUEDE hacer:

| Capacidad | Servicio | Modelo afectado |
|-----------|----------|-----------------|
| Crear notas desde emails | `EmailAnalyzer` | `TaxCaseNote` |
| Enviar recordatorios de citas | `AppointmentReminder` | Notificación |
| Enviar recordatorios de tareas | `TaskEnforcement` | Notificación |
| Escalar tareas vencidas | `TaskEnforcement` | Notificación, Task |
| Generar insights de negocio | `MarketAnalyzer` | `AgentInsight` |
| Crear backups automáticos | `BackupAnalyzer` | `Backup`, `AgentAction` |
| Registrar acciones | Todos | `AgentAction`, `AgentLog` |

#### Lo que el Agente NO PUEDE hacer:

| Restricción | Razón | Implementación |
|-------------|-------|----------------|
| Eliminar datos | Seguridad | No hay métodos DELETE en servicios |
| Modificar permisos | Seguridad | No tiene acceso a `ModulePermission` |
| Enviar emails sin aprobación | Control | `requires_approval=True` por defecto |
| Acceder a APIs externas | Aislamiento | Solo usa `AIService` interno |
| Modificar casos directamente | Auditoría | Solo crea `TaxCaseNote` |
| Ejecutar código arbitrario | Seguridad | Prompts estructurados |

### Flujo de Aprobación de Acciones

```
┌─────────────────┐
│ Agente propone  │
│ acción          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ AgentAction     │────►│ requires_approval│
│ status=PENDING  │     │ = True          │
└────────┬────────┘     └─────────────────┘
         │
         │ autonomous_actions_enabled=True?
         ▼
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ Auto  │ │ Queue │
│Execute│ │ for   │
│       │ │Review │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌─────────────────┐
│ AgentAction     │
│ status=EXECUTED │
│ or APPROVED     │
└─────────────────┘
```

### API Endpoints del Agente

```
/api/v1/ai-agent/
├── config/                   GET, PUT - Configuración
├── status/                   GET - Estado actual
├── actions/                  GET - Lista de acciones
│   ├── {id}/                 GET - Detalle de acción
│   ├── {id}/approve/         POST - Aprobar acción
│   ├── {id}/reject/          POST - Rechazar acción
│   └── {id}/outcome/         POST - Registrar resultado
├── insights/                 GET - Lista de insights
│   ├── {id}/                 GET - Detalle de insight
│   └── {id}/acknowledge/     POST - Reconocer insight
├── logs/                     GET - Logs del agente
├── metrics/                  GET - Métricas históricas
├── analytics/
│   ├── performance/          GET - Resumen de rendimiento
│   ├── learning-progress/    GET - Progreso de aprendizaje
│   ├── recommendations/      GET - Recomendaciones
│   └── trends/               GET - Tendencias
├── backup/
│   ├── workload/             GET - Métricas de carga actual
│   └── analyze/              POST - Ejecutar análisis manual
└── run-cycle/                POST - Ejecutar ciclo manual
```

### Tareas Celery del Agente

```python
CELERY_BEAT_SCHEDULE = {
    # Ciclo principal del agente (cada 5 minutos)
    "ai-agent-cycle": {
        "task": "apps.ai_agent.tasks.run_agent_cycle",
        "schedule": 300.0,
    },
    # Análisis de backup (11 PM diario)
    "ai-agent-automated-backup-check": {
        "task": "apps.ai_agent.tasks.run_automated_backup_check",
        "schedule": crontab(hour=23, minute=0),
    },
    # Limpieza de backups automáticos (Domingo 3 AM)
    "ai-agent-cleanup-automated-backups": {
        "task": "apps.ai_agent.tasks.cleanup_automated_backups",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
    },
    # Agregación de métricas diarias (12:05 AM)
    "ai-agent-aggregate-metrics": {
        "task": "apps.ai_agent.tasks.aggregate_daily_metrics",
        "schedule": crontab(hour=0, minute=5),
    },
}
```

### Seguridad del Agente

| Control | Implementación |
|---------|----------------|
| Rate Limiting | `max_actions_per_hour`, `max_ai_calls_per_hour` |
| Aprobación | `requires_approval` en `AgentAction` |
| Auditoría | `AgentLog` registra todas las operaciones |
| API Keys encriptadas | `EncryptedCharField` con Fernet |
| Permisos | Solo admins pueden modificar configuración |

---

## Base de Datos

### Modelo de Datos Principal

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     User        │     │    Contact      │     │   Corporation   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID)       │     │ id (UUID)       │     │ id (UUID)       │
│ email           │     │ first_name      │     │ name            │
│ password        │     │ last_name       │     │ ein             │
│ role_id ────────┼──┐  │ email           │     │ type            │
│ department_id ──┼──┼─►│ phone           │     │ address         │
│ is_active       │  │  │ address         │     │ parent_id ──────┼──► Self
│ created_at      │  │  │ assigned_to ────┼──┐  │ created_at      │
└─────────────────┘  │  │ primary_corp ───┼──┼──► (FK opcional)   │
                     │  │ created_at      │  │  └────────┬────────┘
┌─────────────────┐  │  └────────┬────────┘  │           │
│      Role       │  │           │           │           │
├─────────────────┤  │           ▼           │           │
│ id (UUID)       │◄─┘  ┌─────────────────┐  │           │
│ name            │     │contact_corporations│           │
│ description     │     │    (M2M Table)    │  │           │
└─────────────────┘     ├─────────────────┤  │           │
                        │ contact_id ◄────┼──┼───────────┤
┌─────────────────┐     │ corporation_id ◄┼──┼───────────┘
│ ModulePermission│     └─────────────────┘  │
├─────────────────┤                          │
│ role_id         │     ┌─────────────────┐  │
│ module          │     │    TaxCase      │  │
│ can_view        │     ├─────────────────┤  │
│ can_create      │     │ id (UUID)       │  │
│ can_edit        │     │ case_number     │  │
│ can_delete      │     │ contact_id ◄────┼──┘
└─────────────────┘     │ corporation_id  │
                        │ case_type       │
                        │ tax_year        │
                        │ status          │
                        │ assigned_to ────┼──► User
                        │ created_at      │
                        └────────┬────────┘

┌─────────────────┐     ┌─────────────────────────┐
│   Department    │     │  DepartmentClientFolder │
├─────────────────┤     ├─────────────────────────┤
│ id (UUID)       │◄────│ department_id           │
│ name            │     │ id (UUID)               │
│ code            │     │ name                    │
│ color           │     │ contact_id ──────────────┼──► Contact
│ icon            │     │ corporation_id ──────────┼──► Corporation
│ is_active       │     │ parent_id ──────────────┼──► Self (Hierarchy)
│ order           │     │ is_default              │
│ created_at      │     │ created_by_id           │
└─────────────────┘     │ created_at              │
        │               └───────────┬─────────────┘
        │                           │
        ▼                           ▼
┌─────────────────┐     ┌─────────────────┐
│ User.department │     │    Document     │
│ (FK opcional)   │     │ department_folder│
└─────────────────┘     └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Document     │     │  Appointment    │     │     Task        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID)       │     │ id (UUID)       │     │ id (UUID)       │
│ title           │     │ title           │     │ title           │
│ file            │     │ start_datetime  │     │ due_date        │
│ contact_id      │     │ end_datetime    │     │ status          │
│ case_id         │     │ contact_id      │     │ assigned_to     │
│ uploaded_by     │     │ case_id         │     │ contact_id      │
│ created_at      │     │ created_by      │     │ case_id         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Modelos de Portal

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ClientPortalAccess│    │  PortalMessage  │     │PortalNotification│
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID)       │     │ id (UUID)       │     │ id (UUID)       │
│ contact_id ─────┼──┐  │ contact_id      │     │ contact_id      │
│ email           │  │  │ case_id         │     │ type            │
│ password_hash   │  │  │ subject         │     │ title           │
│ is_active       │  │  │ body            │     │ message         │
│ last_login      │  │  │ direction       │     │ is_read         │
│ reset_token     │  │  │ is_read         │     │ created_at      │
└─────────────────┘  │  │ created_at      │     └─────────────────┘
                     │  └─────────────────┘
                     │
                     └──► Contact
```

### Modelo Multi-Corporación para Contactos

El sistema soporta asignación de contactos a múltiples corporaciones mediante una relación ManyToMany:

```python
# apps/contacts/models.py
class Contact(TimeStampedModel):
    # Corporación primaria (relación principal para display)
    primary_corporation = models.ForeignKey(
        "corporations.Corporation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="primary_contacts",
    )

    # Todas las corporaciones asociadas (M2M)
    corporations = models.ManyToManyField(
        "corporations.Corporation",
        blank=True,
        related_name="contacts",
    )
```

**Características:**
- `primary_corporation`: Corporación principal mostrada en listas y como referencia rápida
- `corporations`: Relación M2M que incluye todas las corporaciones (primaria + adicionales)
- Al asignar una corporación primaria, también se añade automáticamente a `corporations`
- Filtrar por corporación busca en la relación M2M, no solo en primaria

**Queries optimizadas:**
```python
# Vista de contactos con prefetch de corporaciones
Contact.objects.select_related(
    "primary_corporation", "assigned_to", "created_by"
).prefetch_related("corporations")

# Filtrar contactos por corporación (busca en M2M)
Contact.objects.filter(corporations__id=corporation_uuid)
```

### Modelo de Corporaciones con Jerarquía

```python
# apps/corporations/models.py
class Corporation(TimeStampedModel):
    # Jerarquía (subsidiarias)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subsidiaries",
    )

    # Corporaciones relacionadas (M2M bidireccional)
    related_corporations = models.ManyToManyField(
        "self",
        blank=True,
        symmetrical=True,
    )
```

**Serializers relacionados:**
```python
# CorporationDetailSerializer incluye:
- contacts (lista de contactos vinculados)
- contacts_count (conteo de contactos)
- subsidiaries (corporaciones hijas)
- related_corporations (corporaciones relacionadas M2M)
- related_corporations_count (conteo de relacionadas)
```

### Índices Importantes

```sql
-- Índices de rendimiento
CREATE INDEX idx_contacts_email ON crm_contacts(email);
CREATE INDEX idx_contacts_assigned ON crm_contacts(assigned_to_id);
CREATE INDEX idx_contacts_primary_corp ON crm_contacts(primary_corporation_id);
CREATE INDEX idx_contact_corps_contact ON crm_contact_corporations(contact_id);
CREATE INDEX idx_contact_corps_corp ON crm_contact_corporations(corporation_id);
CREATE INDEX idx_cases_status ON crm_tax_cases(status);
CREATE INDEX idx_cases_contact ON crm_tax_cases(contact_id);
CREATE INDEX idx_documents_contact ON crm_documents(contact_id);
CREATE INDEX idx_documents_dept_folder ON crm_documents(department_folder_id);
CREATE INDEX idx_dept_folders_department ON crm_department_client_folders(department_id);
CREATE INDEX idx_dept_folders_contact ON crm_department_client_folders(contact_id);
CREATE INDEX idx_dept_folders_corporation ON crm_department_client_folders(corporation_id);
CREATE INDEX idx_audit_user_date ON crm_audit_logs(user_id, created_at);
```

---

## API REST

### Estructura de URLs

```
/api/v1/
├── auth/
│   ├── login/                    POST - Obtener tokens
│   ├── logout/                   POST - Invalidar tokens
│   ├── refresh/                  POST - Refrescar token
│   ├── password-change/          POST - Cambiar contraseña
│   └── password-reset/           POST - Solicitar reset
├── users/
│   ├── /                         GET, POST
│   ├── {id}/                     GET, PUT, DELETE
│   └── me/                       GET - Usuario actual
├── roles/                        GET, POST, PUT, DELETE
├── departments/
│   ├── /                         GET, POST
│   ├── {id}/                     GET, PUT, DELETE
│   └── with-folders/             GET - Deps con carpetas
├── department-folders/
│   ├── /                         GET, POST
│   ├── {id}/                     GET, PUT, DELETE
│   ├── tree/                     GET - Árbol de carpetas
│   ├── client-tree/              GET - Árbol por cliente
│   ├── all-departments-tree/     GET - Árbol completo
│   └── initialize/               POST - Crear carpetas default
├── contacts/
│   ├── /                         GET, POST
│   ├── {id}/                     GET, PUT, DELETE
│   ├── {id}/star/                POST - Marcar favorito
│   ├── wizard-create/            POST - Crear contacto + empresa + relación (Light Mode)
│   ├── import_csv/               POST - Importar CSV
│   └── export_csv/               GET - Exportar CSV
├── corporations/                 CRUD estándar
├── cases/
│   ├── /                         GET, POST
│   ├── {id}/                     GET, PUT, DELETE
│   └── {id}/notes/               GET, POST
├── documents/
│   ├── /                         GET, POST
│   ├── {id}/                     GET, PUT, DELETE
│   ├── {id}/download/            GET - Descargar archivo
│   ├── {id}/download-token/      POST - Token seguro
│   ├── folders/                  CRUD carpetas
│   └── tags/                     CRUD etiquetas
├── appointments/                 CRUD estándar
├── tasks/                        CRUD estándar
├── emails/
│   ├── accounts/                 CRUD cuentas
│   └── messages/                 GET, POST
├── notifications/                GET, PATCH (mark read)
├── portal/
│   ├── auth/
│   │   ├── login/                POST
│   │   ├── logout/               POST
│   │   ├── refresh/              POST
│   │   └── me/                   GET
│   ├── cases/                    GET (solo propios)
│   ├── documents/                GET, POST
│   ├── messages/                 GET, POST
│   ├── appointments/             GET
│   └── notifications/            GET, PATCH
├── audit/                        GET (solo admin)
├── dashboard/
│   ├── widgets/                  GET
│   └── config/                   GET, PUT
├── preferences/                  GET, PUT - Preferencias usuario (ui_mode: full/light)
├── reports/                      GET, POST
├── workflows/                    CRUD
├── ai-agent/
│   ├── config/                   GET, PUT
│   ├── actions/                  GET, POST (approve)
│   └── insights/                 GET
└── search/                       GET - Búsqueda global
```

### Formato de Respuestas

#### Éxito
```json
{
  "id": "uuid",
  "field1": "value1",
  "created_at": "2026-02-08T10:00:00Z"
}
```

#### Lista Paginada
```json
{
  "count": 100,
  "next": "https://api/endpoint/?page=2",
  "previous": null,
  "results": [...]
}
```

#### Error
```json
{
  "detail": "Error message",
  "code": "error_code"
}
```

### Códigos de Estado

| Código | Uso |
|--------|-----|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 204 | No Content - Eliminado |
| 400 | Bad Request - Error de validación |
| 401 | Unauthorized - Sin autenticación |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - No existe |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Error interno |

---

## Autenticación y Autorización

### JWT Authentication (Staff)

```python
# Configuración SIMPLE_JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("JWT_SIGNING_KEY"),
}
```

#### Flujo de Autenticación

```
1. POST /api/v1/auth/login/
   Body: { "email": "...", "password": "..." }
   Response: { "access": "...", "refresh": "..." }

2. Usar access token:
   Header: Authorization: Bearer <access_token>

3. Refrescar token:
   POST /api/v1/auth/refresh/
   Body: { "refresh": "..." }
   Response: { "access": "...", "refresh": "..." }
```

### JWT Authentication (Portal)

```python
# Clave separada para portal
PORTAL_JWT_SIGNING_KEY = env("PORTAL_JWT_SIGNING_KEY")

# Claims del token portal
{
    "portal": True,
    "contact_id": "uuid",
    "portal_access_id": "uuid",
    "token_type": "access"
}
```

### Sistema de Permisos

```python
# Permisos por módulo
class ModulePermission(models.Model):
    role = models.ForeignKey(Role)
    module = models.CharField()  # contacts, cases, etc.
    can_view = models.BooleanField()
    can_create = models.BooleanField()
    can_edit = models.BooleanField()
    can_delete = models.BooleanField()

# Uso en ViewSet
class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ModulePermission]
    module_name = "contacts"
```

---

## Seguridad Implementada

### Resumen de Medidas de Seguridad

| Categoría | Implementación | Ubicación |
|-----------|----------------|-----------|
| **Autenticación** | JWT con refresh tokens | `apps.users` |
| **2FA** | TOTP (RFC 6238) | `apps.users` |
| **Contraseñas** | Argon2 + validadores | Django auth |
| **Encriptación PII** | Fernet (AES-128) | `apps.core.encryption` |
| **Rate Limiting** | DRF Throttling | `settings.base` |
| **CORS** | Whitelist de orígenes | `settings.base` |
| **Session Timeout** | 30 min inactividad | `apps.users.middleware` |
| **Sesiones Concurrentes** | 1 dispositivo | `apps.users.middleware` |
| **IP Blacklist/Whitelist** | Middleware | `apps.users.middleware` |
| **Auditoría** | Log de todas las acciones | `apps.audit` |
| **Download Tokens** | Tokens de un solo uso | `apps.documents` |
| **XSS Protection** | HTML escaping | `apps.webforms` |
| **CSRF** | Django CSRF middleware | Django |
| **SQL Injection** | ORM parametrizado | Django ORM |
| **Security Headers** | X-Frame, CSP, etc. | Next.js config |

### Encriptación de Campos PII

```python
# apps/core/encryption.py
from cryptography.fernet import Fernet

class EncryptedField:
    """Campo encriptado para datos sensibles como SSN"""

    def __init__(self, key):
        self.fernet = Fernet(key)

    def encrypt(self, value):
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt(self, value):
        return self.fernet.decrypt(value.encode()).decode()

# Uso en modelo
class Contact(models.Model):
    ssn_encrypted = models.CharField(max_length=255)

    @property
    def ssn(self):
        return decrypt_field(self.ssn_encrypted)

    @ssn.setter
    def ssn(self, value):
        self.ssn_encrypted = encrypt_field(value)
```

### Rate Limiting

```python
# settings/base.py
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "20/minute",
        "user": "200/minute",
        "login": "5/minute",
    },
}

# apps/portal/views.py - Rate limit personalizado
class PortalLoginThrottle(AnonRateThrottle):
    rate = "5/minute"

class PortalPasswordResetThrottle(AnonRateThrottle):
    rate = "3/hour"
```

### Tokens de Descarga Seguros

```python
# apps/documents/models.py
class DocumentDownloadToken(models.Model):
    """Token de un solo uso para descargas"""
    TOKEN_EXPIRY_MINUTES = 5

    token = models.CharField(max_length=64, unique=True)
    document = models.ForeignKey(Document)
    user = models.ForeignKey(User)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    @classmethod
    def create_token(cls, document, user):
        token = secrets.token_urlsafe(48)
        expires_at = timezone.now() + timedelta(minutes=cls.TOKEN_EXPIRY_MINUTES)
        return cls.objects.create(
            token=token,
            document=document,
            user=user,
            expires_at=expires_at
        )
```

### Auditoría

```python
# apps/audit/middleware.py
class AuditMiddleware:
    def __call__(self, request):
        response = self.get_response(request)

        if request.user.is_authenticated:
            AuditLog.objects.create(
                user=request.user,
                action=request.method,
                path=request.path,
                ip_address=get_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT"),
                status_code=response.status_code
            )

        return response
```

### Headers de Seguridad (Frontend)

```typescript
// next.config.ts
const nextConfig = {
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
```

---

## Procesamiento Asíncrono

### Configuración de Celery

```python
# config/celery.py
from celery import Celery

app = Celery("ebenezer_crm")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

### Tareas Programadas

```python
# settings/base.py
CELERY_BEAT_SCHEDULE = {
    "sync-all-email-accounts": {
        "task": "apps.emails.tasks.sync_all_accounts",
        "schedule": 300.0,  # 5 minutos
    },
    "process-appointment-reminders": {
        "task": "apps.appointments.tasks.process_appointment_reminders",
        "schedule": 900.0,  # 15 minutos
    },
    "run-scheduled-workflows": {
        "task": "apps.workflows.tasks.run_scheduled_workflows",
        "schedule": 300.0,
    },
    "ai-agent-cycle": {
        "task": "apps.ai_agent.tasks.run_agent_cycle",
        "schedule": 300.0,
    },
    "cleanup-expired-download-tokens": {
        "task": "apps.documents.tasks.cleanup_expired_download_tokens",
        "schedule": crontab(hour=3, minute=0),  # 3 AM diario
    },
}
```

### Ejemplo de Tarea

```python
# apps/appointments/tasks.py
from celery import shared_task

@shared_task
def process_appointment_reminders():
    """Envía recordatorios de citas próximas"""
    from apps.appointments.models import Appointment
    from apps.notifications.utils import send_notification

    # Citas en las próximas 24 horas
    upcoming = Appointment.objects.filter(
        start_datetime__gte=timezone.now(),
        start_datetime__lte=timezone.now() + timedelta(hours=24),
        reminder_sent=False
    )

    for apt in upcoming:
        send_notification(
            user=apt.contact.assigned_to,
            title=f"Recordatorio: {apt.title}",
            message=f"Cita mañana a las {apt.start_datetime}"
        )
        apt.reminder_sent = True
        apt.save()
```

---

## Integraciones

### Proveedores de IA

```python
# apps/chatbot/ai_service.py
class AIService:
    def __init__(self, provider="openai"):
        self.provider = provider
        if provider == "openai":
            self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        elif provider == "anthropic":
            self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def chat(self, messages, system_prompt=None):
        if self.provider == "openai":
            return self._openai_chat(messages, system_prompt)
        elif self.provider == "anthropic":
            return self._anthropic_chat(messages, system_prompt)
```

### Notificaciones Push (Expo)

```python
# apps/portal/notifications.py
import requests

def send_push_notification(expo_token, title, body, data=None):
    message = {
        "to": expo_token,
        "title": title,
        "body": body,
        "data": data or {},
    }

    response = requests.post(
        "https://exp.host/--/api/v2/push/send",
        json=message,
        headers={"Content-Type": "application/json"}
    )

    return response.json()
```

### Email (SMTP)

```python
# settings/base.py
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
```

---

## Frontend Web

### Estado Global (Zustand)

```typescript
// stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  tokens: { access: string; refresh: string } | null;
  user: User | null;
  setAuth: (tokens: Tokens, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tokens: null,
      user: null,
      setAuth: (tokens, user) => set({ tokens, user }),
      logout: () => set({ tokens: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### Cliente API

```typescript
// lib/api/index.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const { tokens } = useAuthStore.getState();
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Intentar refresh token
      // ...
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Aplicación Móvil

### Almacenamiento Seguro

```typescript
// utils/storage.ts
import * as SecureStore from 'expo-secure-store';

export async function storeAuthTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync('access_token', access);
  await SecureStore.setItemAsync('refresh_token', refresh);
}

export async function getAuthTokens() {
  const access = await SecureStore.getItemAsync('access_token');
  const refresh = await SecureStore.getItemAsync('refresh_token');
  return { accessToken: access, refreshToken: refresh };
}

export async function clearAuthData() {
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  await SecureStore.deleteItemAsync('user_data');
}
```

### Notificaciones Push

```typescript
// hooks/usePushNotifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerDevice } from '../api/notifications';

export function usePushNotifications() {
  const registerForPushNotifications = async () => {
    if (!Device.isDevice) return null;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId
    });

    // Registrar token en backend
    await registerDevice({ token: token.data });

    return token.data;
  };

  return { registerForPushNotifications };
}
```

---

## Testing

### Backend Tests

```bash
# Ejecutar todos los tests
pytest

# Tests de una app específica
pytest apps/contacts/tests/

# Con cobertura
pytest --cov=apps

# Verbose
pytest -v
```

### Estructura de Tests

```python
# apps/contacts/tests/test_views.py
import pytest
from rest_framework.test import APIClient
from apps.contacts.factories import ContactFactory
from apps.users.factories import UserFactory

@pytest.mark.django_db
class TestContactViewSet:
    def test_list_contacts(self):
        user = UserFactory(role__name="Admin")
        ContactFactory.create_batch(5)

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.get("/api/v1/contacts/")

        assert response.status_code == 200
        assert response.data["count"] == 5

    def test_create_contact(self):
        user = UserFactory(role__name="Admin")

        client = APIClient()
        client.force_authenticate(user=user)

        data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com"
        }

        response = client.post("/api/v1/contacts/", data)

        assert response.status_code == 201
        assert response.data["email"] == "john@example.com"
```

### Frontend Tests

```bash
# Jest tests
npm test

# E2E con Playwright
npm run test:e2e
```

---

## Despliegue

### Docker Compose (Producción)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    build:
      context: ./CRM Back end
      dockerfile: Dockerfile.prod
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings.production
    env_file:
      - .env.prod
    depends_on:
      - db
      - redis
    restart: always

  celery:
    build:
      context: ./CRM Back end
    command: celery -A config worker --loglevel=info
    env_file:
      - .env.prod
    depends_on:
      - backend
      - redis
    restart: always

  celery-beat:
    build:
      context: ./CRM Back end
    command: celery -A config beat --loglevel=info
    env_file:
      - .env.prod
    depends_on:
      - backend
      - redis
    restart: always

  frontend:
    build:
      context: ./CRM Front end
      dockerfile: Dockerfile.prod
    environment:
      - NEXT_PUBLIC_API_URL=https://api.dominio.com/api/v1
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    restart: always

  db:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=ebenezer_crm
      - POSTGRES_USER=ebenezer
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    restart: always

  redis:
    image: redis:7-alpine
    restart: always

volumes:
  postgres_data:
```

### Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] SECRET_KEY único y seguro
- [ ] DEBUG=False
- [ ] ALLOWED_HOSTS configurado
- [ ] HTTPS habilitado
- [ ] Backups automatizados
- [ ] Monitoreo configurado
- [ ] Logs centralizados
- [ ] Rate limiting activo
- [ ] CORS restringido

---

## Monitoreo y Mantenimiento

### Comandos de Mantenimiento

```bash
# Limpiar sesiones expiradas
python manage.py clearsessions

# Limpiar tokens JWT expirados
python manage.py flushexpiredtokens

# Verificar configuración de producción
python manage.py check --deploy

# Verificar integridad de base de datos
python manage.py dbshell
> \dt  # Listar tablas
> SELECT COUNT(*) FROM crm_contacts;
```

### Logs Importantes

| Log | Ubicación | Contenido |
|-----|-----------|-----------|
| Django | `/var/log/ebenezer/django.log` | Errores de aplicación |
| Celery | `/var/log/ebenezer/celery.log` | Tareas async |
| Nginx | `/var/log/nginx/access.log` | Accesos HTTP |
| PostgreSQL | `/var/log/postgresql/` | Queries lentas |

### Métricas a Monitorear

- Tiempo de respuesta API
- Uso de CPU/RAM
- Conexiones de base de datos
- Cola de tareas Celery
- Tasa de errores 5xx
- Tokens JWT activos

---

**© 2026 Ebenezer Tax Services. Documento Confidencial.**
