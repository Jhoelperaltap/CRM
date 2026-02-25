import logging
from datetime import timedelta
from urllib.parse import urlencode

from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    MeetingParticipant,
    MeetingRecording,
    UserVideoConnection,
    VideoMeeting,
    VideoMeetingSettings,
    VideoProvider,
)
from .serializers import (
    CreateMeetingSerializer,
    MeetingParticipantSerializer,
    MeetingRecordingSerializer,
    UserVideoConnectionSerializer,
    VideoMeetingDetailSerializer,
    VideoMeetingListSerializer,
    VideoMeetingSettingsSerializer,
    VideoProviderSerializer,
    VideoProviderWriteSerializer,
)

logger = logging.getLogger(__name__)


class VideoProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing video providers"""

    queryset = VideoProvider.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return VideoProviderWriteSerializer
        return VideoProviderSerializer

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        """Set this provider as the default"""
        provider = self.get_object()
        provider.is_default = True
        provider.save()
        return Response({"status": "success"})

    @action(detail=True, methods=["get"])
    def oauth_url(self, request, pk=None):
        """Get OAuth authorization URL for this provider"""
        provider = self.get_object()

        # Map provider types to their OAuth endpoints
        oauth_endpoints = {
            "zoom": "https://zoom.us/oauth/authorize",
            "google_meet": "https://accounts.google.com/o/oauth2/v2/auth",
            "teams": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "webex": "https://webexapis.com/v1/authorize",
        }

        base_url = oauth_endpoints.get(provider.provider_type)
        if not base_url:
            return Response(
                {
                    "error": f"OAuth not supported for provider type: {provider.provider_type}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not provider.client_id:
            return Response(
                {"error": "Provider client_id is not configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build OAuth URL with properly encoded parameters
        params = {
            "client_id": provider.client_id,
            "response_type": "code",
            "redirect_uri": provider.redirect_uri
            or request.build_absolute_uri("/api/v1/video/oauth/callback/"),
        }

        oauth_url = f"{base_url}?{urlencode(params)}"
        return Response({"oauth_url": oauth_url})


class UserVideoConnectionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing user video connections"""

    queryset = UserVideoConnection.objects.select_related("provider").all()
    serializer_class = UserVideoConnectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    @action(detail=True, methods=["post"])
    def disconnect(self, request, pk=None):
        """Disconnect the video account"""
        connection = self.get_object()
        connection.is_active = False
        connection.access_token = ""
        connection.refresh_token = ""
        connection.save()
        return Response({"status": "disconnected"})

    @action(detail=True, methods=["post"])
    def refresh_token(self, request, pk=None):
        """Refresh the OAuth token"""
        self.get_object()  # Validate connection exists
        # TODO: Implement actual token refresh
        return Response({"status": "refreshed"})


class VideoMeetingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing video meetings"""

    queryset = (
        VideoMeeting.objects.select_related(
            "provider", "host", "contact", "case", "appointment"
        )
        .prefetch_related("participants", "recordings")
        .all()
    )
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "provider", "host", "contact", "case"]
    search_fields = ["title", "description", "meeting_number"]
    ordering_fields = ["scheduled_start", "created_at"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VideoMeetingDetailSerializer
        if self.action == "create":
            return CreateMeetingSerializer
        return VideoMeetingListSerializer

    def create(self, request, *args, **kwargs):
        serializer = CreateMeetingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get provider
        provider = None
        if data.get("provider_id"):
            provider = VideoProvider.objects.filter(id=data["provider_id"]).first()
        if not provider:
            provider = VideoProvider.objects.filter(
                is_default=True, is_active=True
            ).first()

        if not provider:
            return Response(
                {"error": "No video provider configured"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate end time
        scheduled_end = data["scheduled_start"] + timedelta(minutes=data["duration"])

        # Create meeting
        meeting = VideoMeeting.objects.create(
            provider=provider,
            title=data["title"],
            description=data.get("description", ""),
            scheduled_start=data["scheduled_start"],
            scheduled_end=scheduled_end,
            duration=data["duration"],
            timezone=data.get("timezone", "UTC"),
            host=request.user,
            waiting_room=data.get("waiting_room", True),
            auto_recording=data.get("auto_recording", "none"),
            mute_on_entry=data.get("mute_on_entry", True),
            appointment_id=data.get("appointment_id"),
            contact_id=data.get("contact_id"),
            case_id=data.get("case_id"),
        )

        # TODO: Call provider API to create actual meeting and get join URLs
        # For now, generate placeholder URLs
        meeting.join_url = (
            f"https://{provider.provider_type}.example.com/j/{meeting.id}"
        )
        meeting.host_url = (
            f"https://{provider.provider_type}.example.com/s/{meeting.id}"
        )
        meeting.meeting_number = str(meeting.id)[:8].upper()
        meeting.save()

        # Add host as participant
        MeetingParticipant.objects.create(
            meeting=meeting,
            user=request.user,
            email=request.user.email,
            name=request.user.get_full_name(),
            role=MeetingParticipant.Role.HOST,
        )

        # Add other participants
        for email in data.get("participant_emails", []):
            if email and isinstance(email, str) and "@" in email:
                MeetingParticipant.objects.create(
                    meeting=meeting,
                    email=email,
                    name=email.split("@")[0],
                )
            elif email:
                logger.warning(f"Invalid email format for participant: {email}")

        return Response(
            VideoMeetingDetailSerializer(meeting).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start the meeting"""
        meeting = self.get_object()
        if meeting.status != VideoMeeting.Status.SCHEDULED:
            return Response(
                {"error": "Meeting cannot be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meeting.status = VideoMeeting.Status.STARTED
        meeting.actual_start = timezone.now()
        meeting.save()

        return Response(VideoMeetingDetailSerializer(meeting).data)

    @action(detail=True, methods=["post"])
    def end(self, request, pk=None):
        """End the meeting"""
        meeting = self.get_object()
        if meeting.status != VideoMeeting.Status.STARTED:
            return Response(
                {"error": "Meeting is not in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meeting.status = VideoMeeting.Status.ENDED
        meeting.actual_end = timezone.now()
        meeting.save()

        return Response(VideoMeetingDetailSerializer(meeting).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel the meeting"""
        meeting = self.get_object()
        if meeting.status not in [VideoMeeting.Status.SCHEDULED]:
            return Response(
                {"error": "Meeting cannot be canceled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        meeting.status = VideoMeeting.Status.CANCELED
        meeting.save()

        # TODO: Send cancellation notifications

        return Response(VideoMeetingDetailSerializer(meeting).data)

    @action(detail=True, methods=["post"])
    def add_participant(self, request, pk=None):
        """Add a participant to the meeting"""
        meeting = self.get_object()
        email = request.data.get("email")
        name = request.data.get("name", email.split("@")[0] if email else "")
        role = request.data.get("role", MeetingParticipant.Role.PARTICIPANT)

        if not email:
            return Response(
                {"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        participant, created = MeetingParticipant.objects.get_or_create(
            meeting=meeting,
            email=email,
            defaults={"name": name, "role": role},
        )

        if not created:
            return Response(
                {"error": "Participant already added"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(MeetingParticipantSerializer(participant).data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """Get upcoming meetings"""
        meetings = (
            self.queryset.filter(
                Q(host=request.user) | Q(participants__user=request.user),
                status=VideoMeeting.Status.SCHEDULED,
                scheduled_start__gte=timezone.now(),
            )
            .distinct()
            .order_by("scheduled_start")[:10]
        )

        return Response(VideoMeetingListSerializer(meetings, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get meeting statistics"""
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        meetings = VideoMeeting.objects.filter(host=request.user)

        return Response(
            {
                "total_meetings": meetings.count(),
                "upcoming": meetings.filter(
                    status=VideoMeeting.Status.SCHEDULED,
                    scheduled_start__gte=now,
                ).count(),
                "this_month": meetings.filter(scheduled_start__gte=month_start).count(),
                "completed_this_month": meetings.filter(
                    status=VideoMeeting.Status.ENDED,
                    scheduled_start__gte=month_start,
                ).count(),
                "total_participants": MeetingParticipant.objects.filter(
                    meeting__host=request.user
                ).count(),
            }
        )


class MeetingParticipantViewSet(viewsets.ModelViewSet):
    """ViewSet for managing meeting participants"""

    queryset = MeetingParticipant.objects.select_related(
        "meeting", "user", "contact"
    ).all()
    serializer_class = MeetingParticipantSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["meeting", "role", "join_status"]

    @action(detail=True, methods=["post"])
    def mark_joined(self, request, pk=None):
        """Mark participant as joined"""
        participant = self.get_object()
        participant.join_status = MeetingParticipant.JoinStatus.JOINED
        participant.joined_at = timezone.now()
        participant.save()

        # Update meeting participant count
        meeting = participant.meeting
        meeting.participants_count = meeting.participants.filter(
            join_status=MeetingParticipant.JoinStatus.JOINED
        ).count()
        meeting.save()

        return Response(MeetingParticipantSerializer(participant).data)


class MeetingRecordingViewSet(viewsets.ModelViewSet):
    """ViewSet for managing meeting recordings"""

    queryset = MeetingRecording.objects.select_related("meeting").all()
    serializer_class = MeetingRecordingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["meeting", "recording_type", "is_ready"]

    @action(detail=True, methods=["post"])
    def transcribe(self, request, pk=None):
        """Request transcription for a recording"""
        recording = self.get_object()
        recording.transcription_status = "processing"
        recording.save()
        # TODO: Trigger actual transcription job
        return Response({"status": "transcription_started"})


class VideoMeetingSettingsViewSet(viewsets.ViewSet):
    """ViewSet for managing video meeting settings (singleton)"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get current settings"""
        settings, _ = VideoMeetingSettings.objects.get_or_create()
        return Response(VideoMeetingSettingsSerializer(settings).data)

    def partial_update(self, request, pk=None):
        """Update settings"""
        settings, _ = VideoMeetingSettings.objects.get_or_create()
        serializer = VideoMeetingSettingsSerializer(
            settings, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
