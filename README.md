# EJFLOW

**Enterprise CRM Platform** - A full-stack tax management CRM system with Django REST Framework backend, Next.js frontend, and React Native mobile app (EJFLOW Client).

## Branding

- **Platform Name**: EJFLOW
- **Mobile App**: EJFLOW Client
- **Logo**: "EJ" with blue gradient

The platform supports white-labeling, allowing clients to customize their organization name while maintaining the EJFLOW branding. Branding configuration is centralized in `CRM Front end/src/config/branding.ts`.

## Tech Stack

### Backend
- **Framework**: Django 5.1 + Django REST Framework
- **Database**: PostgreSQL 16
- **Cache/Broker**: Redis 7
- **Task Queue**: Celery + Celery Beat
- **Authentication**: JWT (SimpleJWT)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query
- **Navigation**: VTiger-style Mega Menu Sidebar

### Mobile
- **Framework**: React Native (Expo)
- **UI**: React Native Paper
- **App Name**: EJFLOW Client

## Project Structure

```
EJFLOW/
├── CRM Back end/     # Django REST API
├── CRM Front end/    # Next.js web application
├── crm-mobile/       # React Native mobile app (EJFLOW Client)
└── docs/             # Documentation
```

## Quick Start

### Backend

```bash
cd "CRM Back end"
pip install -r requirements/development.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd "CRM Front end"
npm install
npm run dev
```

### Mobile

```bash
cd crm-mobile
npm install
npx expo start
```

## Docker

```bash
docker-compose up -d
```

## Features

### Core CRM
- Contact & Corporation Management
- Tax Case Tracking
- Appointment Scheduling with Calendar
- Document Management with E-Signatures
- Email Integration
- Task Management

### Analytics & AI
- AI Agent for Automation
- Sales Insights & Forecasting
- Custom Reports
- Dashboard Widgets

### Security & Administration
- Role-based Access Control (Admin, Manager, Preparer, Receptionist)
- Two-Factor Authentication (2FA)
- Audit Logging
- Session Management

### User Experience
- VTiger-style Mega Menu Sidebar with flyout panels
- Pin/unpin navigation panels
- Mobile-responsive design
- Dark/Light theme support
- Client Portal (EJFLOW Client)

## UI Components

### Mega Menu Sidebar
The application features a modern VTiger-style sidebar with:
- Narrow icon bar (68px) on desktop
- Flyout panels with multi-column category layout
- Pin functionality for keeping panels open
- Mobile drawer support
- Blue gradient theme

### Branding Configuration
```typescript
// CRM Front end/src/config/branding.ts
export const branding = {
  platform: {
    name: "EJFLOW",
    shortName: "EJF",
    tagline: "Enterprise CRM Platform",
  },
  client: {
    name: "Your Company Name", // Customizable per installation
  },
};
```

## License

MIT License - see [LICENSE](LICENSE) for details.
