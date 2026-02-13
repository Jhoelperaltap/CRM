from django.urls import path

from apps.chatbot.views import (
    PortalAppointmentSlotsView,
    PortalBookAppointmentView,
    PortalChatConversationView,
    PortalChatHistoryView,
    PortalChatStartView,
    PortalChatView,
)

app_name = "chatbot_portal"

urlpatterns = [
    path("start/", PortalChatStartView.as_view(), name="start"),
    path("message/", PortalChatView.as_view(), name="message"),
    path("history/", PortalChatHistoryView.as_view(), name="history"),
    path(
        "conversation/<uuid:conversation_id>/",
        PortalChatConversationView.as_view(),
        name="conversation",
    ),
    path("slots/", PortalAppointmentSlotsView.as_view(), name="slots"),
    path("book/", PortalBookAppointmentView.as_view(), name="book"),
]
