from datetime import timedelta
from pathlib import Path

import environ
from celery.schedules import crontab

env = environ.Env()

BASE_DIR = Path(__file__).resolve().parent.parent.parent

environ.Env.read_env(BASE_DIR / ".env", overwrite=False)

# ---------------------------------------------------------------------------
# SECURITY CONFIGURATION
# ---------------------------------------------------------------------------

DEBUG = env.bool("DEBUG", default=False)

# SECRET_KEY: Required in production, insecure default only for development
_default_secret = "django-insecure-dev-only-change-in-production-abc123"
SECRET_KEY = env("SECRET_KEY", default=_default_secret)

# Security validation for production
if not DEBUG:
    if SECRET_KEY == _default_secret:
        raise ValueError(
            "SECURITY ERROR: SECRET_KEY must be set in production! "
            'Generate one with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
        )
    if len(SECRET_KEY) < 50:
        import warnings

        warnings.warn(
            "SECRET_KEY should be at least 50 characters for security", UserWarning
        )

# Field encryption key for PII data
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", default="")

# Document encryption key for files at rest (32 bytes, base64-encoded)
# Generate with: python -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
DOCUMENT_ENCRYPTION_KEY = env("DOCUMENT_ENCRYPTION_KEY", default="")

# Allowed hosts configuration
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Security check for production
if not DEBUG and ALLOWED_HOSTS == ["localhost", "127.0.0.1"]:
    import warnings

    warnings.warn("ALLOWED_HOSTS should be configured in production!", UserWarning)

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "django_celery_beat",
    "django_celery_results",
    "drf_spectacular",
]

LOCAL_APPS = [
    "apps.core",
    "apps.users",
    "apps.contacts",
    "apps.corporations",
    "apps.cases",
    "apps.dashboard",
    "apps.audit",
    "apps.appointments",
    "apps.documents",
    "apps.tasks",
    "apps.emails",
    "apps.notifications",
    "apps.workflows",
    "apps.portal",
    "apps.quotes",
    "apps.module_config",
    "apps.internal_tickets",
    "apps.sales_insights",
    "apps.forecasts",
    "apps.reports",
    "apps.esign",
    "apps.approvals",
    "apps.inventory",
    "apps.webforms",
    "apps.business_hours",
    "apps.activities",
    "apps.chatbot",
    "apps.ai_agent",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.APIVersioningMiddleware",
    "apps.core.middleware.RequestMetadataMiddleware",
    "apps.audit.middleware.AuditMiddleware",
    "apps.users.middleware.BlockedIPMiddleware",
    "apps.users.middleware.IPWhitelistMiddleware",
    "apps.users.middleware.SessionTimeoutMiddleware",
    "apps.users.middleware.ConcurrentSessionMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},  # Increased from default 8
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {
        "NAME": "apps.users.password_validators.PasswordComplexityValidator",
        "OPTIONS": {
            "require_uppercase": True,
            "require_lowercase": True,
            "require_digit": True,
            "require_special": True,
            "min_unique_chars": 4,
        },
    },
    {"NAME": "apps.users.password_validators.PasswordHistoryValidator"},
]

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://ebenezer:ebenezer_dev_2025@localhost:5432/ebenezer_crm",
    )
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/0"),
    }
}

# ---------------------------------------------------------------------------
# Celery
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = "django-db"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "America/New_York"

CELERY_BEAT_SCHEDULE = {
    "sync-all-email-accounts": {
        "task": "apps.emails.tasks.sync_all_accounts",
        "schedule": 300.0,  # every 5 minutes
    },
    "check-unassigned-emails": {
        "task": "apps.emails.tasks.check_unassigned_emails",
        "schedule": 1800.0,  # every 30 minutes
    },
    "check-no-reply-emails": {
        "task": "apps.emails.tasks.check_no_reply_emails",
        "schedule": 86400.0,  # daily
    },
    "run-scheduled-workflows": {
        "task": "apps.workflows.tasks.run_scheduled_workflows",
        "schedule": 300.0,  # every 5 minutes
    },
    "process-appointment-reminders": {
        "task": "apps.appointments.tasks.process_appointment_reminders",
        "schedule": 900.0,  # every 15 minutes
    },
    "generate-recurring-appointments": {
        "task": "apps.appointments.tasks.generate_recurring_instances",
        "schedule": crontab(hour=1, minute=0),
    },
    # AI Agent tasks
    "ai-agent-cycle": {
        "task": "apps.ai_agent.tasks.run_agent_cycle",
        "schedule": 300.0,  # every 5 minutes
    },
    "ai-agent-daily-insights": {
        "task": "apps.ai_agent.tasks.generate_daily_insights",
        "schedule": crontab(hour=6, minute=0),  # daily at 6 AM
    },
    "ai-agent-update-metrics": {
        "task": "apps.ai_agent.tasks.update_metrics",
        "schedule": crontab(hour=23, minute=55),  # daily at 11:55 PM
    },
    "ai-agent-cleanup-logs": {
        "task": "apps.ai_agent.tasks.cleanup_old_logs",
        "schedule": crontab(
            hour=2, minute=0, day_of_week=0
        ),  # weekly on Sunday at 2 AM
    },
    # Security cleanup tasks
    "cleanup-expired-download-tokens": {
        "task": "apps.documents.tasks.cleanup_expired_download_tokens",
        "schedule": crontab(hour=3, minute=0),  # daily at 3 AM
    },
}

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/New_York"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & Media
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        # Custom JWT auth that reads from httpOnly cookies (XSS protection)
        # Falls back to Authorization header for mobile apps
        "apps.users.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardResultsSetPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # Global rates
        "anon": "20/minute",
        "user": "200/minute",
        # Authentication rates (stricter to prevent brute force)
        "login": "5/minute",
        "password_reset": "3/minute",
        "two_factor": "10/minute",
        # Operation-specific rates
        "file_upload": "30/hour",
        "bulk_operation": "10/hour",
        "sensitive_data": "60/minute",
        "admin_operation": "30/minute",
        "api_key_operation": "5/hour",
        "email_send": "50/hour",
        "report_generation": "20/hour",
    },
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env(
        "JWT_SIGNING_KEY", default="jwt-secret-change-in-production-key-32bytes"
    ),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_OBTAIN_SERIALIZER": "apps.users.serializers.CustomTokenObtainPairSerializer",
}

# ---------------------------------------------------------------------------
# Portal JWT (separate key for client portal - SECURITY)
# ---------------------------------------------------------------------------
# SECURITY: Portal uses a separate signing key to prevent privilege escalation.
# Even if a portal token is compromised, it cannot be used to access staff APIs.
# NOTE: Defaults to staff JWT key for backwards compatibility during development.
# In PRODUCTION, set a DIFFERENT key via PORTAL_JWT_SIGNING_KEY environment variable!
PORTAL_JWT_SIGNING_KEY = env(
    "PORTAL_JWT_SIGNING_KEY",
    default=SIMPLE_JWT[
        "SIGNING_KEY"
    ],  # Default to staff key for dev backwards compatibility
)

# Security validation for production
if not DEBUG:
    if PORTAL_JWT_SIGNING_KEY == "portal-jwt-secret-change-in-production-key-32b":
        import warnings

        warnings.warn(
            "PORTAL_JWT_SIGNING_KEY should be set in production! "
            'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"',
            UserWarning,
        )

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:8083",
        "http://localhost:19000",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:19006",
    ],
)
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
# For development - allow all origins (comment out in production)
# SECURITY: Default to False - only allow specified origins
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)

# ---------------------------------------------------------------------------
# DRF Spectacular (OpenAPI docs)
# ---------------------------------------------------------------------------
SPECTACULAR_SETTINGS = {
    "TITLE": "Ebenezer Tax Services CRM API",
    "DESCRIPTION": "REST API for the Ebenezer Tax Services CRM system",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------
# Structured logging for production (JSON format for ELK/Loki/Datadog)
# Console logging for development
LOG_LEVEL = env("LOG_LEVEL", default="INFO")
LOG_FORMAT = env("LOG_FORMAT", default="json" if not DEBUG else "console")
# Set to True to enable SQL query logging (very verbose)
LOG_SQL_QUERIES = env.bool("LOG_SQL_QUERIES", default=False)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "apps.core.logging.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        },
        "console": {
            "format": "[%(asctime)s] %(levelname)s [%(name)s:%(lineno)s] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "simple": {
            "format": "%(levelname)s %(message)s",
        },
    },
    "filters": {
        "require_debug_false": {
            "()": "django.utils.log.RequireDebugFalse",
        },
        "require_debug_true": {
            "()": "django.utils.log.RequireDebugTrue",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": LOG_FORMAT,
        },
        "file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "app.log",
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "backupCount": 5,
            "formatter": "json",
        },
        "security_file": {
            "level": "INFO",
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "security.log",
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "backupCount": 10,
            "formatter": "json",
        },
        "mail_admins": {
            "level": "ERROR",
            "filters": ["require_debug_false"],
            "class": "django.utils.log.AdminEmailHandler",
            "include_html": True,
        },
    },
    "loggers": {
        # Django loggers
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console", "file"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.server": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "security_file"],
            "level": "INFO",
            "propagate": False,
        },
        "django.db.backends": {
            "handlers": ["console"],
            "level": "DEBUG" if LOG_SQL_QUERIES else "WARNING",
            "propagate": False,
        },
        "django.db.backends.schema": {
            "handlers": ["console"],
            "level": "DEBUG" if LOG_SQL_QUERIES else "WARNING",
            "propagate": False,
        },
        # Application loggers
        "apps": {
            "handlers": ["console", "file"],
            "level": LOG_LEVEL,
            "propagate": False,
        },
        "apps.audit": {
            "handlers": ["console", "security_file"],
            "level": "INFO",
            "propagate": False,
        },
        "apps.users": {
            "handlers": ["console", "security_file"],
            "level": "INFO",
            "propagate": False,
        },
        "apps.portal": {
            "handlers": ["console", "security_file"],
            "level": "INFO",
            "propagate": False,
        },
        # Celery loggers
        "celery": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "celery.task": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        # Security events
        "security": {
            "handlers": ["console", "security_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
}
