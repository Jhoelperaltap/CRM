"""
Views for Activity Timeline and Comments.
"""

from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.activities.models import Activity, Comment, CommentReaction
from apps.activities.serializers import (
    ActivityCreateSerializer,
    ActivitySerializer,
    CommentCreateSerializer,
    CommentSerializer,
    CommentUpdateSerializer,
    DepartmentMentionSuggestionSerializer,
    MentionSuggestionSerializer,
)
from apps.users.models import Department, User


class ActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for activities.

    Provides endpoints for:
    - Listing activities for a contact/corporation
    - Creating activities
    - Filtering by activity type
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ActivitySerializer

    def get_queryset(self):
        queryset = Activity.objects.select_related(
            "performed_by", "content_type", "related_content_type", "department"
        ).all()

        # Filter by entity (contact or corporation)
        entity_type = self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("entity_id")

        if entity_type and entity_id:
            try:
                content_type = ContentType.objects.get(model=entity_type)
                queryset = queryset.filter(
                    content_type=content_type, object_id=entity_id
                )
            except ContentType.DoesNotExist:
                return Activity.objects.none()

        # Filter by activity type
        activity_type = self.request.query_params.get("activity_type")
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)

        # Filter by department
        department = self.request.query_params.get("department")
        if department:
            queryset = queryset.filter(department_id=department)

        # Filter by user who performed the activity
        performed_by = self.request.query_params.get("performed_by")
        if performed_by:
            queryset = queryset.filter(performed_by_id=performed_by)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return ActivityCreateSerializer
        return ActivitySerializer

    @action(detail=False, methods=["get"])
    def types(self, request):
        """Return all available activity types."""
        types = [
            {"value": choice[0], "label": choice[1]}
            for choice in Activity.ActivityType.choices
        ]
        return Response(types)


class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for comments.

    Provides endpoints for:
    - Listing comments for a contact/corporation
    - Creating comments with @mentions
    - Editing/deleting own comments
    - Replying to comments
    - Adding reactions
    - Attaching files to department folders
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = CommentSerializer

    def get_queryset(self):
        queryset = (
            Comment.objects.select_related("author", "content_type", "parent", "department_folder", "department_folder__department")
            .prefetch_related("mentioned_users", "mentioned_departments", "reactions", "replies")
            .filter(is_deleted=False)
        )

        # Filter by entity (contact or corporation)
        entity_type = self.request.query_params.get("entity_type")
        entity_id = self.request.query_params.get("entity_id")

        if entity_type and entity_id:
            try:
                content_type = ContentType.objects.get(model=entity_type)
                queryset = queryset.filter(
                    content_type=content_type, object_id=entity_id
                )
            except ContentType.DoesNotExist:
                return Comment.objects.none()

        # Only show top-level comments (not replies) by default
        include_replies = self.request.query_params.get("include_replies", "false")
        if include_replies.lower() != "true":
            queryset = queryset.filter(parent__isnull=True)

        return queryset.order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return CommentCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return CommentUpdateSerializer
        return CommentSerializer

    def perform_destroy(self, instance):
        """Soft delete instead of hard delete."""
        instance.is_deleted = True
        instance.save()

    @action(detail=True, methods=["get"])
    def replies(self, request, pk=None):
        """Get replies to a comment."""
        comment = self.get_object()
        replies = comment.replies.filter(is_deleted=False).order_by("created_at")
        serializer = CommentSerializer(replies, many=True, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def react(self, request, pk=None):
        """Add a reaction to a comment."""
        comment = self.get_object()
        reaction_type = request.data.get("reaction_type", "like")

        if reaction_type not in dict(CommentReaction.ReactionType.choices):
            return Response(
                {"error": "Invalid reaction type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Toggle reaction - remove if exists, add if not
        existing = CommentReaction.objects.filter(
            comment=comment, user=request.user, reaction_type=reaction_type
        ).first()

        if existing:
            existing.delete()
            return Response({"status": "removed"})
        else:
            CommentReaction.objects.create(
                comment=comment, user=request.user, reaction_type=reaction_type
            )
            return Response({"status": "added"})

    @action(detail=False, methods=["get"])
    def mention_suggestions(self, request):
        """
        Get user and department suggestions for @mentions.

        Query params:
        - q: Search query (searches first name, last name, email for users; name, code for departments)
        - limit: Max results (default 10)
        - type: Filter by type ('user', 'department', or 'all' - default)
        """
        query = request.query_params.get("q", "")
        limit = int(request.query_params.get("limit", 10))
        suggestion_type = request.query_params.get("type", "all")

        if len(query) < 1:
            return Response([])

        results = []

        # Get user suggestions
        if suggestion_type in ["all", "user"]:
            users = User.objects.filter(
                Q(first_name__icontains=query)
                | Q(last_name__icontains=query)
                | Q(email__icontains=query)
            ).filter(is_active=True)[:limit]

            user_serializer = MentionSuggestionSerializer(users, many=True)
            results.extend(user_serializer.data)

        # Get department suggestions
        if suggestion_type in ["all", "department"]:
            departments = Department.objects.filter(
                Q(name__icontains=query) | Q(code__icontains=query)
            ).filter(is_active=True)[:limit]

            dept_serializer = DepartmentMentionSuggestionSerializer(
                departments, many=True
            )
            results.extend(dept_serializer.data)

        # Sort by display_name and limit total results
        results = sorted(results, key=lambda x: x.get("display_name", ""))[:limit]

        return Response(results)


def create_activity_for_email(email_message, activity_type="email_sent"):
    """
    Helper function to create an activity when an email is sent/received.
    Called from email app signals.
    """
    if not email_message.contact:
        return None

    content_type = ContentType.objects.get(model="contact")

    title = f"{email_message.from_address} sent email"
    if activity_type == "email_received":
        title = f"Email received from {email_message.from_address}"

    activity = Activity.objects.create(
        content_type=content_type,
        object_id=email_message.contact_id,
        activity_type=activity_type,
        title=title,
        description=email_message.subject,
        performed_by=(
            email_message.sent_by if hasattr(email_message, "sent_by") else None
        ),
        metadata={
            "subject": email_message.subject,
            "to": email_message.to_addresses,
            "from": email_message.from_address,
        },
        related_content_type=ContentType.objects.get_for_model(email_message),
        related_object_id=email_message.id,
    )
    return activity


def create_activity_for_document(document, activity_type="document_uploaded"):
    """
    Helper function to create an activity when a document is uploaded/shared.
    Called from document app signals.
    """
    content_type = None
    object_id = None

    if document.contact:
        content_type = ContentType.objects.get(model="contact")
        object_id = document.contact_id
    elif document.corporation:
        content_type = ContentType.objects.get(model="corporation")
        object_id = document.corporation_id
    else:
        return None

    activity = Activity.objects.create(
        content_type=content_type,
        object_id=object_id,
        activity_type=activity_type,
        title=f"Document uploaded: {document.title}",
        description=document.description or "",
        performed_by=document.uploaded_by,
        metadata={
            "file_name": document.title,
            "file_type": document.doc_type,
            "file_size": document.file_size,
        },
        related_content_type=ContentType.objects.get_for_model(document),
        related_object_id=document.id,
    )
    return activity


def create_activity_for_appointment(appointment, activity_type="appointment_scheduled"):
    """
    Helper function to create an activity when an appointment is created/updated.
    """
    if not appointment.contact:
        return None

    content_type = ContentType.objects.get(model="contact")

    activity = Activity.objects.create(
        content_type=content_type,
        object_id=appointment.contact_id,
        activity_type=activity_type,
        title=f"Appointment: {appointment.title}",
        description=f"Scheduled for {appointment.start_datetime}",
        performed_by=(
            appointment.created_by if hasattr(appointment, "created_by") else None
        ),
        metadata={
            "start": str(appointment.start_datetime),
            "end": str(appointment.end_datetime),
            "location": appointment.location,
            "status": appointment.status,
        },
        related_content_type=ContentType.objects.get_for_model(appointment),
        related_object_id=appointment.id,
    )
    return activity
