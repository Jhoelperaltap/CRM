from .base import *  # noqa: F401,F403

DEBUG = True

# Allow local network access for development
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "192.168.20.159",
    "192.168.1.156",
    "0.0.0.0",
    # Allow all hosts in development (for testing from other devices)
    "*",
]

INSTALLED_APPS += ["debug_toolbar"]  # noqa: F405

MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405

INTERNAL_IPS = ["127.0.0.1"]

# Use in-memory cache for development (no Redis dependency)
CACHES = {  # noqa: F405
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

# Relax throttling for development
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "1000/minute",
    "user": "5000/minute",
    "login": "100/minute",
    "password_reset": "100/minute",
    "two_factor": "100/minute",
    "file_upload": "1000/hour",
    "bulk_operation": "100/hour",
    "sensitive_data": "1000/minute",
    "admin_operation": "500/minute",
    "api_key_operation": "100/hour",
    "email_send": "1000/hour",
    "report_generation": "100/hour",
}

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Allow CORS from local network
CORS_ALLOWED_ORIGINS = [  # noqa: F405
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.20.159:3000",
    "http://192.168.1.156:3000",
]
CORS_ALLOW_ALL_ORIGINS = True  # Allow all origins in development
