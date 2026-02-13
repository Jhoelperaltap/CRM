from django.apps import AppConfig


class CorporationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.corporations"
    verbose_name = "Corporations"

    def ready(self):
        import apps.corporations.signals  # noqa: F401
