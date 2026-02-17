# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EJFLOW** — An enterprise CRM platform with a Django REST Framework backend and Next.js frontend. The backend lives in `CRM Back end/`, the frontend in `CRM Front end/`.

### Branding
- **Platform**: EJFLOW (registered trademark)
- **Mobile App**: EJFLOW Client
- **Logo**: "EJ" with blue gradient (#2563eb to #1d4ed8)
- **Branding Config**: `CRM Front end/src/config/branding.ts`

## Common Commands

All backend commands run from `CRM Back end/`.

### Docker (recommended)

```bash
docker-compose up -d                          # Start all services
docker-compose up -d db redis backend         # Backend only
docker-compose --profile production up        # With nginx reverse proxy
```

### Running locally (without Docker)

```bash
pip install -r requirements/development.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
celery -A config worker --loglevel=info       # Separate terminal
celery -A config beat --loglevel=info         # Separate terminal
```

### Testing

```bash
pytest                            # Run all tests (uses SQLite in-memory, no external deps)
pytest apps/users/tests/          # Single app
pytest apps/contacts/tests/test_views.py  # Single file
pytest -k test_name               # Single test by name
pytest --cov=apps                 # With coverage
```

pytest.ini defaults: `--reuse-db --tb=short -q` with `DJANGO_SETTINGS_MODULE=config.settings.test`.

### Frontend Testing (E2E)

```bash
cd "CRM Front end"
npm run test:e2e                  # Run Playwright E2E tests
```

### Linting & Formatting

```bash
black apps/ config/               # Format
ruff check apps/ config/          # Lint
ruff check --select I --fix apps/ # Fix import sorting
```

## Architecture

### Backend Structure

```
CRM Back end/
├── config/                  # Django project config
│   ├── settings/
│   │   ├── base.py         # All shared configuration
│   │   ├── development.py  # Dev overrides
│   │   ├── production.py   # Prod overrides (Gunicorn, strict security)
│   │   └── test.py         # SQLite in-memory, no throttling, eager Celery
│   ├── urls.py             # Root URL routing — all API under /api/v1/
│   └── celery.py           # Celery app configuration
├── apps/
│   ├── core/               # Shared utilities: pagination, exceptions, base models
│   ├── users/              # Custom User model (email-based auth), Role, ModulePermission
│   ├── contacts/           # Contact CRUD, CSV import/export, star/favorite
│   ├── corporations/       # Corporation/business entity management
│   ├── cases/              # TaxCase and TaxCaseNote — central domain entity
│   ├── dashboard/          # Dashboard widgets, user preferences
│   └── audit/              # Audit logging middleware and endpoints
└── requirements/
    ├── base.txt            # Core deps (Django 5.1, DRF, simplejwt, celery, etc.)
    └── development.txt     # Dev tools (pytest-django, black, ruff, factory-boy, etc.)
```

### Frontend Structure

```
CRM Front end/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── portal/             # Client portal (EJFLOW Client)
│   │   └── login/              # Authentication pages
│   ├── components/
│   │   ├── layout/
│   │   │   ├── mega-menu-sidebar.tsx  # VTiger-style navigation
│   │   │   ├── sidebar.tsx            # Classic sidebar (fallback)
│   │   │   └── topbar.tsx             # Header with branding
│   │   ├── auth/               # Login, 2FA components
│   │   └── ui/                 # shadcn/ui components
│   ├── config/
│   │   └── branding.ts         # Centralized branding configuration
│   ├── stores/                 # Zustand state stores
│   └── lib/                    # API clients, utilities
├── e2e/                        # Playwright E2E tests
│   ├── auth.spec.ts            # Authentication tests
│   └── navigation.spec.ts      # Navigation tests
└── public/                     # Static assets
```

### Key Design Decisions

- **UUID primary keys** on all models for distributed system compatibility
- **Email as login field** — custom `AbstractUser` with `USERNAME_FIELD = "email"`
- **Role-based permissions** — 4 roles (Admin, Manager, Preparer, Receptionist) with per-module CRUD flags via `ModulePermission`
- **JWT authentication** — `djangorestframework-simplejwt` with access/refresh tokens
- **TimeStampedModel** base class — all domain models inherit `created_at`/`updated_at`
- **Settings split** — `base.py` has all config; env-specific files only override what differs
- **Test settings** use SQLite in-memory, MD5 hasher for speed, eager Celery, no throttling
- **VTiger-style navigation** — Mega menu sidebar with flyout panels

### API Layout

All endpoints under `/api/v1/`. Key route groups:

| Prefix | App | Purpose |
|--------|-----|---------|
| `/api/v1/auth/` | users (urls_auth) | Login, logout, password change |
| `/api/v1/users/` | users | User CRUD, `/me/` profile |
| `/api/v1/roles/` | users (urls_roles) | Role list, permission management |
| `/api/v1/contacts/` | contacts | Contact CRUD, `/star/`, `/import_csv/`, `/export_csv/` |
| `/api/v1/corporations/` | corporations | Corporation CRUD |
| `/api/v1/cases/` | cases | TaxCase CRUD, nested `/notes/` |
| `/api/v1/dashboard/` | dashboard | Analytics widgets, `/config/` |
| `/api/v1/preferences/` | dashboard (urls_preferences) | User theme/sidebar settings |
| `/api/v1/audit/` | audit | Audit logs |
| `/api/v1/search/` | core | Global search |
| `/api/docs/` | — | Swagger UI |

### Infrastructure

- **PostgreSQL 16** (data), **Redis 7** (cache on db 0, Celery broker on db 1)
- **Celery** workers for async tasks, **Celery Beat** with `DatabaseScheduler` for scheduled jobs
- **Nginx** reverse proxy available under `production` Docker Compose profile
- Frontend connects to backend at `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

### Rate Limiting

- Anonymous: 20/min, Authenticated: 200/min, Login: 5/min
- Disabled in test settings

## UI/UX Guidelines

### Mega Menu Sidebar
The application uses a VTiger-style mega menu sidebar:
- **Desktop**: Narrow icon bar (68px) with flyout panels on hover
- **Mobile**: Full-width drawer
- **Features**: Pin/unpin panels, multi-column categories, blue gradient theme

### Branding
All branding is centralized in `src/config/branding.ts`:
```typescript
export const branding = {
  platform: { name: "EJFLOW", shortName: "EJF" },
  client: { name: "Client Name" },  // Customizable
};
```

### Theme
- Blue gradient sidebar: `from-[#1e5a99] via-[#336daa] to-[#4887bf]`
- Logo gradient: `from-blue-600 to-blue-700`
- Supports dark/light mode
