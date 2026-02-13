from .base import *  # noqa: F401,F403

DEBUG = False

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Sentry
import sentry_sdk  # noqa: E402

sentry_sdk.init(
    dsn=env("SENTRY_DSN", default=""),  # noqa: F405
    traces_sample_rate=0.1,
)
