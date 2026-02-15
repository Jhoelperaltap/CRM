from django.apps import AppConfig


class VideoMeetingsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.video_meetings"
    verbose_name = "Video Meetings"

    def ready(self):
        try:
            import apps.video_meetings.signals  # noqa
        except ImportError:
            pass
