"""
Tests for live_chat API views.
"""

import pytest
from rest_framework import status

from apps.live_chat.models import ChatAgent, ChatSession
from tests.factories import (
    CannedResponseFactory,
    ChatAgentFactory,
    ChatDepartmentFactory,
    ChatMessageFactory,
    ChatSessionFactory,
    ChatWidgetSettingsFactory,
    OfflineMessageFactory,
)

BASE_CHAT = "/api/v1/live-chat/"


@pytest.mark.django_db
class TestChatDepartmentViewSet:
    """Tests for ChatDepartmentViewSet."""

    def test_list_departments(self, admin_client):
        ChatDepartmentFactory(name="Sales", order=1)
        ChatDepartmentFactory(name="Support", order=0)

        resp = admin_client.get(f"{BASE_CHAT}departments/")
        assert resp.status_code == status.HTTP_200_OK
        # Ordered by order, name
        assert resp.data["results"][0]["name"] == "Support"
        assert resp.data["results"][1]["name"] == "Sales"

    def test_list_departments_filter_active(self, admin_client):
        ChatDepartmentFactory(name="Active", is_active=True)
        ChatDepartmentFactory(name="Inactive", is_active=False)

        resp = admin_client.get(f"{BASE_CHAT}departments/?is_active=true")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["name"] == "Active"

    def test_create_department(self, admin_client):
        resp = admin_client.post(
            f"{BASE_CHAT}departments/",
            {"name": "New Department", "description": "Test dept"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Department"

    def test_unauthenticated_access(self, api_client):
        resp = api_client.get(f"{BASE_CHAT}departments/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestChatAgentViewSet:
    """Tests for ChatAgentViewSet."""

    def test_get_agent_me(self, admin_client, admin_user):
        resp = admin_client.get(f"{BASE_CHAT}agents/me/")
        assert resp.status_code == status.HTTP_200_OK
        # Agent should be created if not exists
        assert ChatAgent.objects.filter(user=admin_user).exists()

    def test_go_online(self, admin_client, admin_user):
        agent = ChatAgentFactory(user=admin_user, is_available=False, status="offline")

        resp = admin_client.post(f"{BASE_CHAT}agents/go_online/")
        assert resp.status_code == status.HTTP_200_OK

        agent.refresh_from_db()
        assert agent.is_available is True
        assert agent.status == ChatAgent.Status.ONLINE

    def test_go_offline(self, admin_client, admin_user):
        agent = ChatAgentFactory(user=admin_user, is_available=True, status="online")

        resp = admin_client.post(f"{BASE_CHAT}agents/go_offline/")
        assert resp.status_code == status.HTTP_200_OK

        agent.refresh_from_db()
        assert agent.is_available is False
        assert agent.status == ChatAgent.Status.OFFLINE

    def test_update_status(self, admin_client, admin_user):
        ChatAgentFactory(user=admin_user, status="offline")

        resp = admin_client.post(
            f"{BASE_CHAT}agents/update_status/",
            {"status": "away", "status_message": "In a meeting"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "away"
        assert resp.data["status_message"] == "In a meeting"

    def test_filter_by_department(self, admin_client):
        dept = ChatDepartmentFactory()
        agent1 = ChatAgentFactory()
        agent1.departments.add(dept)
        ChatAgentFactory()  # Agent without department

        resp = admin_client.get(f"{BASE_CHAT}agents/?department={dept.id}")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1


@pytest.mark.django_db
class TestChatSessionViewSet:
    """Tests for ChatSessionViewSet."""

    def test_list_sessions(self, admin_client):
        ChatSessionFactory()
        ChatSessionFactory()

        resp = admin_client.get(f"{BASE_CHAT}sessions/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_filter_by_status(self, admin_client):
        ChatSessionFactory(status="waiting")
        ChatSessionFactory(status="active")

        resp = admin_client.get(f"{BASE_CHAT}sessions/?status=waiting")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["status"] == "waiting"

    def test_accept_chat(self, admin_client, admin_user):
        agent = ChatAgentFactory(
            user=admin_user,
            is_available=True,
            status="online",
            current_chat_count=0,
            max_concurrent_chats=5,
        )
        session = ChatSessionFactory(status="waiting", assigned_agent=None)

        resp = admin_client.post(f"{BASE_CHAT}sessions/{session.id}/accept/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "active"

        session.refresh_from_db()
        agent.refresh_from_db()

        assert session.assigned_agent == agent
        assert agent.current_chat_count == 1
        assert session.first_response_at is not None

    def test_accept_chat_at_capacity(self, admin_client, admin_user):
        ChatAgentFactory(
            user=admin_user,
            is_available=True,
            status="online",
            current_chat_count=5,
            max_concurrent_chats=5,
        )
        session = ChatSessionFactory(status="waiting")

        resp = admin_client.post(f"{BASE_CHAT}sessions/{session.id}/accept/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot accept" in resp.data["error"]

    def test_close_chat(self, admin_client, admin_user):
        agent = ChatAgentFactory(
            user=admin_user,
            current_chat_count=1,
            total_chats_handled=10,
        )
        session = ChatSessionFactory(status="active", assigned_agent=agent)

        resp = admin_client.post(f"{BASE_CHAT}sessions/{session.id}/close/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "closed"

        session.refresh_from_db()
        agent.refresh_from_db()

        assert session.ended_at is not None
        assert agent.current_chat_count == 0
        assert agent.total_chats_handled == 11

    def test_close_already_closed(self, admin_client):
        session = ChatSessionFactory(status="closed")

        resp = admin_client.post(f"{BASE_CHAT}sessions/{session.id}/close/")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "already closed" in resp.data["error"]

    def test_send_message(self, admin_client, admin_user):
        ChatAgentFactory(user=admin_user)
        session = ChatSessionFactory(status="active")

        resp = admin_client.post(
            f"{BASE_CHAT}sessions/{session.id}/send_message/",
            {"content": "Hello, how can I help?"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["content"] == "Hello, how can I help?"
        assert resp.data["sender_type"] == "agent"

    def test_get_messages(self, admin_client):
        session = ChatSessionFactory()
        ChatMessageFactory(session=session, content="Message 1", is_internal=False)
        ChatMessageFactory(session=session, content="Internal note", is_internal=True)
        ChatMessageFactory(session=session, content="Message 2", is_internal=False)

        resp = admin_client.get(f"{BASE_CHAT}sessions/{session.id}/messages/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 3

        # Exclude internal
        resp = admin_client.get(
            f"{BASE_CHAT}sessions/{session.id}/messages/?show_internal=false"
        )
        assert len(resp.data) == 2

    def test_mark_read(self, admin_client):
        session = ChatSessionFactory()
        ChatMessageFactory(session=session, sender_type="visitor", is_read=False)
        ChatMessageFactory(session=session, sender_type="visitor", is_read=False)
        ChatMessageFactory(session=session, sender_type="agent", is_read=False)

        resp = admin_client.post(f"{BASE_CHAT}sessions/{session.id}/mark_read/")
        assert resp.status_code == status.HTTP_200_OK

        # Only visitor messages should be marked as read
        visitor_msgs = session.messages.filter(sender_type="visitor")
        for msg in visitor_msgs:
            msg.refresh_from_db()
            assert msg.is_read is True

    def test_transfer_to_agent(self, admin_client, admin_user):
        ChatAgentFactory(user=admin_user)
        new_agent = ChatAgentFactory(
            is_available=True,
            status="online",
            current_chat_count=0,
            max_concurrent_chats=5,
        )
        session = ChatSessionFactory(status="active")

        resp = admin_client.post(
            f"{BASE_CHAT}sessions/{session.id}/transfer/",
            {"agent_id": str(new_agent.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        session.refresh_from_db()
        assert session.assigned_agent == new_agent

    def test_transfer_to_department(self, admin_client, admin_user):
        ChatAgentFactory(user=admin_user)
        new_dept = ChatDepartmentFactory()
        session = ChatSessionFactory(status="active")

        resp = admin_client.post(
            f"{BASE_CHAT}sessions/{session.id}/transfer/",
            {"department_id": str(new_dept.id)},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        session.refresh_from_db()
        assert session.department == new_dept
        assert session.assigned_agent is None
        assert session.status == ChatSession.Status.WAITING


@pytest.mark.django_db
class TestCannedResponseViewSet:
    """Tests for CannedResponseViewSet."""

    def test_list_canned_responses(self, admin_client):
        CannedResponseFactory(title="Greeting")
        CannedResponseFactory(title="Goodbye")

        resp = admin_client.get(f"{BASE_CHAT}canned-responses/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_create_canned_response(self, admin_client):
        resp = admin_client.post(
            f"{BASE_CHAT}canned-responses/",
            {
                "title": "Welcome",
                "shortcut": "welcome",
                "content": "Welcome to our chat!",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["shortcut"] == "welcome"

    def test_use_canned_response(self, admin_client):
        response = CannedResponseFactory(content="Hello there!", usage_count=5)

        resp = admin_client.post(f"{BASE_CHAT}canned-responses/{response.id}/use/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["content"] == "Hello there!"

        response.refresh_from_db()
        assert response.usage_count == 6

    def test_search_canned_responses(self, admin_client):
        CannedResponseFactory(title="Greeting", shortcut="hi")
        CannedResponseFactory(title="Goodbye", shortcut="bye")

        resp = admin_client.get(f"{BASE_CHAT}canned-responses/?search=greet")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1
        assert resp.data["results"][0]["title"] == "Greeting"


@pytest.mark.django_db
class TestOfflineMessageViewSet:
    """Tests for OfflineMessageViewSet."""

    def test_list_offline_messages(self, admin_client):
        OfflineMessageFactory()
        OfflineMessageFactory()

        resp = admin_client.get(f"{BASE_CHAT}offline-messages/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 2

    def test_filter_unread(self, admin_client):
        OfflineMessageFactory(is_read=False)
        OfflineMessageFactory(is_read=True)

        resp = admin_client.get(f"{BASE_CHAT}offline-messages/?is_read=false")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1

    def test_mark_read(self, admin_client, admin_user):
        message = OfflineMessageFactory(is_read=False, read_by=None)

        resp = admin_client.post(
            f"{BASE_CHAT}offline-messages/{message.id}/mark_read/"
        )
        assert resp.status_code == status.HTTP_200_OK

        message.refresh_from_db()
        assert message.is_read is True
        assert message.read_by == admin_user
        assert message.read_at is not None

    def test_mark_responded(self, admin_client, admin_user):
        message = OfflineMessageFactory(is_responded=False, responded_by=None)

        resp = admin_client.post(
            f"{BASE_CHAT}offline-messages/{message.id}/mark_responded/"
        )
        assert resp.status_code == status.HTTP_200_OK

        message.refresh_from_db()
        assert message.is_responded is True
        assert message.responded_by == admin_user
        assert message.responded_at is not None


@pytest.mark.django_db
class TestChatWidgetSettings:
    """Tests for ChatWidgetSettingsView."""

    def test_get_settings(self, admin_client):
        resp = admin_client.get(f"{BASE_CHAT}widget-settings/")
        assert resp.status_code == status.HTTP_200_OK
        assert "primary_color" in resp.data

    def test_update_settings(self, admin_client):
        resp = admin_client.patch(
            f"{BASE_CHAT}widget-settings/",
            {"primary_color": "#ff0000", "company_name": "Test Company"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["primary_color"] == "#ff0000"
        assert resp.data["company_name"] == "Test Company"


@pytest.mark.django_db
class TestChatStats:
    """Tests for ChatStatsView."""

    def test_get_stats(self, admin_client):
        ChatSessionFactory(status="waiting")
        ChatSessionFactory(status="active")
        ChatAgentFactory(is_available=True)
        ChatAgentFactory(is_available=False)

        resp = admin_client.get(f"{BASE_CHAT}stats/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["waiting_chats"] == 1
        assert resp.data["active_chats"] == 1
        assert resp.data["online_agents"] == 1
        assert resp.data["total_agents"] == 2


@pytest.mark.django_db
class TestPublicChatAPI:
    """Tests for public chat widget API."""

    def test_get_widget_config(self, api_client):
        ChatWidgetSettingsFactory()
        ChatDepartmentFactory(is_active=True)
        ChatAgentFactory(is_available=True)

        resp = api_client.get(f"{BASE_CHAT}public/")
        assert resp.status_code == status.HTTP_200_OK
        assert "settings" in resp.data
        assert "departments" in resp.data
        assert resp.data["is_online"] is True

    def test_start_chat(self, api_client):
        dept = ChatDepartmentFactory(is_active=True, auto_assign=False)
        agent = ChatAgentFactory(is_available=True, status="online")
        agent.departments.add(dept)

        resp = api_client.post(
            f"{BASE_CHAT}public/",
            {
                "visitor_name": "John Doe",
                "visitor_email": "john@example.com",
                "initial_message": "Hello, I need help",
                "department": str(dept.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert "session_id" in resp.data

    def test_start_chat_offline(self, api_client):
        dept = ChatDepartmentFactory(is_active=True)
        # No online agents

        resp = api_client.post(
            f"{BASE_CHAT}public/",
            {
                "visitor_name": "John Doe",
                "visitor_email": "john@example.com",
                "initial_message": "Hello",
                "department": str(dept.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["offline"] is True


@pytest.mark.django_db
class TestPublicChatSession:
    """Tests for PublicChatSessionView."""

    def test_get_session_messages(self, api_client):
        session = ChatSessionFactory()
        ChatMessageFactory(session=session, content="Hello", is_internal=False)
        ChatMessageFactory(session=session, content="Secret", is_internal=True)

        resp = api_client.get(f"{BASE_CHAT}public/{session.session_id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["messages"]) == 1  # Internal excluded

    def test_send_visitor_message(self, api_client):
        session = ChatSessionFactory(status="active")

        resp = api_client.post(
            f"{BASE_CHAT}public/{session.session_id}/",
            {"content": "I have a question"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["sender_type"] == "visitor"

    def test_send_message_to_closed_chat(self, api_client):
        session = ChatSessionFactory(status="closed")

        resp = api_client.post(
            f"{BASE_CHAT}public/{session.session_id}/",
            {"content": "Hello"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_session_not_found(self, api_client):
        resp = api_client.get(f"{BASE_CHAT}public/invalid-session-id/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestPublicChatRating:
    """Tests for PublicChatRatingView."""

    def test_rate_chat(self, api_client):
        agent = ChatAgentFactory(avg_rating=None)
        session = ChatSessionFactory(assigned_agent=agent, rating=None)

        resp = api_client.post(
            f"{BASE_CHAT}public/{session.session_id}/rate/",
            {"rating": 5, "comment": "Great service!"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        session.refresh_from_db()
        agent.refresh_from_db()

        assert session.rating == 5
        assert session.rating_comment == "Great service!"
        assert agent.avg_rating is not None
