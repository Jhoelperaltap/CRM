from django.apps import AppConfig


class ModuleConfigConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.module_config"
    verbose_name = "Module Configuration"
