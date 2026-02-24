import os

from .base import *  # noqa: F401,F403

DEBUG = False
TESTING = True

# Disable file logging in tests - use console only
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {
            "format": "%(levelname)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "level": "WARNING",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

# Use PostgreSQL in CI (GitHub Actions), otherwise use SQLite for local tests
_database_url = os.environ.get("DATABASE_URL")

if _database_url:
    # Parse DATABASE_URL manually to ensure correct credentials
    # Format: postgresql://user:password@host:port/dbname
    from urllib.parse import urlparse
    _parsed = urlparse(_database_url)

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _parsed.path.lstrip("/"),
            "USER": _parsed.username or "test_user",
            "PASSWORD": _parsed.password or "test_password",
            "HOST": _parsed.hostname or "localhost",
            "PORT": str(_parsed.port or 5432),
        }
    }
else:
    # Use SQLite in-memory for local testing (fast, no external deps)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []  # noqa: F405

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
