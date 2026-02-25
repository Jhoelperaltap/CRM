"""
Tests for video_meetings views.
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.users.models import Role, User
from apps.video_meetings.models import (
    MeetingParticipant,
    VideoMeeting,
    VideoProvider,
)

BASE_VIDEO = "/api/v1/video-meetings/"


@pytest.fixture
def api_client():
    """Create an API client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create an admin user for testing."""
    admin_role, _ = Role.objects.get_or_create(
        slug=Role.RoleSlug.ADMIN,
        defaults={"name": "Admin", "description": "Administrator role"},
    )
    user = User.objects.create_user(
        email="admin@videomeetings.test",
        password="testpass123",
        first_name="Video",
        last_name="Admin",
        role=admin_role,
    )
    return user


@pytest.fixture
def video_provider(db):
    """Create a video provider for testing."""
    return VideoProvider.objects.create(
        name="Test Zoom",
        provider_type="zoom",
        is_active=True,
        is_default=True,
        client_id="test_client_id_123",
        client_secret="test_secret",
        redirect_uri="https://example.com/callback",
    )


@pytest.fixture
def video_meeting(db, admin_user, video_provider):
    """Create a video meeting for testing."""
    return VideoMeeting.objects.create(
        title="Test Meeting",
        provider=video_provider,
        host=admin_user,
        scheduled_start="2026-03-01T10:00:00Z",
        scheduled_end="2026-03-01T11:00:00Z",
        status=VideoMeeting.Status.SCHEDULED,
    )


@pytest.mark.django_db
class TestVideoProviderViewSet:
    """Tests for VideoProviderViewSet."""

    def test_list_providers(self, api_client, admin_user, video_provider):
        """Test listing video providers."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.get(f"{BASE_VIDEO}providers/")

        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["results"]) >= 1

    def test_create_provider(self, api_client, admin_user):
        """Test creating a video provider."""
        api_client.force_authenticate(user=admin_user)

        data = {
            "name": "New Provider",
            "provider_type": "teams",
            "is_active": True,
            "client_id": "new_client_id",
        }

        response = api_client.post(f"{BASE_VIDEO}providers/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == "New Provider"

    def test_oauth_url_returns_encoded_url(
        self, api_client, admin_user, video_provider
    ):
        """Test that OAuth URL is properly encoded."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.get(
            f"{BASE_VIDEO}providers/{video_provider.id}/oauth_url/"
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "oauth_url" in data
        # URL should be properly encoded
        assert "zoom.us" in data["oauth_url"]
        assert "client_id=" in data["oauth_url"]

    def test_oauth_url_rejects_custom_provider(self, api_client, admin_user):
        """Test that OAuth URL returns error for custom provider."""
        api_client.force_authenticate(user=admin_user)

        # Create a custom provider without OAuth support
        provider = VideoProvider.objects.create(
            name="Custom Provider",
            provider_type="custom",
            is_active=True,
        )

        response = api_client.get(f"{BASE_VIDEO}providers/{provider.id}/oauth_url/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error" in response.json()

    def test_oauth_url_requires_client_id(self, api_client, admin_user):
        """Test that OAuth URL requires client_id."""
        api_client.force_authenticate(user=admin_user)

        provider = VideoProvider.objects.create(
            name="Teams Provider",
            provider_type="teams",
            is_active=True,
            client_id="",  # Empty client_id
        )

        response = api_client.get(f"{BASE_VIDEO}providers/{provider.id}/oauth_url/")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "client_id" in response.json()["error"].lower()

    def test_set_default_provider(self, api_client, admin_user, video_provider):
        """Test setting a provider as default."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.post(
            f"{BASE_VIDEO}providers/{video_provider.id}/set_default/"
        )

        assert response.status_code == status.HTTP_200_OK
        video_provider.refresh_from_db()
        assert video_provider.is_default is True


@pytest.mark.django_db
class TestVideoMeetingViewSet:
    """Tests for VideoMeetingViewSet."""

    def test_list_meetings(self, api_client, admin_user, video_meeting):
        """Test listing video meetings."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.get(f"{BASE_VIDEO}meetings/")

        assert response.status_code == status.HTTP_200_OK

    def test_create_meeting(self, api_client, admin_user, video_provider):
        """Test creating a video meeting."""
        api_client.force_authenticate(user=admin_user)

        data = {
            "title": "New Test Meeting",
            "scheduled_start": "2026-03-15T14:00:00Z",
            "scheduled_end": "2026-03-15T15:00:00Z",
            "provider_id": str(video_provider.id),
        }

        response = api_client.post(f"{BASE_VIDEO}meetings/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["title"] == "New Test Meeting"

    def test_create_meeting_with_invalid_participants_rejected(
        self, api_client, admin_user, video_provider
    ):
        """Test that invalid participant emails are rejected by validation."""
        api_client.force_authenticate(user=admin_user)

        data = {
            "title": "Meeting with Invalid Emails",
            "scheduled_start": "2026-03-15T14:00:00Z",
            "scheduled_end": "2026-03-15T15:00:00Z",
            "provider_id": str(video_provider.id),
            "participant_emails": ["valid@test.com", "invalid-email", ""],
        }

        response = api_client.post(f"{BASE_VIDEO}meetings/", data, format="json")

        # Should fail validation due to invalid email format
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_meeting_with_valid_participants(
        self, api_client, admin_user, video_provider
    ):
        """Test that valid participant emails are added to meeting."""
        api_client.force_authenticate(user=admin_user)

        data = {
            "title": "Meeting with Valid Participants",
            "scheduled_start": "2026-03-15T14:00:00Z",
            "scheduled_end": "2026-03-15T15:00:00Z",
            "provider_id": str(video_provider.id),
            "participant_emails": ["participant1@test.com", "participant2@test.com"],
        }

        response = api_client.post(f"{BASE_VIDEO}meetings/", data, format="json")

        assert response.status_code == status.HTTP_201_CREATED

        meeting_id = response.json()["id"]
        participants = MeetingParticipant.objects.filter(meeting_id=meeting_id)
        emails = [p.email for p in participants]
        assert "participant1@test.com" in emails
        assert "participant2@test.com" in emails

    def test_start_meeting(self, api_client, admin_user, video_meeting):
        """Test starting a meeting."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.post(f"{BASE_VIDEO}meetings/{video_meeting.id}/start/")

        assert response.status_code == status.HTTP_200_OK
        video_meeting.refresh_from_db()
        assert video_meeting.status == VideoMeeting.Status.STARTED

    def test_end_meeting(self, api_client, admin_user, video_meeting):
        """Test ending a meeting."""
        api_client.force_authenticate(user=admin_user)

        # First start the meeting
        video_meeting.status = VideoMeeting.Status.STARTED
        video_meeting.save()

        response = api_client.post(f"{BASE_VIDEO}meetings/{video_meeting.id}/end/")

        assert response.status_code == status.HTTP_200_OK
        video_meeting.refresh_from_db()
        assert video_meeting.status == VideoMeeting.Status.ENDED

    def test_cancel_meeting(self, api_client, admin_user, video_meeting):
        """Test canceling a meeting."""
        api_client.force_authenticate(user=admin_user)

        response = api_client.post(f"{BASE_VIDEO}meetings/{video_meeting.id}/cancel/")

        assert response.status_code == status.HTTP_200_OK
        video_meeting.refresh_from_db()
        assert video_meeting.status == VideoMeeting.Status.CANCELED

    def test_add_participant(self, api_client, admin_user, video_meeting):
        """Test adding a participant to a meeting."""
        api_client.force_authenticate(user=admin_user)

        data = {"email": "participant@test.com", "name": "Test Participant"}

        response = api_client.post(
            f"{BASE_VIDEO}meetings/{video_meeting.id}/add_participant/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert MeetingParticipant.objects.filter(
            meeting=video_meeting, email="participant@test.com"
        ).exists()

    def test_add_participant_requires_email(
        self, api_client, admin_user, video_meeting
    ):
        """Test that adding participant requires email."""
        api_client.force_authenticate(user=admin_user)

        data = {"name": "No Email Participant"}

        response = api_client.post(
            f"{BASE_VIDEO}meetings/{video_meeting.id}/add_participant/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.json()["error"].lower()

    def test_add_duplicate_participant(self, api_client, admin_user, video_meeting):
        """Test that duplicate participant is rejected."""
        api_client.force_authenticate(user=admin_user)

        # Add participant first time
        MeetingParticipant.objects.create(
            meeting=video_meeting,
            email="existing@test.com",
            name="Existing",
        )

        # Try to add same participant again
        data = {"email": "existing@test.com"}
        response = api_client.post(
            f"{BASE_VIDEO}meetings/{video_meeting.id}/add_participant/",
            data,
            format="json",
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already" in response.json()["error"].lower()


@pytest.mark.django_db
class TestVideoMeetingAuthentication:
    """Tests for authentication requirements."""

    def test_unauthenticated_access_denied(self, api_client):
        """Test that unauthenticated users cannot access endpoints."""
        response = api_client.get(f"{BASE_VIDEO}providers/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        response = api_client.get(f"{BASE_VIDEO}meetings/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
