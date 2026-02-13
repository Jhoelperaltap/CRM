import pytest

from tests.factories import NotificationFactory, NotificationPreferenceFactory, UserFactory


@pytest.mark.django_db
class TestNotificationModel:
    def test_create_notification(self):
        notif = NotificationFactory()
        assert notif.pk is not None
        assert notif.is_read is False
        assert notif.severity == "info"

    def test_str_representation(self):
        notif = NotificationFactory(title="Test Alert", severity="warning")
        assert "warning" in str(notif).lower()
        assert "Test Alert" in str(notif)

    def test_ordering_newest_first(self):
        user = UserFactory()
        NotificationFactory(recipient=user, title="First")
        n2 = NotificationFactory(recipient=user, title="Second")
        from apps.notifications.models import Notification
        notifs = list(Notification.objects.filter(recipient=user))
        assert notifs[0].pk == n2.pk


@pytest.mark.django_db
class TestNotificationPreferenceModel:
    def test_create_preference(self):
        pref = NotificationPreferenceFactory()
        assert pref.in_app_enabled is True
        assert pref.email_enabled is False

    def test_unique_constraint(self):
        user = UserFactory()
        NotificationPreferenceFactory(user=user, notification_type="system")
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            NotificationPreferenceFactory(user=user, notification_type="system")
