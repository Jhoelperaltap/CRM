import pytest
from rest_framework import status

from tests.factories import NotificationFactory, UserFactory


NOTIFICATIONS_BASE = "/api/v1/notifications/"
PREFERENCES_BASE = "/api/v1/notifications/preferences/"


@pytest.mark.django_db
class TestNotificationList:
    def test_list_own_notifications(self, authenticated_client, preparer_user):
        NotificationFactory.create_batch(3, recipient=preparer_user)
        resp = authenticated_client.get(NOTIFICATIONS_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 3

    def test_cannot_see_others_notifications(self, authenticated_client, preparer_user):
        other_user = UserFactory()
        NotificationFactory(recipient=other_user)
        NotificationFactory(recipient=preparer_user)
        resp = authenticated_client.get(NOTIFICATIONS_BASE)
        assert resp.data["count"] == 1

    def test_filter_by_is_read(self, authenticated_client, preparer_user):
        NotificationFactory(recipient=preparer_user, is_read=False)
        NotificationFactory(recipient=preparer_user, is_read=True)
        resp = authenticated_client.get(f"{NOTIFICATIONS_BASE}?is_read=false")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(NOTIFICATIONS_BASE)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestNotificationActions:
    def test_mark_read(self, authenticated_client, preparer_user):
        notif = NotificationFactory(recipient=preparer_user, is_read=False)
        resp = authenticated_client.post(f"{NOTIFICATIONS_BASE}{notif.id}/mark-read/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_read"] is True

    def test_mark_all_read(self, authenticated_client, preparer_user):
        NotificationFactory.create_batch(5, recipient=preparer_user, is_read=False)
        resp = authenticated_client.post(f"{NOTIFICATIONS_BASE}mark-all-read/")
        assert resp.status_code == status.HTTP_200_OK
        from apps.notifications.models import Notification

        assert (
            Notification.objects.filter(recipient=preparer_user, is_read=False).count()
            == 0
        )

    def test_unread_count(self, authenticated_client, preparer_user):
        NotificationFactory.create_batch(3, recipient=preparer_user, is_read=False)
        NotificationFactory(recipient=preparer_user, is_read=True)
        resp = authenticated_client.get(f"{NOTIFICATIONS_BASE}unread-count/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 3


@pytest.mark.django_db
class TestNotificationPreferences:
    def test_get_preferences(self, authenticated_client):
        resp = authenticated_client.get(PREFERENCES_BASE)
        assert resp.status_code == status.HTTP_200_OK

    def test_update_preferences(self, authenticated_client):
        resp = authenticated_client.get(PREFERENCES_BASE)
        assert resp.status_code == status.HTTP_200_OK
