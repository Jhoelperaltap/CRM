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
_is_ci = os.environ.get("CI") == "true"

if _database_url and _is_ci:
    # Parse DATABASE_URL manually to ensure correct credentials
    # Format: postgresql://user:password@host:port/dbname
    from urllib.parse import urlparse
    _parsed = urlparse(_database_url)

    # Extract credentials with explicit defaults
    _db_user = _parsed.username if _parsed.username else "test_user"
    _db_pass = _parsed.password if _parsed.password else "test_password"
    _db_name = _parsed.path.lstrip("/") if _parsed.path else "test_db"
    _db_host = _parsed.hostname if _parsed.hostname else "localhost"
    _db_port = str(_parsed.port) if _parsed.port else "5432"

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _db_name,
            "USER": _db_user,
            "PASSWORD": _db_pass,
            "HOST": _db_host,
            "PORT": _db_port,
            "CONN_MAX_AGE": 0,
            "OPTIONS": {
                "connect_timeout": 10,
            },
        }
    }
elif _is_ci:
    # CI but no DATABASE_URL - use explicit defaults
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": "test_db",
            "USER": "test_user",
            "PASSWORD": "test_password",
            "HOST": "localhost",
            "PORT": "5432",
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
