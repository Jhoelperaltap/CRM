import uuid
from datetime import timedelta

from django.db.models import Avg, F, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView


class PublicChatRateThrottle(AnonRateThrottle):
    """Rate limit for public chat endpoints to prevent abuse."""

    rate = "30/minute"


class ChatSessionCreationThrottle(AnonRateThrottle):
    """Stricter rate limit for creating new chat sessions."""

    rate = "5/minute"


class ChatMessageThrottle(AnonRateThrottle):
    """Rate limit for sending chat messages."""

    rate = "20/minute"

from .models import (
    CannedResponse,
    ChatAgent,
    ChatDepartment,
    ChatMessage,
    ChatSession,
    ChatWidgetSettings,
    OfflineMessage,
)
from .serializers import (
    CannedResponseSerializer,
    ChatAgentSerializer,
    ChatAgentStatusSerializer,
    ChatDepartmentSerializer,
    ChatMessageSerializer,
    ChatSessionListSerializer,
    ChatSessionSerializer,
    ChatWidgetSettingsSerializer,
    OfflineMessageSerializer,
    RateChatSerializer,
    SendMessageSerializer,
    StartChatSerializer,
    TransferChatSerializer,
)


class ChatDepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing chat departments."""

    queryset = ChatDepartment.objects.all()
    serializer_class = ChatDepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        return queryset.order_by("order", "name")


class ChatAgentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing chat agents."""

    queryset = ChatAgent.objects.all()
    serializer_class = ChatAgentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().select_related("user")

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(departments__id=department)

        is_available = self.request.query_params.get("is_available")
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == "true")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    @action(detail=False, methods=["get", "post", "patch"])
    def me(self, request):
        """Get or update current user's agent profile."""
        agent, created = ChatAgent.objects.get_or_create(user=request.user)

        if request.method == "GET":
            serializer = self.get_serializer(agent)
            return Response(serializer.data)

        serializer = self.get_serializer(agent, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def go_online(self, request):
        """Set current agent as online."""
        agent, _ = ChatAgent.objects.get_or_create(user=request.user)
        agent.go_online()
        return Response({"message": "You are now online"})

    @action(detail=False, methods=["post"])
    def go_offline(self, request):
        """Set current agent as offline."""
        agent, _ = ChatAgent.objects.get_or_create(user=request.user)
        agent.go_offline()
        return Response({"message": "You are now offline"})

    @action(detail=False, methods=["post"])
    def update_status(self, request):
        """Update agent status."""
        agent, _ = ChatAgent.objects.get_or_create(user=request.user)
        serializer = ChatAgentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent.status = serializer.validated_data["status"]
        agent.status_message = serializer.validated_data.get("status_message", "")
        agent.is_available = agent.status == ChatAgent.Status.ONLINE
        agent.last_seen = timezone.now()
        agent.save()

        return Response(ChatAgentSerializer(agent).data)


class ChatSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing chat sessions."""

    queryset = ChatSession.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return ChatSessionListSerializer
        return ChatSessionSerializer

    def get_queryset(self):
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "department", "assigned_agent", "assigned_agent__user", "contact"
            )
        )

        # Status filter
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Department filter
        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department_id=department)

        # Assigned to me filter
        mine = self.request.query_params.get("mine")
        if mine and mine.lower() == "true":
            agent = getattr(self.request.user, "chat_agent", None)
            if agent:
                queryset = queryset.filter(assigned_agent=agent)

        # Unassigned filter
        unassigned = self.request.query_params.get("unassigned")
        if unassigned and unassigned.lower() == "true":
            queryset = queryset.filter(assigned_agent__isnull=True)

        # Date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """Accept and assign chat to current agent."""
        session = self.get_object()
        agent, _ = ChatAgent.objects.get_or_create(user=request.user)

        if not agent.can_accept_chat:
            return Response(
                {"error": "You cannot accept more chats"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session.assign_to(agent)

        # Record first response time
        if not session.first_response_at:
            session.first_response_at = timezone.now()
            session.wait_time = session.first_response_at - session.started_at
            session.save()

        # Create system message
        ChatMessage.objects.create(
            session=session,
            message_type="system",
            sender_type="system",
            content=f"{agent.user.get_full_name()} joined the chat",
        )

        return Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=["post"])
    def transfer(self, request, pk=None):
        """Transfer chat to another agent or department."""
        session = self.get_object()
        serializer = TransferChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent_id = serializer.validated_data.get("agent_id")
        department_id = serializer.validated_data.get("department_id")
        note = serializer.validated_data.get("note", "")

        if agent_id:
            new_agent = ChatAgent.objects.get(id=agent_id)
            if not new_agent.can_accept_chat:
                return Response(
                    {"error": "Target agent cannot accept chats"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            session.assign_to(new_agent)
            msg = f"Chat transferred to {new_agent.user.get_full_name()}"
        elif department_id:
            session.department_id = department_id
            session.assigned_agent = None
            session.status = ChatSession.Status.WAITING
            session.save()
            msg = "Chat transferred to another department"
        else:
            return Response(
                {"error": "Specify agent_id or department_id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create system message
        ChatMessage.objects.create(
            session=session, message_type="system", sender_type="system", content=msg
        )

        if note:
            ChatMessage.objects.create(
                session=session,
                message_type="note",
                sender_type="agent",
                agent=getattr(request.user, "chat_agent", None),
                content=note,
                is_internal=True,
            )

        return Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """Close the chat session."""
        session = self.get_object()

        if session.status == ChatSession.Status.CLOSED:
            return Response(
                {"error": "Chat is already closed"}, status=status.HTTP_400_BAD_REQUEST
            )

        session.close(by_agent=True)

        # Create system message
        agent = getattr(request.user, "chat_agent", None)
        ChatMessage.objects.create(
            session=session,
            message_type="system",
            sender_type="system",
            content=f"Chat closed by {agent.user.get_full_name() if agent else 'agent'}",
        )

        return Response(ChatSessionSerializer(session).data)

    @action(detail=True, methods=["post"])
    def send_message(self, request, pk=None):
        """Send a message in the chat."""
        session = self.get_object()
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agent = getattr(request.user, "chat_agent", None)

        message = ChatMessage.objects.create(
            session=session,
            message_type=serializer.validated_data.get("message_type", "text"),
            sender_type="agent",
            agent=agent,
            sender_name=request.user.get_full_name(),
            content=serializer.validated_data["content"],
            is_internal=serializer.validated_data.get("is_internal", False),
            delivered_at=timezone.now(),
        )

        return Response(
            ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        """Get all messages for a chat session."""
        session = self.get_object()

        # Optionally exclude internal notes
        show_internal = (
            request.query_params.get("show_internal", "true").lower() == "true"
        )
        messages = session.messages.all()
        if not show_internal:
            messages = messages.exclude(is_internal=True)

        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """Mark all visitor messages as read."""
        session = self.get_object()
        session.messages.filter(sender_type="visitor", is_read=False).update(
            is_read=True, read_at=timezone.now()
        )

        return Response({"message": "Messages marked as read"})

    @action(detail=True, methods=["post"])
    def send_transcript(self, request, pk=None):
        """Send chat transcript to visitor."""
        session = self.get_object()

        if not session.visitor_email:
            return Response(
                {"error": "No visitor email available"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # TODO: Implement email sending
        session.transcript_sent = True
        session.transcript_sent_at = timezone.now()
        session.save()

        return Response({"message": "Transcript sent"})


class CannedResponseViewSet(viewsets.ModelViewSet):
    """ViewSet for managing canned responses."""

    queryset = CannedResponse.objects.all()
    serializer_class = CannedResponseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(Q(department_id=department) | Q(is_global=True))

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(shortcut__icontains=search)
                | Q(content__icontains=search)
            )

        return queryset.order_by("title")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def use(self, request, pk=None):
        """Record usage of a canned response."""
        response = self.get_object()
        response.usage_count += 1
        response.save()
        return Response({"content": response.content})


class ChatWidgetSettingsView(APIView):
    """View for chat widget settings."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings, _ = ChatWidgetSettings.objects.get_or_create(pk=1)
        serializer = ChatWidgetSettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings, _ = ChatWidgetSettings.objects.get_or_create(pk=1)
        serializer = ChatWidgetSettingsSerializer(
            settings, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class OfflineMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing offline messages."""

    queryset = OfflineMessage.objects.all()
    serializer_class = OfflineMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = (
            super()
            .get_queryset()
            .select_related("department", "read_by", "responded_by")
        )

        is_read = self.request.query_params.get("is_read")
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")

        is_responded = self.request.query_params.get("is_responded")
        if is_responded is not None:
            queryset = queryset.filter(is_responded=is_responded.lower() == "true")

        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department_id=department)

        return queryset.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """Mark offline message as read."""
        message = self.get_object()
        if not message.is_read:
            message.is_read = True
            message.read_by = request.user
            message.read_at = timezone.now()
            message.save()
        return Response(OfflineMessageSerializer(message).data)

    @action(detail=True, methods=["post"])
    def mark_responded(self, request, pk=None):
        """Mark offline message as responded."""
        message = self.get_object()
        if not message.is_responded:
            message.is_responded = True
            message.responded_by = request.user
            message.responded_at = timezone.now()
            message.save()
        return Response(OfflineMessageSerializer(message).data)

    @action(detail=True, methods=["post"])
    def convert_to_contact(self, request, pk=None):
        """Create a contact from offline message."""
        from apps.contacts.models import Contact

        message = self.get_object()

        if message.converted_to_contact:
            return Response(
                {"error": "Already converted to contact"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if contact exists
        existing = Contact.objects.filter(email=message.email).first()
        if existing:
            message.converted_to_contact = existing
            message.save()
            return Response(
                {
                    "message": "Linked to existing contact",
                    "contact_id": str(existing.id),
                }
            )

        # Create new contact
        names = message.name.split(" ", 1)
        contact = Contact.objects.create(
            first_name=names[0],
            last_name=names[1] if len(names) > 1 else "",
            email=message.email,
            phone=message.phone,
            source="live_chat",
            created_by=request.user,
        )

        message.converted_to_contact = contact
        message.save()

        return Response(
            {"message": "Contact created", "contact_id": str(contact.id)},
            status=status.HTTP_201_CREATED,
        )


class ChatStatsView(APIView):
    """Get chat statistics."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        today_start = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        )

        total_chats = ChatSession.objects.count()
        active_chats = ChatSession.objects.filter(
            status=ChatSession.Status.ACTIVE
        ).count()
        waiting_chats = ChatSession.objects.filter(
            status=ChatSession.Status.WAITING
        ).count()
        closed_today = ChatSession.objects.filter(
            status=ChatSession.Status.CLOSED, ended_at__gte=today_start
        ).count()

        # Calculate averages
        avg_wait = ChatSession.objects.filter(wait_time__isnull=False).aggregate(
            avg=Avg("wait_time")
        )["avg"]

        closed_with_duration = ChatSession.objects.filter(
            status=ChatSession.Status.CLOSED, ended_at__isnull=False
        )
        avg_duration = None
        if closed_with_duration.exists():
            durations = [s.duration for s in closed_with_duration[:100]]
            if durations:
                avg_duration = sum(durations, timedelta()) / len(durations)

        avg_rating = ChatSession.objects.filter(rating__isnull=False).aggregate(
            avg=Avg("rating")
        )["avg"]

        online_agents = ChatAgent.objects.filter(is_available=True).count()
        total_agents = ChatAgent.objects.count()

        data = {
            "total_chats": total_chats,
            "active_chats": active_chats,
            "waiting_chats": waiting_chats,
            "closed_today": closed_today,
            "avg_wait_time": str(avg_wait) if avg_wait else None,
            "avg_duration": str(avg_duration) if avg_duration else None,
            "avg_rating": round(avg_rating, 1) if avg_rating else None,
            "online_agents": online_agents,
            "total_agents": total_agents,
        }

        return Response(data)


# Public API for chat widget
class PublicChatView(APIView):
    """Public API for chat widget."""

    permission_classes = [AllowAny]

    def get_throttles(self):
        """Use different throttle for GET vs POST."""
        if self.request.method == "POST":
            return [ChatSessionCreationThrottle()]
        return [PublicChatRateThrottle()]

    def get(self, request):
        """Get widget configuration and availability."""
        settings, _ = ChatWidgetSettings.objects.get_or_create(pk=1)
        departments = ChatDepartment.objects.filter(is_active=True)

        # Check if any agents are online
        online_agents = ChatAgent.objects.filter(is_available=True).count()

        return Response(
            {
                "settings": {
                    "primary_color": settings.primary_color,
                    "position": settings.position,
                    "company_name": settings.company_name,
                    "welcome_message": settings.welcome_message,
                    "away_message": settings.away_message,
                    "require_name": settings.require_name,
                    "require_email": settings.require_email,
                    "require_phone": settings.require_phone,
                    "require_department": settings.require_department,
                    "file_upload_enabled": settings.file_upload_enabled,
                    "max_file_size_mb": settings.max_file_size_mb,
                    "show_typing_indicator": settings.show_typing_indicator,
                    "enable_rating": settings.enable_rating,
                },
                "departments": [{"id": str(d.id), "name": d.name} for d in departments],
                "is_online": online_agents > 0,
            }
        )

    def post(self, request):
        """Start a new chat session."""
        serializer = StartChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Check if agents are online
        department_id = serializer.validated_data.get("department")
        if department_id:
            department = ChatDepartment.objects.filter(id=department_id).first()
            if not department or department.online_agents_count == 0:
                # Create offline message instead
                OfflineMessage.objects.create(
                    name=serializer.validated_data.get("visitor_name", ""),
                    email=serializer.validated_data.get("visitor_email", ""),
                    phone=serializer.validated_data.get("visitor_phone", ""),
                    message=serializer.validated_data["initial_message"],
                    department=department,
                    ip_address=request.META.get("REMOTE_ADDR"),
                    page_url=serializer.validated_data.get("page_url", ""),
                )
                return Response(
                    {
                        "offline": True,
                        "message": (
                            department.offline_message
                            if department
                            else "We're currently offline."
                        ),
                    }
                )
        else:
            department = None

        # Create chat session
        session = ChatSession.objects.create(
            session_id=str(uuid.uuid4()),
            department=department,
            visitor_name=serializer.validated_data.get("visitor_name", ""),
            visitor_email=serializer.validated_data.get("visitor_email", ""),
            visitor_phone=serializer.validated_data.get("visitor_phone", ""),
            subject=serializer.validated_data.get("subject", ""),
            initial_message=serializer.validated_data["initial_message"],
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            page_url=serializer.validated_data.get("page_url", ""),
            source=ChatSession.Source.WIDGET,
        )

        # Create initial message
        ChatMessage.objects.create(
            session=session,
            message_type="text",
            sender_type="visitor",
            sender_name=session.visitor_name or "Visitor",
            content=serializer.validated_data["initial_message"],
            delivered_at=timezone.now(),
        )

        # Auto-assign if enabled
        if department and department.auto_assign:
            available_agent = (
                ChatAgent.objects.filter(
                    is_available=True,
                    status=ChatAgent.Status.ONLINE,
                    departments=department,
                    current_chat_count__lt=F("max_concurrent_chats"),
                )
                .order_by("current_chat_count")
                .first()
            )

            if available_agent:
                session.assign_to(available_agent)

        return Response(
            {
                "session_id": session.session_id,
                "status": session.status,
                "assigned_agent": (
                    session.assigned_agent.user.get_full_name()
                    if session.assigned_agent
                    else None
                ),
            },
            status=status.HTTP_201_CREATED,
        )


class PublicChatSessionView(APIView):
    """Public API for chat session operations."""

    permission_classes = [AllowAny]

    def get_throttles(self):
        """Use different throttle for GET vs POST."""
        if self.request.method == "POST":
            return [ChatMessageThrottle()]
        return [PublicChatRateThrottle()]

    def get(self, request, session_id):
        """Get chat session messages."""
        try:
            session = ChatSession.objects.get(session_id=session_id)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )

        messages = session.messages.exclude(is_internal=True)
        serializer = ChatMessageSerializer(messages, many=True)

        return Response(
            {
                "session_id": session.session_id,
                "status": session.status,
                "assigned_agent": (
                    session.assigned_agent.user.get_full_name()
                    if session.assigned_agent
                    else None
                ),
                "messages": serializer.data,
            }
        )

    def post(self, request, session_id):
        """Send a message from visitor."""
        try:
            session = ChatSession.objects.get(session_id=session_id)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )

        if session.status == ChatSession.Status.CLOSED:
            return Response(
                {"error": "Chat is closed"}, status=status.HTTP_400_BAD_REQUEST
            )

        content = request.data.get("content", "").strip()
        if not content:
            return Response(
                {"error": "Message content is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = ChatMessage.objects.create(
            session=session,
            message_type="text",
            sender_type="visitor",
            sender_name=session.visitor_name or "Visitor",
            content=content,
            delivered_at=timezone.now(),
        )

        return Response(
            ChatMessageSerializer(message).data, status=status.HTTP_201_CREATED
        )


class PublicChatRatingView(APIView):
    """Public API for rating a chat."""

    permission_classes = [AllowAny]
    throttle_classes = [PublicChatRateThrottle]

    def post(self, request, session_id):
        """Submit chat rating."""
        try:
            session = ChatSession.objects.get(session_id=session_id)
        except ChatSession.DoesNotExist:
            return Response(
                {"error": "Session not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = RateChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session.rating = serializer.validated_data["rating"]
        session.rating_comment = serializer.validated_data.get("comment", "")
        session.save()

        # Update agent's average rating
        if session.assigned_agent:
            agent = session.assigned_agent
            avg = ChatSession.objects.filter(
                assigned_agent=agent, rating__isnull=False
            ).aggregate(avg=Avg("rating"))["avg"]
            agent.avg_rating = avg
            agent.save()

        return Response({"message": "Thank you for your feedback"})
