# Ebenezer Tax Services CRM

A full-stack tax management CRM system with Django REST Framework backend, Next.js frontend, and React Native mobile app.

## Tech Stack

### Backend
- **Framework**: Django 5.1 + Django REST Framework
- **Database**: PostgreSQL 16
- **Cache/Broker**: Redis 7
- **Task Queue**: Celery + Celery Beat
- **Authentication**: JWT (SimpleJWT)

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand + TanStack Query

### Mobile
- **Framework**: React Native (Expo)
- **UI**: React Native Paper

## Project Structure

```
CRM/
├── CRM Back end/     # Django REST API
├── CRM Front end/    # Next.js web application
├── crm-mobile/       # React Native mobile app
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

- Contact & Corporation Management
- Tax Case Tracking
- Appointment Scheduling with Calendar
- Document Management with E-Signatures
- Email Integration
- Task Management
- AI Agent for Automation
- Sales Insights & Forecasting
- Role-based Access Control
- Audit Logging
- Client Portal

## License

MIT License - see [LICENSE](LICENSE) for details.
