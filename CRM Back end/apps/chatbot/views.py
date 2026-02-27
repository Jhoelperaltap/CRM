import logging
from datetime import datetime, timedelta

from django.db.models import Count, Max
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chatbot.ai_service import (
    ChatbotAIService,
    book_appointment,
    get_available_slots,
)
from apps.chatbot.models import (
    ChatbotAppointmentSlot,
    ChatbotConfiguration,
    ChatbotConversation,
    ChatbotKnowledgeEntry,
    ChatbotMessage,
)
from apps.chatbot.serializers import (
    ChatbotAppointmentSlotSerializer,
    ChatbotConfigurationSerializer,
    ChatbotConfigurationUpdateSerializer,
    ChatbotConversationDetailSerializer,
    ChatbotConversationListSerializer,
    ChatbotKnowledgeEntryCreateSerializer,
    ChatbotKnowledgeEntrySerializer,
    PortalBookAppointmentSerializer,
    PortalChatMessageSerializer,
    PortalChatResponseSerializer,
    PortalConversationSerializer,
)
from apps.portal.permissions import IsPortalAuthenticated
from apps.users.permissions import IsAdminRole

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Admin Views
# ---------------------------------------------------------------------------


class ChatbotConfigurationView(APIView):
    """
    GET   -> returns the current chatbot configuration
    PATCH -> updates the configuration
    """

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        config = ChatbotConfiguration.load()
        serializer = ChatbotConfigurationSerializer(config)
        return Response(serializer.data)

    def patch(self, request):
        config = ChatbotConfiguration.load()
        serializer = ChatbotConfigurationUpdateSerializer(
            config, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ChatbotConfigurationSerializer(config).data)


class ChatbotKnowledgeViewSet(viewsets.ModelViewSet):
    """CRUD for knowledge base entries."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = ChatbotKnowledgeEntry.objects.all()
    pagination_class = None  # Settings page doesn't need pagination

    def get_serializer_class(self):
        if self.action == "create":
            return ChatbotKnowledgeEntryCreateSerializer
        return ChatbotKnowledgeEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        entry_type = self.request.query_params.get("type")
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        return qs


class ChatbotAppointmentSlotViewSet(viewsets.ModelViewSet):
    """CRUD for appointment slots."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = ChatbotAppointmentSlot.objects.all()
    serializer_class = ChatbotAppointmentSlotSerializer
    pagination_class = None  # Settings page doesn't need pagination


class ChatbotConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of chatbot conversations for admin."""

    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = ChatbotConversation.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ChatbotConversationDetailSerializer
        return ChatbotConversationListSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related("contact", "assigned_staff")
        qs = qs.annotate(
            message_count=Count("messages"),
            last_message_at=Max("messages__created_at"),
        )

        # Filter by status
        conv_status = self.request.query_params.get("status")
        if conv_status:
            qs = qs.filter(status=conv_status)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        """Close a conversation."""
        conversation = self.get_object()
        conversation.status = ChatbotConversation.Status.CLOSED
        conversation.closed_at = timezone.now()
        conversation.save()
        return Response({"status": "closed"})

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        """Assign a handed-off conversation to staff."""
        conversation = self.get_object()
        staff_id = request.data.get("staff_id")

        if not staff_id:
            return Response(
                {"detail": "staff_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.users.models import User

        try:
            staff = User.objects.get(pk=staff_id, is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "Staff member not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        conversation.assigned_staff = staff
        conversation.status = ChatbotConversation.Status.HANDED_OFF
        conversation.handed_off_at = timezone.now()
        conversation.save()

        return Response(ChatbotConversationDetailSerializer(conversation).data)


class ChatbotStatsView(APIView):
    """Dashboard statistics for chatbot."""

    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        # Total conversations
        total_conversations = ChatbotConversation.objects.count()
        active_conversations = ChatbotConversation.objects.filter(
            status=ChatbotConversation.Status.ACTIVE
        ).count()
        handed_off = ChatbotConversation.objects.filter(
            status=ChatbotConversation.Status.HANDED_OFF
        ).count()

        # This week's activity
        weekly_conversations = ChatbotConversation.objects.filter(
            created_at__date__gte=week_ago
        ).count()
        weekly_messages = ChatbotMessage.objects.filter(
            created_at__date__gte=week_ago
        ).count()

        # Appointments booked via chatbot this week
        from apps.appointments.models import Appointment

        weekly_appointments = Appointment.objects.filter(
            created_at__date__gte=week_ago,
            notes__icontains="chatbot",
        ).count()

        return Response(
            {
                "total_conversations": total_conversations,
                "active_conversations": active_conversations,
                "handed_off_conversations": handed_off,
                "weekly_conversations": weekly_conversations,
                "weekly_messages": weekly_messages,
                "weekly_appointments_booked": weekly_appointments,
            }
        )


# ---------------------------------------------------------------------------
# CRM Chat Views (Internal Staff)
# ---------------------------------------------------------------------------


class CRMChatView(APIView):
    """Chat endpoint for CRM users (internal staff)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.chatbot.serializers import PortalChatMessageSerializer

        serializer = PortalChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data["message"]
        conversation_id = serializer.validated_data.get("conversation_id")

        # Load configuration
        config = ChatbotConfiguration.load()
        if not config.is_active:
            return Response(
                {"detail": "Chat service is currently unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Get or create conversation for CRM user
        user = request.user
        if conversation_id:
            try:
                conversation = ChatbotConversation.objects.get(
                    pk=conversation_id,
                    status=ChatbotConversation.Status.ACTIVE,
                )
                # Verify the conversation belongs to this user (via crm_user field)
                if hasattr(conversation, 'crm_user') and conversation.crm_user != user:
                    conversation = self._create_crm_conversation(user)
            except ChatbotConversation.DoesNotExist:
                conversation = self._create_crm_conversation(user)
        else:
            conversation = self._create_crm_conversation(user)

        # Save user message
        ChatbotMessage.objects.create(
            conversation=conversation,
            role=ChatbotMessage.Role.USER,
            content=user_message,
        )

        # Check if API key is configured
        if not config.api_key:
            return Response(
                {
                    "conversation_id": str(conversation.id),
                    "message": "I'm sorry, the chat service is not fully configured. Please contact the administrator.",
                    "action": None,
                    "metadata": {},
                    "status": "error",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Get AI response with CRM audience
        try:
            ai_service = ChatbotAIService(config)
            response = ai_service.get_response(
                conversation,
                user_message,
                include_functions=False,  # CRM chat doesn't need appointment booking
                audience="crm",  # Use CRM knowledge base
            )
        except Exception as e:
            logger.error(f"ChatbotAIService error (CRM): {e}")
            return Response(
                {
                    "conversation_id": str(conversation.id),
                    "message": "I'm sorry, there was an error processing your message. Please try again.",
                    "action": None,
                    "metadata": {},
                    "status": "error",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        response_content = response.get("content", "")

        # Save assistant response
        ChatbotMessage.objects.create(
            conversation=conversation,
            role=ChatbotMessage.Role.ASSISTANT,
            content=response_content,
            tokens_used=response.get("tokens_used", 0),
        )

        return Response(
            {
                "conversation_id": str(conversation.id),
                "message": response_content,
                "action": None,
                "metadata": {},
                "status": conversation.status,
            }
        )

    def _create_crm_conversation(self, user):
        """Create a conversation for CRM user."""
        # CRM users don't have a contact, so we need to handle this differently
        # We'll create a special contact or use a placeholder
        from apps.contacts.models import Contact

        # Try to find or create a system contact for CRM chat
        system_contact, _ = Contact.objects.get_or_create(
            email=f"crm-chat-{user.id}@system.internal",
            defaults={
                "first_name": user.first_name or "CRM",
                "last_name": user.last_name or "User",
                "status": "active",
            },
        )
        return ChatbotConversation.objects.create(contact=system_contact)


class CRMChatHistoryView(APIView):
    """Get chat history for CRM user - returns the most recent active conversation."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Get the most recent active conversation for this CRM user
        system_email = f"crm-chat-{user.id}@system.internal"
        conversation = ChatbotConversation.objects.filter(
            contact__email=system_email,
            status=ChatbotConversation.Status.ACTIVE,
        ).prefetch_related("messages").order_by("-created_at").first()

        if not conversation:
            return Response({
                "conversation_id": None,
                "status": None,
                "messages": [],
            })

        # Return single conversation with messages
        messages_data = [
            {
                "id": str(msg.id),
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in conversation.messages.all()
        ]

        return Response({
            "conversation_id": str(conversation.id),
            "status": conversation.status,
            "messages": messages_data,
        })


class CRMChatStartView(APIView):
    """Start a new CRM chat conversation."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        config = ChatbotConfiguration.load()
        if not config.is_active:
            return Response(
                {"detail": "Chat service is currently unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        user = request.user
        from apps.contacts.models import Contact

        # Create or get system contact for this user
        system_contact, _ = Contact.objects.get_or_create(
            email=f"crm-chat-{user.id}@system.internal",
            defaults={
                "first_name": user.first_name or "CRM",
                "last_name": user.last_name or "User",
                "status": "active",
            },
        )

        conversation = ChatbotConversation.objects.create(contact=system_contact)

        # Create welcome message for CRM
        welcome_message = (
            f"Hello {user.first_name or 'there'}! I'm the EJFLOW CRM assistant. "
            "I can help you with questions about the CRM system, including:\n\n"
            "- Managing contacts and corporations\n"
            "- Working with tax cases\n"
            "- User management and permissions\n"
            "- Documents and file management\n"
            "- Invoices and billing\n"
            "- System settings and configuration\n\n"
            "How can I help you today?"
        )

        ChatbotMessage.objects.create(
            conversation=conversation,
            role=ChatbotMessage.Role.ASSISTANT,
            content=welcome_message,
        )

        return Response(
            {
                "conversation_id": conversation.id,
                "message": welcome_message,
                "status": conversation.status,
            }
        )


# ---------------------------------------------------------------------------
# Portal Views (Client-facing)
# ---------------------------------------------------------------------------


class PortalChatView(APIView):
    """Main chat endpoint for portal clients."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def post(self, request):
        serializer = PortalChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data["message"]
        conversation_id = serializer.validated_data.get("conversation_id")

        # Load configuration
        config = ChatbotConfiguration.load()
        if not config.is_active:
            return Response(
                {"detail": "Chat service is currently unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Get or create conversation
        contact = request.portal_access.contact
        if conversation_id:
            try:
                conversation = ChatbotConversation.objects.get(
                    pk=conversation_id,
                    contact=contact,
                    status=ChatbotConversation.Status.ACTIVE,
                )
            except ChatbotConversation.DoesNotExist:
                conversation = ChatbotConversation.objects.create(contact=contact)
        else:
            conversation = ChatbotConversation.objects.create(contact=contact)

        # Save user message
        ChatbotMessage.objects.create(
            conversation=conversation,
            role=ChatbotMessage.Role.USER,
            content=user_message,
        )

        # Check if API key is configured
        if not config.api_key:
            return Response(
                {
                    "conversation_id": str(conversation.id),
                    "message": "I'm sorry, the chat service is not fully configured. Please contact support.",
                    "action": None,
                    "metadata": {},
                    "status": "error",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Get AI response
        try:
            ai_service = ChatbotAIService(config)
            response = ai_service.get_response(conversation, user_message)
        except Exception as e:
            logger.error(f"ChatbotAIService error: {e}")
            return Response(
                {
                    "conversation_id": str(conversation.id),
                    "message": "I'm sorry, there was an error processing your message. Please try again.",
                    "action": None,
                    "metadata": {},
                    "status": "error",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Process actions
        action = response.get("action")
        metadata = response.get("metadata", {})
        response_content = response.get("content", "")

        if action == "check_appointment_availability":
            # Get available slots
            start_date = datetime.strptime(
                metadata.get("start_date", timezone.now().strftime("%Y-%m-%d")),
                "%Y-%m-%d",
            )
            end_date_str = metadata.get("end_date")
            end_date = (
                datetime.strptime(end_date_str, "%Y-%m-%d")
                if end_date_str
                else start_date + timedelta(days=7)
            )

            slots = get_available_slots(start_date, end_date)
            metadata["available_slots"] = slots

            if slots:
                response_content = f"I found {len(slots)} available appointment slots. Here are some options:\n\n"
                for slot in slots[:5]:  # Show first 5
                    slot_date = datetime.strptime(slot["date"], "%Y-%m-%d")
                    response_content += (
                        f"- {slot_date.strftime('%A, %B %d')} at {slot['time']}\n"
                    )
                response_content += "\nWould you like to book one of these times?"
            else:
                response_content = (
                    "I'm sorry, there are no available appointment slots in that "
                    "time range. Would you like to check a different week, or "
                    "would you prefer to speak with a representative?"
                )

        elif action == "book_appointment":
            result = book_appointment(
                contact=contact,
                date_str=metadata.get("date"),
                time_str=metadata.get("time"),
                service_type=metadata.get("service_type", "general_inquiry"),
                notes=metadata.get("notes", ""),
            )
            metadata["booking_result"] = result
            response_content = result["message"]

            if result["success"]:
                action = "appointment_confirmed"
            else:
                action = "appointment_failed"

        elif action == "request_human_handoff":
            conversation.status = ChatbotConversation.Status.HANDED_OFF
            conversation.handed_off_at = timezone.now()
            conversation.save()
            response_content = config.handoff_message

        # Check for off-topic fallback
        if not action and config.fallback_message in response_content:
            conversation.fallback_count += 1
            if conversation.fallback_count >= config.max_fallbacks_before_handoff:
                response_content += (
                    "\n\nI notice I'm having trouble helping you. "
                    "Would you like me to connect you with a representative?"
                )
            conversation.save()

        # Save assistant response
        ChatbotMessage.objects.create(
            conversation=conversation,
            role=ChatbotMessage.Role.ASSISTANT,
            content=response_content,
            message_type=(
                ChatbotMessage.MessageType.APPOINTMENT_CONFIRM
                if action == "appointment_confirmed"
                else (
                    ChatbotMessage.MessageType.HANDOFF_REQUEST
                    if action == "request_human_handoff"
                    else ChatbotMessage.MessageType.TEXT
                )
            ),
            metadata=metadata,
            tokens_used=response.get("tokens_used", 0),
        )

        return Response(
            PortalChatResponseSerializer(
                {
                    "conversation_id": conversation.id,
                    "message": response_content,
                    "action": action,
                    "metadata": metadata,
                    "status": conversation.status,
                }
            ).data
        )


class PortalChatHistoryView(APIView):
    """Get conversation history for portal client."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def get(self, request):
        contact = request.portal_access.contact
        conversations = ChatbotConversation.objects.filter(
            contact=contact
        ).prefetch_related("messages")

        serializer = PortalConversationSerializer(conversations, many=True)
        return Response(serializer.data)


class PortalChatConversationView(APIView):
    """Get a specific conversation."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def get(self, request, conversation_id):
        contact = request.portal_access.contact
        try:
            conversation = ChatbotConversation.objects.prefetch_related("messages").get(
                pk=conversation_id, contact=contact
            )
        except ChatbotConversation.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = PortalConversationSerializer(conversation)
        return Response(serializer.data)


class PortalChatStartView(APIView):
    """Start a new conversation and get welcome message."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def post(self, request):
        config = ChatbotConfiguration.load()
        if not config.is_active:
            return Response(
                {"detail": "Chat service is currently unavailable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        contact = request.portal_access.contact
        conversation = ChatbotConversation.objects.create(contact=contact)

        # Create welcome message
        ChatbotMessage.objects.create(
            conversation=conversation,
            role=ChatbotMessage.Role.ASSISTANT,
            content=config.welcome_message,
        )

        return Response(
            {
                "conversation_id": conversation.id,
                "message": config.welcome_message,
                "status": conversation.status,
            }
        )


class PortalAppointmentSlotsView(APIView):
    """Get available appointment slots."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def get(self, request):
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        if start_date_str:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        else:
            start_date = timezone.now()

        if end_date_str:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        else:
            end_date = start_date + timedelta(days=14)

        slots = get_available_slots(start_date, end_date)
        return Response(slots)


class PortalBookAppointmentView(APIView):
    """Book an appointment directly (without chat)."""

    permission_classes = [IsPortalAuthenticated]
    authentication_classes = []

    def post(self, request):
        serializer = PortalBookAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        contact = request.portal_access.contact
        result = book_appointment(
            contact=contact,
            date_str=serializer.validated_data["date"].isoformat(),
            time_str=serializer.validated_data["time"].strftime("%H:%M"),
            service_type=serializer.validated_data["service_type"],
            notes=serializer.validated_data.get("notes", ""),
        )

        if result["success"]:
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
