import pytest
from unittest.mock import patch

from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from tests.factories import NotificationPreferenceFactory, UserFactory


@pytest.mark.django_db
class TestCreateNotification:
    def test_creates_notification_default_prefs(self):
        user = UserFactory()
        notif = create_notification(
            recipient=user,
            notification_type="system",
            title="Test",
            message="Hello",
        )
        assert notif is not None
        assert notif.recipient == user
        assert notif.title == "Test"
        assert Notification.objects.filter(recipient=user).count() == 1

    def test_respects_disabled_in_app(self):
        user = UserFactory()
        NotificationPreferenceFactory(
            user=user,
            notification_type="system",
            in_app_enabled=False,
            email_enabled=False,
        )
        notif = create_notification(
            recipient=user,
            notification_type="system",
            title="Suppressed",
        )
        assert notif is None
        assert Notification.objects.filter(recipient=user).count() == 0

    @patch("apps.notifications.tasks.send_notification_email")
    def test_queues_email_when_enabled(self, mock_email):
        user = UserFactory()
        NotificationPreferenceFactory(
            user=user,
            notification_type="system",
            in_app_enabled=True,
            email_enabled=True,
        )
        notif = create_notification(
            recipient=user,
            notification_type="system",
            title="Email Test",
        )
        assert notif is not None
        mock_email.delay.assert_called_once()

    def test_related_object_stored(self):
        user = UserFactory()
        from tests.factories import TaxCaseFactory
        case = TaxCaseFactory()
        notif = create_notification(
            recipient=user,
            notification_type="case_status_changed",
            title="Case Updated",
            related_object=case,
        )
        assert notif.related_object_type == "taxcase"
        assert notif.related_object_id == case.pk
