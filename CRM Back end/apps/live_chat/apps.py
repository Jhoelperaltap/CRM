from django.apps import AppConfig


class LiveChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.live_chat"
    verbose_name = "Live Chat"

    def ready(self):
        import apps.live_chat.signals  # noqa: F401
