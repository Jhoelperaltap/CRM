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
    # Use DATABASE_URL in CI - this is the most reliable way to configure PostgreSQL
    # django-environ parses the URL and extracts all connection parameters
    import environ
    env = environ.Env()
    DATABASES = {
        "default": env.db_url("DATABASE_URL"),
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
