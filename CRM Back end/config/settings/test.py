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
# Check for CI environment variable which GitHub Actions sets to "true"
_is_ci = os.environ.get("CI") == "true"

if _is_ci:
    # Explicit PostgreSQL configuration for CI - don't rely on DATABASE_URL parsing
    # This prevents any fallback to system defaults (like 'root' user)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "test_db"),
            "USER": os.environ.get("POSTGRES_USER", "test_user"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "test_password"),
            "HOST": os.environ.get("POSTGRES_HOST", "localhost"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
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
