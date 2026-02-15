from django.apps import AppConfig


class CasesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.cases"
    verbose_name = "Tax Cases"

    def ready(self):
        import apps.cases.checklist_signals  # noqa: F401
        import apps.cases.signals  # noqa: F401
