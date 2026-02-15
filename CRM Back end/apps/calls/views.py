from datetime import timedelta

from django.db.models import Avg, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Call,
    CallQueue,
    CallQueueMember,
    CallScript,
    CallSettings,
    PhoneLine,
    TelephonyProvider,
    Voicemail,
)
from .serializers import (
    CallCreateSerializer,
    CallQueueMemberSerializer,
    CallQueueSerializer,
    CallScriptSerializer,
    CallSerializer,
    CallSettingsSerializer,
    CallStatsSerializer,
    CallUpdateSerializer,
    ClickToCallSerializer,
    PhoneLineSerializer,
    TelephonyProviderSerializer,
    TelephonyProviderWriteSerializer,
    VoicemailSerializer,
)


class TelephonyProviderViewSet(viewsets.ModelViewSet):
    """ViewSet for managing telephony providers"""

    queryset = TelephonyProvider.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TelephonyProviderWriteSerializer
        return TelephonyProviderSerializer

    @action(detail=True, methods=["post"])
    def test_connection(self, request, pk=None):
        """Test connection to the telephony provider"""
        self.get_object()  # Validate provider exists
        # TODO: Implement actual provider connection test
        return Response({"status": "success", "message": "Connection test successful"})

    @action(detail=True, methods=["post"])
    def set_default(self, request, pk=None):
        """Set this provider as the default"""
        provider = self.get_object()
        provider.is_default = True
        provider.save()
        return Response({"status": "success"})


class PhoneLineViewSet(viewsets.ModelViewSet):
    """ViewSet for managing phone lines"""

    queryset = PhoneLine.objects.select_related("provider", "assigned_user").all()
    serializer_class = PhoneLineSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["provider", "line_type", "is_active", "assigned_user"]

    @action(detail=False, methods=["get"])
    def my_lines(self, request):
        """Get phone lines assigned to the current user"""
        lines = self.queryset.filter(assigned_user=request.user)
        serializer = self.get_serializer(lines, many=True)
        return Response(serializer.data)


class CallViewSet(viewsets.ModelViewSet):
    """ViewSet for managing calls"""

    queryset = Call.objects.select_related(
        "user", "contact", "corporation", "case", "phone_line"
    ).all()
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        "direction",
        "status",
        "call_type",
        "user",
        "contact",
        "corporation",
        "case",
    ]
    search_fields = ["from_number", "to_number", "subject", "notes"]
    ordering_fields = ["created_at", "started_at", "duration"]

    def get_serializer_class(self):
        if self.action == "create":
            return CallCreateSerializer
        if self.action in ["update", "partial_update"]:
            return CallUpdateSerializer
        return CallSerializer

    def perform_create(self, serializer):
        serializer.save(
            user=self.request.user,
            direction=Call.Direction.OUTBOUND,
            status=Call.Status.INITIATED,
        )

    @action(detail=False, methods=["post"])
    def click_to_call(self, request):
        """Initiate a click-to-call"""
        serializer = ClickToCallSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get user's phone line
        phone_line = None
        if data.get("phone_line_id"):
            phone_line = PhoneLine.objects.filter(id=data["phone_line_id"]).first()
        if not phone_line:
            phone_line = PhoneLine.objects.filter(
                assigned_user=request.user, is_active=True
            ).first()

        if not phone_line:
            return Response(
                {"error": "No phone line available for outbound calls"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create call record
        call = Call.objects.create(
            direction=Call.Direction.OUTBOUND,
            status=Call.Status.INITIATED,
            call_type=data.get("call_type", Call.CallType.REGULAR),
            from_number=phone_line.phone_number,
            to_number=data["phone_number"],
            phone_line=phone_line,
            user=request.user,
            contact_id=data.get("contact_id"),
            corporation_id=data.get("corporation_id"),
            case_id=data.get("case_id"),
        )

        # TODO: Integrate with actual telephony provider to initiate call
        call.status = Call.Status.RINGING
        call.started_at = timezone.now()
        call.save()

        return Response(CallSerializer(call).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def end_call(self, request, pk=None):
        """End an active call"""
        call = self.get_object()
        if call.status in [
            Call.Status.COMPLETED,
            Call.Status.FAILED,
            Call.Status.CANCELED,
        ]:
            return Response(
                {"error": "Call already ended"}, status=status.HTTP_400_BAD_REQUEST
            )

        call.status = Call.Status.COMPLETED
        call.ended_at = timezone.now()
        if call.answered_at:
            call.duration = int((call.ended_at - call.answered_at).total_seconds())
        call.save()

        return Response(CallSerializer(call).data)

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        """Transfer call to another user"""
        call = self.get_object()
        target_user_id = request.data.get("user_id")

        if not target_user_id:
            return Response(
                {"error": "Target user required"}, status=status.HTTP_400_BAD_REQUEST
            )

        # TODO: Implement actual call transfer via telephony provider
        call.transferred_from = call.user
        call.user_id = target_user_id
        call.save()

        return Response(CallSerializer(call).data)

    @action(detail=True, methods=["post"])
    def log_notes(self, request, pk=None):
        """Log notes for a call"""
        call = self.get_object()
        notes = request.data.get("notes", "")
        outcome = request.data.get("outcome", "")
        follow_up_date = request.data.get("follow_up_date")
        follow_up_notes = request.data.get("follow_up_notes", "")

        call.notes = notes
        call.outcome = outcome
        if follow_up_date:
            call.follow_up_date = follow_up_date
        call.follow_up_notes = follow_up_notes
        call.save()

        return Response(CallSerializer(call).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get call statistics"""
        period = request.query_params.get("period", "today")
        now = timezone.now()

        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        else:
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

        calls = Call.objects.filter(created_at__gte=start_date)

        stats = {
            "total_calls": calls.count(),
            "inbound_calls": calls.filter(direction=Call.Direction.INBOUND).count(),
            "outbound_calls": calls.filter(direction=Call.Direction.OUTBOUND).count(),
            "answered_calls": calls.filter(
                status__in=[Call.Status.COMPLETED, Call.Status.IN_PROGRESS]
            ).count(),
            "missed_calls": calls.filter(
                status__in=[Call.Status.NO_ANSWER, Call.Status.BUSY]
            ).count(),
            "total_duration": calls.aggregate(total=Sum("duration"))["total"] or 0,
            "avg_duration": calls.aggregate(avg=Avg("duration"))["avg"] or 0,
            "avg_ring_time": calls.aggregate(avg=Avg("ring_duration"))["avg"] or 0,
        }

        return Response(CallStatsSerializer(stats).data)

    @action(detail=False, methods=["get"])
    def recent(self, request):
        """Get recent calls for the current user"""
        calls = self.queryset.filter(user=request.user).order_by("-created_at")[:20]
        return Response(CallSerializer(calls, many=True).data)


class CallQueueViewSet(viewsets.ModelViewSet):
    """ViewSet for managing call queues"""

    queryset = CallQueue.objects.prefetch_related("members").all()
    serializer_class = CallQueueSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=["post"])
    def add_member(self, request, pk=None):
        """Add a member to the queue"""
        queue = self.get_object()
        user_id = request.data.get("user_id")
        priority = request.data.get("priority", 0)

        if not user_id:
            return Response(
                {"error": "User ID required"}, status=status.HTTP_400_BAD_REQUEST
            )

        member, created = CallQueueMember.objects.get_or_create(
            queue=queue, user_id=user_id, defaults={"priority": priority}
        )

        if not created:
            return Response(
                {"error": "User already in queue"}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(CallQueueMemberSerializer(member).data)

    @action(detail=True, methods=["post"])
    def remove_member(self, request, pk=None):
        """Remove a member from the queue"""
        queue = self.get_object()
        user_id = request.data.get("user_id")

        deleted, _ = CallQueueMember.objects.filter(
            queue=queue, user_id=user_id
        ).delete()

        if not deleted:
            return Response(
                {"error": "User not in queue"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response({"status": "success"})


class CallQueueMemberViewSet(viewsets.ModelViewSet):
    """ViewSet for managing queue membership"""

    queryset = CallQueueMember.objects.select_related("queue", "user").all()
    serializer_class = CallQueueMemberSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["queue", "user", "is_active", "is_available"]

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """Pause queue member"""
        member = self.get_object()
        member.is_available = False
        member.paused_at = timezone.now()
        member.pause_reason = request.data.get("reason", "")
        member.save()
        return Response(CallQueueMemberSerializer(member).data)

    @action(detail=True, methods=["post"])
    def unpause(self, request, pk=None):
        """Unpause queue member"""
        member = self.get_object()
        member.is_available = True
        member.paused_at = None
        member.pause_reason = ""
        member.save()
        return Response(CallQueueMemberSerializer(member).data)


class VoicemailViewSet(viewsets.ModelViewSet):
    """ViewSet for managing voicemails"""

    queryset = Voicemail.objects.select_related(
        "phone_line", "call", "listened_by", "contact"
    ).all()
    serializer_class = VoicemailSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "phone_line", "contact"]
    ordering_fields = ["created_at", "duration"]

    @action(detail=True, methods=["post"])
    def mark_listened(self, request, pk=None):
        """Mark voicemail as listened"""
        voicemail = self.get_object()
        voicemail.status = Voicemail.Status.LISTENED
        voicemail.listened_by = request.user
        voicemail.listened_at = timezone.now()
        voicemail.save()
        return Response(VoicemailSerializer(voicemail).data)

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """Archive voicemail"""
        voicemail = self.get_object()
        voicemail.status = Voicemail.Status.ARCHIVED
        voicemail.save()
        return Response(VoicemailSerializer(voicemail).data)

    @action(detail=False, methods=["get"])
    def new_count(self, request):
        """Get count of new voicemails"""
        count = self.queryset.filter(status=Voicemail.Status.NEW).count()
        return Response({"count": count})


class CallScriptViewSet(viewsets.ModelViewSet):
    """ViewSet for managing call scripts"""

    queryset = CallScript.objects.select_related("created_by").all()
    serializer_class = CallScriptSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["script_type", "is_active"]
    search_fields = ["name", "description", "content"]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def use_script(self, request, pk=None):
        """Record script usage and optionally success"""
        script = self.get_object()
        success = request.data.get("success")

        script.times_used += 1
        if success is not None:
            # Update rolling average
            current_rate = script.avg_success_rate
            new_rate = (
                current_rate * (script.times_used - 1) + (1 if success else 0)
            ) / script.times_used
            script.avg_success_rate = new_rate

        script.save()
        return Response(CallScriptSerializer(script).data)


class CallSettingsViewSet(viewsets.ViewSet):
    """ViewSet for managing call settings (singleton)"""

    permission_classes = [IsAuthenticated]

    def list(self, request):
        """Get current settings"""
        settings, _ = CallSettings.objects.get_or_create()
        return Response(CallSettingsSerializer(settings).data)

    def partial_update(self, request, pk=None):
        """Update settings"""
        settings, _ = CallSettings.objects.get_or_create()
        serializer = CallSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
