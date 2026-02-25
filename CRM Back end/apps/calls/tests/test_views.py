"""
Tests for calls API views.
"""

import pytest
from django.utils import timezone
from rest_framework import status

from apps.calls.models import Call, CallSettings, Voicemail
from tests.factories import (
    CallFactory,
    CallQueueFactory,
    CallQueueMemberFactory,
    CallScriptFactory,
    PhoneLineFactory,
    TelephonyProviderFactory,
    UserFactory,
    VoicemailFactory,
)

BASE_CALLS = "/api/v1/calls/"


@pytest.mark.django_db
class TestTelephonyProviderViewSet:
    """Tests for TelephonyProviderViewSet."""

    def test_list_providers(self, admin_client):
        TelephonyProviderFactory(name="Twilio")
        TelephonyProviderFactory(name="RingCentral")

        resp = admin_client.get(f"{BASE_CALLS}providers/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_create_provider(self, admin_client):
        resp = admin_client.post(
            f"{BASE_CALLS}providers/",
            {
                "name": "New Provider",
                "provider_type": "twilio",
                "account_sid": "test123",
                "auth_token": "secret",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Provider"

    def test_set_default(self, admin_client):
        provider1 = TelephonyProviderFactory(is_default=True)
        provider2 = TelephonyProviderFactory(is_default=False)

        resp = admin_client.post(f"{BASE_CALLS}providers/{provider2.id}/set_default/")
        assert resp.status_code == status.HTTP_200_OK

        provider1.refresh_from_db()
        provider2.refresh_from_db()
        assert provider1.is_default is False
        assert provider2.is_default is True

    def test_test_connection(self, admin_client):
        provider = TelephonyProviderFactory()
        resp = admin_client.post(
            f"{BASE_CALLS}providers/{provider.id}/test_connection/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "success"


@pytest.mark.django_db
class TestPhoneLineViewSet:
    """Tests for PhoneLineViewSet."""

    def test_list_lines(self, admin_client):
        PhoneLineFactory()
        PhoneLineFactory()

        resp = admin_client.get(f"{BASE_CALLS}lines/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_my_lines(self, admin_client, admin_user):
        PhoneLineFactory(assigned_user=admin_user)
        PhoneLineFactory(assigned_user=admin_user)
        PhoneLineFactory()  # Not assigned to admin

        resp = admin_client.get(f"{BASE_CALLS}lines/my_lines/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_create_line(self, admin_client):
        provider = TelephonyProviderFactory()
        resp = admin_client.post(
            f"{BASE_CALLS}lines/",
            {
                "provider": str(provider.id),
                "phone_number": "+15559876543",
                "friendly_name": "Main Line",
                "line_type": "both",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED


@pytest.mark.django_db
class TestCallViewSet:
    """Tests for CallViewSet."""

    def test_list_calls(self, admin_client):
        CallFactory()
        CallFactory()

        resp = admin_client.get(f"{BASE_CALLS}calls/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_create_call(self, admin_client, admin_user):
        initial_count = Call.objects.count()

        resp = admin_client.post(
            f"{BASE_CALLS}calls/",
            {
                "to_number": "+15551234567",
                "call_type": "regular",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["to_number"] == "+15551234567"
        assert Call.objects.count() == initial_count + 1

        # Verify the call was created with correct defaults
        call = Call.objects.filter(to_number="+15551234567").first()
        assert call is not None
        assert call.direction == "outbound"
        assert call.status == "initiated"
        assert call.user == admin_user

    def test_click_to_call(self, admin_client, admin_user):
        line = PhoneLineFactory(assigned_user=admin_user, is_active=True)

        resp = admin_client.post(
            f"{BASE_CALLS}calls/click_to_call/",
            {"phone_number": "+15551234567"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["to_number"] == "+15551234567"
        assert resp.data["status"] == "ringing"

    def test_click_to_call_no_line(self, admin_client, admin_user):
        # No phone line assigned
        resp = admin_client.post(
            f"{BASE_CALLS}calls/click_to_call/",
            {"phone_number": "+15551234567"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "No phone line" in resp.data["error"]

    def test_end_call(self, admin_client):
        call = CallFactory(
            status="in_progress",
            answered_at=timezone.now() - timezone.timedelta(minutes=5),
        )

        resp = admin_client.post(f"{BASE_CALLS}calls/{call.id}/end_call/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "completed"
        assert resp.data["duration"] > 0

    def test_end_call_already_ended(self, admin_client):
        call = CallFactory(status="completed")

        resp = admin_client.post(f"{BASE_CALLS}calls/{call.id}/end_call/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_transfer_call(self, admin_client):
        call = CallFactory(status="in_progress")
        target_user = UserFactory()

        resp = admin_client.post(
            f"{BASE_CALLS}calls/{call.id}/transfer/",
            {"user_id": str(target_user.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        call.refresh_from_db()
        assert call.user == target_user
        assert call.transferred_from is not None

    def test_log_notes(self, admin_client):
        call = CallFactory()

        resp = admin_client.post(
            f"{BASE_CALLS}calls/{call.id}/log_notes/",
            {
                "notes": "Client requested callback",
                "outcome": "callback_scheduled",
                "follow_up_date": "2025-12-15",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        call.refresh_from_db()
        assert call.notes == "Client requested callback"
        assert call.outcome == "callback_scheduled"

    def test_stats(self, admin_client):
        CallFactory(direction="inbound", status="completed")
        CallFactory(direction="outbound", status="completed")
        CallFactory(direction="inbound", status="no_answer")

        resp = admin_client.get(f"{BASE_CALLS}calls/stats/?period=today")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_calls"] == 3
        assert resp.data["inbound_calls"] == 2
        assert resp.data["outbound_calls"] == 1

    def test_recent_calls(self, admin_client, admin_user):
        CallFactory(user=admin_user)
        CallFactory(user=admin_user)
        CallFactory()  # Different user

        resp = admin_client.get(f"{BASE_CALLS}calls/recent/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2


@pytest.mark.django_db
class TestCallQueueViewSet:
    """Tests for CallQueueViewSet."""

    def test_list_queues(self, admin_client):
        CallQueueFactory()
        CallQueueFactory()

        resp = admin_client.get(f"{BASE_CALLS}queues/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_create_queue(self, admin_client):
        resp = admin_client.post(
            f"{BASE_CALLS}queues/",
            {
                "name": "Support Queue",
                "strategy": "round_robin",
                "timeout": 30,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_add_member(self, admin_client):
        queue = CallQueueFactory()
        user = UserFactory()

        resp = admin_client.post(
            f"{BASE_CALLS}queues/{queue.id}/add_member/",
            {"user_id": str(user.id), "priority": 1},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert queue.members.filter(id=user.id).exists()

    def test_add_member_already_exists(self, admin_client):
        queue = CallQueueFactory()
        user = UserFactory()
        CallQueueMemberFactory(queue=queue, user=user)

        resp = admin_client.post(
            f"{BASE_CALLS}queues/{queue.id}/add_member/",
            {"user_id": str(user.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_member(self, admin_client):
        queue = CallQueueFactory()
        user = UserFactory()
        CallQueueMemberFactory(queue=queue, user=user)

        resp = admin_client.post(
            f"{BASE_CALLS}queues/{queue.id}/remove_member/",
            {"user_id": str(user.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert not queue.members.filter(id=user.id).exists()


@pytest.mark.django_db
class TestCallQueueMemberViewSet:
    """Tests for CallQueueMemberViewSet."""

    def test_pause_member(self, admin_client):
        member = CallQueueMemberFactory(is_available=True)

        resp = admin_client.post(
            f"{BASE_CALLS}queue-members/{member.id}/pause/",
            {"reason": "Lunch break"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        member.refresh_from_db()
        assert member.is_available is False
        assert member.pause_reason == "Lunch break"

    def test_unpause_member(self, admin_client):
        member = CallQueueMemberFactory(is_available=False, pause_reason="Break")

        resp = admin_client.post(f"{BASE_CALLS}queue-members/{member.id}/unpause/")
        assert resp.status_code == status.HTTP_200_OK

        member.refresh_from_db()
        assert member.is_available is True
        assert member.pause_reason == ""


@pytest.mark.django_db
class TestVoicemailViewSet:
    """Tests for VoicemailViewSet."""

    def test_list_voicemails(self, admin_client):
        VoicemailFactory()
        VoicemailFactory()

        resp = admin_client.get(f"{BASE_CALLS}voicemails/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_mark_listened(self, admin_client, admin_user):
        voicemail = VoicemailFactory(status="new")

        resp = admin_client.post(
            f"{BASE_CALLS}voicemails/{voicemail.id}/mark_listened/"
        )
        assert resp.status_code == status.HTTP_200_OK

        voicemail.refresh_from_db()
        assert voicemail.status == Voicemail.Status.LISTENED
        assert voicemail.listened_by == admin_user

    def test_archive(self, admin_client):
        voicemail = VoicemailFactory(status="listened")

        resp = admin_client.post(f"{BASE_CALLS}voicemails/{voicemail.id}/archive/")
        assert resp.status_code == status.HTTP_200_OK

        voicemail.refresh_from_db()
        assert voicemail.status == Voicemail.Status.ARCHIVED

    def test_new_count(self, admin_client):
        VoicemailFactory(status="new")
        VoicemailFactory(status="new")
        VoicemailFactory(status="listened")

        resp = admin_client.get(f"{BASE_CALLS}voicemails/new_count/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 2


@pytest.mark.django_db
class TestCallScriptViewSet:
    """Tests for CallScriptViewSet."""

    def test_list_scripts(self, admin_client):
        CallScriptFactory()
        CallScriptFactory()

        resp = admin_client.get(f"{BASE_CALLS}scripts/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_create_script(self, admin_client):
        resp = admin_client.post(
            f"{BASE_CALLS}scripts/",
            {
                "name": "Sales Pitch",
                "script_type": "sales",
                "content": "Hello, my name is...",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_use_script(self, admin_client):
        script = CallScriptFactory(times_used=5, avg_success_rate=0.8)

        resp = admin_client.post(
            f"{BASE_CALLS}scripts/{script.id}/use_script/",
            {"success": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        script.refresh_from_db()
        assert script.times_used == 6

    def test_search_scripts(self, admin_client):
        CallScriptFactory(name="Sales Intro", content="Hello")
        CallScriptFactory(name="Support Greeting", content="Hi")

        resp = admin_client.get(f"{BASE_CALLS}scripts/?search=sales")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1


@pytest.mark.django_db
class TestCallSettingsViewSet:
    """Tests for CallSettingsViewSet."""

    def test_get_settings(self, admin_client):
        resp = admin_client.get(f"{BASE_CALLS}settings/")
        assert resp.status_code == status.HTTP_200_OK
        assert "auto_record_all" in resp.data

    def test_update_settings(self, admin_client):
        # First create settings
        CallSettings.objects.get_or_create()

        resp = admin_client.patch(
            f"{BASE_CALLS}settings/",
            {
                "auto_record_all": True,
                "transcription_enabled": True,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["auto_record_all"] is True
        assert resp.data["transcription_enabled"] is True
