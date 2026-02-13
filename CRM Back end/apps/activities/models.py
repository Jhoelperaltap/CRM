"""
Activity Timeline and Internal Comments System.

This module provides:
- Activity: Tracks all interactions with contacts/corporations (emails, documents, notes, changes)
- Comment: Internal comments between team members with @mention support
"""

import re
from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _

from apps.core.models import TimeStampedModel


class Activity(TimeStampedModel):
    """
    Tracks all activities/interactions related to a contact or corporation.

    Activity types include:
    - email_sent / email_received
    - document_uploaded / document_shared
    - note_added
    - comment_added
    - appointment_scheduled / appointment_completed
    - case_created / case_updated / case_closed
    - field_changed (workflow/field updates)
    - task_created / task_completed
    - call_logged
    - meeting_logged
    """

    class ActivityType(models.TextChoices):
        # Email activities
        EMAIL_SENT = "email_sent", _("Email Sent")
        EMAIL_RECEIVED = "email_received", _("Email Received")

        # Document activities
        DOCUMENT_UPLOADED = "document_uploaded", _("Document Uploaded")
        DOCUMENT_SHARED = "document_shared", _("Document Shared")
        DOCUMENT_VIEWED = "document_viewed", _("Document Viewed")

        # Notes and comments
        NOTE_ADDED = "note_added", _("Note Added")
        COMMENT_ADDED = "comment_added", _("Comment Added")

        # Appointments
        APPOINTMENT_SCHEDULED = "appointment_scheduled", _("Appointment Scheduled")
        APPOINTMENT_COMPLETED = "appointment_completed", _("Appointment Completed")
        APPOINTMENT_CANCELLED = "appointment_cancelled", _("Appointment Cancelled")

        # Cases
        CASE_CREATED = "case_created", _("Case Created")
        CASE_UPDATED = "case_updated", _("Case Updated")
        CASE_CLOSED = "case_closed", _("Case Closed")

        # Tasks
        TASK_CREATED = "task_created", _("Task Created")
        TASK_COMPLETED = "task_completed", _("Task Completed")

        # Field changes (workflows)
        FIELD_CHANGED = "field_changed", _("Field Changed")
        STATUS_CHANGED = "status_changed", _("Status Changed")

        # Communication
        CALL_LOGGED = "call_logged", _("Call Logged")
        MEETING_LOGGED = "meeting_logged", _("Meeting Logged")

        # Other
        RECORD_CREATED = "record_created", _("Record Created")
        RECORD_UPDATED = "record_updated", _("Record Updated")
        LINKED = "linked", _("Record Linked")
        UNLINKED = "unlinked", _("Record Unlinked")

    # The entity this activity is related to (Contact or Corporation)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to={"model__in": ["contact", "corporation"]},
    )
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    # Activity metadata
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices,
        db_index=True,
    )

    # Who performed the activity
    performed_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities_performed",
    )

    # Title/summary of the activity
    title = models.CharField(max_length=255)

    # Detailed description (optional)
    description = models.TextField(blank=True, default="")

    # Additional metadata as JSON (for field changes, email details, etc.)
    metadata = models.JSONField(default=dict, blank=True)

    # Optional link to related object (email, document, appointment, etc.)
    related_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_activities",
    )
    related_object_id = models.UUIDField(null=True, blank=True)
    related_object = GenericForeignKey("related_content_type", "related_object_id")

    # For grouping activities (e.g., by department)
    department = models.ForeignKey(
        "users.UserGroup",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activities",
    )

    class Meta:
        verbose_name = _("Activity")
        verbose_name_plural = _("Activities")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["activity_type"]),
            models.Index(fields=["performed_by"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.title}"


class Comment(TimeStampedModel):
    """
    Internal comments on contacts/corporations with @mention support.

    These comments are internal (between team members) and not visible to clients.
    Users can mention other users with @username syntax.
    """

    # The entity this comment is on (Contact or Corporation)
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        limit_choices_to={"model__in": ["contact", "corporation"]},
    )
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    # Who wrote the comment
    author = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="comments_authored",
    )

    # Comment content (can contain @mentions)
    content = models.TextField()

    # Parsed @mentions stored for easy querying
    mentioned_users = models.ManyToManyField(
        "users.User",
        blank=True,
        related_name="comments_mentioned_in",
    )

    # Is this a reply to another comment?
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="replies",
    )

    # Soft delete
    is_deleted = models.BooleanField(default=False)

    # Edit tracking
    is_edited = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["author"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Comment by {self.author} on {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Parse and save @mentions
        self._parse_mentions()

    def _parse_mentions(self):
        """Parse @username mentions from content and link to users."""
        from apps.users.models import User
        from apps.notifications.models import Notification

        # Find all @mentions
        mention_pattern = r"@(\w+)"
        usernames = re.findall(mention_pattern, self.content)

        if usernames:
            # Find matching users
            for username in usernames:
                matching_users = User.objects.filter(
                    models.Q(first_name__iexact=username) |
                    models.Q(email__istartswith=f"{username}@")
                )
                for user in matching_users:
                    # Add to mentioned_users
                    self.mentioned_users.add(user)

                    # Send notification (don't notify yourself)
                    if user.id != self.author_id:
                        # Determine entity name for the notification
                        entity_name = ""
                        if self.content_object:
                            entity_name = getattr(self.content_object, "full_name", None) or \
                                          getattr(self.content_object, "name", str(self.content_object))

                        Notification.objects.create(
                            recipient=user,
                            notification_type=Notification.Type.MENTION,
                            title=f"{self.author.full_name} mentioned you",
                            message=f"You were mentioned in a comment on {entity_name}: \"{self.content[:100]}{'...' if len(self.content) > 100 else ''}\"",
                            severity=Notification.Severity.INFO,
                            related_object_type=self.content_type.model if self.content_type else "",
                            related_object_id=self.object_id,
                            action_url=f"/{self.content_type.model}s/{self.object_id}" if self.content_type else "",
                        )


class CommentReaction(TimeStampedModel):
    """
    Reactions to comments (like, thumbs up, etc.).
    """

    class ReactionType(models.TextChoices):
        LIKE = "like", _("Like")
        THUMBS_UP = "thumbs_up", _("Thumbs Up")
        HEART = "heart", _("Heart")
        CELEBRATE = "celebrate", _("Celebrate")

    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="comment_reactions",
    )
    reaction_type = models.CharField(
        max_length=20,
        choices=ReactionType.choices,
        default=ReactionType.LIKE,
    )

    class Meta:
        verbose_name = _("Comment Reaction")
        verbose_name_plural = _("Comment Reactions")
        unique_together = ["comment", "user", "reaction_type"]

    def __str__(self):
        return f"{self.user} - {self.reaction_type} on {self.comment_id}"
