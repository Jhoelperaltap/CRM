"""
Tests for chatbot API views.
"""

import pytest
from rest_framework import status

from apps.chatbot.models import (
    ChatbotConversation,
)
from tests.factories import (
    ChatbotAppointmentSlotFactory,
    ChatbotConfigurationFactory,
    ChatbotConversationFactory,
    ChatbotKnowledgeEntryFactory,
    ChatbotMessageFactory,
    UserFactory,
)

BASE_CHATBOT = "/api/v1/chatbot/"


@pytest.mark.django_db
class TestChatbotConfigurationView:
    """Tests for ChatbotConfigurationView."""

    def test_get_configuration(self, admin_client):
        ChatbotConfigurationFactory(company_name="Test Company")

        resp = admin_client.get(f"{BASE_CHATBOT}config/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["company_name"] == "Test Company"

    def test_update_configuration(self, admin_client):
        ChatbotConfigurationFactory()

        resp = admin_client.patch(
            f"{BASE_CHATBOT}config/",
            {
                "company_name": "Updated Company",
                "is_active": False,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["company_name"] == "Updated Company"
        assert resp.data["is_active"] is False

    def test_non_admin_cannot_access(self, authenticated_client):
        resp = authenticated_client.get(f"{BASE_CHATBOT}config/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestChatbotKnowledgeViewSet:
    """Tests for ChatbotKnowledgeViewSet."""

    def test_list_knowledge_entries(self, admin_client):
        config = ChatbotConfigurationFactory()
        ChatbotKnowledgeEntryFactory(configuration=config, title="FAQ 1")
        ChatbotKnowledgeEntryFactory(configuration=config, title="FAQ 2")

        resp = admin_client.get(f"{BASE_CHATBOT}knowledge/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_create_knowledge_entry(self, admin_client):
        config = ChatbotConfigurationFactory()

        resp = admin_client.post(
            f"{BASE_CHATBOT}knowledge/",
            {
                "configuration": str(config.id),
                "entry_type": "faq",
                "title": "New FAQ",
                "content": "This is the answer.",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "New FAQ"

    def test_filter_by_type(self, admin_client):
        config = ChatbotConfigurationFactory()
        ChatbotKnowledgeEntryFactory(configuration=config, entry_type="faq")
        ChatbotKnowledgeEntryFactory(configuration=config, entry_type="service")

        resp = admin_client.get(f"{BASE_CHATBOT}knowledge/?type=faq")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1

    def test_delete_knowledge_entry(self, admin_client):
        config = ChatbotConfigurationFactory()
        entry = ChatbotKnowledgeEntryFactory(configuration=config)

        resp = admin_client.delete(f"{BASE_CHATBOT}knowledge/{entry.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestChatbotAppointmentSlotViewSet:
    """Tests for ChatbotAppointmentSlotViewSet."""

    def test_list_slots(self, admin_client):
        ChatbotAppointmentSlotFactory(day_of_week=0)
        ChatbotAppointmentSlotFactory(day_of_week=1)

        resp = admin_client.get(f"{BASE_CHATBOT}slots/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_create_slot(self, admin_client):
        resp = admin_client.post(
            f"{BASE_CHATBOT}slots/",
            {
                "day_of_week": 2,
                "start_time": "09:00:00",
                "end_time": "12:00:00",
                "slot_duration_minutes": 30,
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["day_of_week"] == 2

    def test_update_slot(self, admin_client):
        slot = ChatbotAppointmentSlotFactory()

        resp = admin_client.patch(
            f"{BASE_CHATBOT}slots/{slot.id}/",
            {"is_active": False},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_active"] is False


@pytest.mark.django_db
class TestChatbotConversationViewSet:
    """Tests for ChatbotConversationViewSet."""

    def test_list_conversations(self, admin_client):
        ChatbotConversationFactory()
        ChatbotConversationFactory()

        resp = admin_client.get(f"{BASE_CHATBOT}conversations/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_filter_by_status(self, admin_client):
        ChatbotConversationFactory(status="active")
        ChatbotConversationFactory(status="closed")

        resp = admin_client.get(f"{BASE_CHATBOT}conversations/?status=active")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1

    def test_get_conversation_detail(self, admin_client):
        conversation = ChatbotConversationFactory()
        ChatbotMessageFactory(conversation=conversation, content="Hello")
        ChatbotMessageFactory(conversation=conversation, content="Hi there")

        resp = admin_client.get(f"{BASE_CHATBOT}conversations/{conversation.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert "messages" in resp.data

    def test_close_conversation(self, admin_client):
        conversation = ChatbotConversationFactory(status="active")

        resp = admin_client.post(
            f"{BASE_CHATBOT}conversations/{conversation.id}/close/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "closed"

        conversation.refresh_from_db()
        assert conversation.status == ChatbotConversation.Status.CLOSED
        assert conversation.closed_at is not None

    def test_assign_conversation(self, admin_client):
        conversation = ChatbotConversationFactory(status="active")
        staff = UserFactory()

        resp = admin_client.post(
            f"{BASE_CHATBOT}conversations/{conversation.id}/assign/",
            {"staff_id": str(staff.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        conversation.refresh_from_db()
        assert conversation.assigned_staff == staff
        assert conversation.status == ChatbotConversation.Status.HANDED_OFF

    def test_assign_without_staff_id(self, admin_client):
        conversation = ChatbotConversationFactory()

        resp = admin_client.post(
            f"{BASE_CHATBOT}conversations/{conversation.id}/assign/",
            {},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestChatbotStatsView:
    """Tests for ChatbotStatsView."""

    def test_get_stats(self, admin_client):
        ChatbotConversationFactory(status="active")
        ChatbotConversationFactory(status="active")
        ChatbotConversationFactory(status="handed_off")
        ChatbotConversationFactory(status="closed")

        resp = admin_client.get(f"{BASE_CHATBOT}stats/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_conversations"] == 4
        assert resp.data["active_conversations"] == 2
        assert resp.data["handed_off_conversations"] == 1

    def test_non_admin_cannot_access_stats(self, authenticated_client):
        resp = authenticated_client.get(f"{BASE_CHATBOT}stats/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
