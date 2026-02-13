import pytest
from django.utils import timezone

from tests.factories import TaskFactory, UserFactory, UserGroupFactory


@pytest.mark.django_db
class TestTaskSLAFields:
    """Tests for SLA tracking fields on tasks."""

    URL = "/api/v1/tasks/"

    def test_create_task_with_sla(self, admin_client, admin_user):
        from tests.factories import ContactFactory

        contact = ContactFactory()
        resp = admin_client.post(
            self.URL,
            {
                "title": "Urgent Review",
                "priority": "urgent",
                "sla_hours": 24,
                "assigned_to": str(admin_user.id),
                "contact": str(contact.id),
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["sla_hours"] == 24
        assert resp.data["sla_breached_at"] is None

    def test_sla_hours_in_list(self, admin_client, admin_user):
        TaskFactory(assigned_to=admin_user, created_by=admin_user, sla_hours=48)
        resp = admin_client.get(self.URL)
        assert resp.status_code == 200
        results = resp.data.get("results", resp.data)
        assert any(t.get("sla_hours") == 48 for t in results)


@pytest.mark.django_db
class TestTaskGroupAssignment:
    """Tests for assigning tasks to user groups."""

    URL = "/api/v1/tasks/"

    def test_create_task_with_group(self, admin_client, admin_user, test_group):
        resp = admin_client.post(
            self.URL,
            {
                "title": "Team Task",
                "priority": "medium",
                "assigned_group": str(test_group.id),
            },
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["assigned_group"]["id"] == str(test_group.id)
        assert resp.data["assigned_group"]["name"] == test_group.name

    def test_group_in_detail(self, admin_client, admin_user, test_group):
        task = TaskFactory(
            assigned_to=admin_user,
            assigned_group=test_group,
            created_by=admin_user,
        )
        resp = admin_client.get(f"{self.URL}{task.id}/")
        assert resp.status_code == 200
        assert resp.data["assigned_group"]["name"] == "Tax Team"
