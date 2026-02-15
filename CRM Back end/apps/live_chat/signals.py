"""
Signals for live chat notifications and updates.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ChatMessage, ChatSession, OfflineMessage


@receiver(post_save, sender=ChatSession)
def on_chat_session_created(sender, instance, created, **kwargs):
    """Handle new chat session creation."""
    if created:
        # Notify agents about new waiting chat
        if instance.status == ChatSession.Status.WAITING:
            from apps.notifications.models import Notification

            # Find agents in the department
            if instance.department:
                agents = instance.department.agents.filter(is_available=True)
                for agent in agents:
                    Notification.objects.create(
                        user=agent.user,
                        type="new_chat",
                        title="New Chat Waiting",
                        message=f"New chat from {instance.visitor_name or 'Anonymous'}",
                        link=f"/live-chat?session={instance.session_id}",
                        priority="high",
                    )


@receiver(post_save, sender=ChatMessage)
def on_chat_message_created(sender, instance, created, **kwargs):
    """Handle new chat message."""
    if created and instance.sender_type == "visitor":
        session = instance.session
        if session.assigned_agent:
            from apps.notifications.models import Notification

            Notification.objects.create(
                user=session.assigned_agent.user,
                type="chat_message",
                title="New Chat Message",
                message=f"{session.visitor_name or 'Visitor'}: {instance.content[:50]}",
                link=f"/live-chat?session={session.session_id}",
                priority="medium",
            )


@receiver(post_save, sender=OfflineMessage)
def on_offline_message_created(sender, instance, created, **kwargs):
    """Handle new offline message."""
    if created:
        from django.contrib.auth import get_user_model

        from apps.notifications.models import Notification

        User = get_user_model()

        # Notify admins about offline message
        admins = User.objects.filter(role__slug="admin", is_active=True)
        for admin in admins:
            Notification.objects.create(
                user=admin,
                type="offline_message",
                title="New Offline Message",
                message=f"Message from {instance.name}: {instance.message[:50]}",
                link="/live-chat/offline-messages",
                priority="medium",
            )
