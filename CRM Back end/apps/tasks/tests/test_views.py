import pytest
from rest_framework import status

from tests.factories import TaskFactory, UserFactory


BASE = "/api/v1/tasks/"


@pytest.mark.django_db
class TestTaskList:
    def test_list(self, authenticated_client):
        TaskFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3


@pytest.mark.django_db
class TestTaskCreate:
    def test_create(self, authenticated_client):
        resp = authenticated_client.post(
            BASE, {"title": "Prepare W-2 forms"}, format="json"
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == "Prepare W-2 forms"
        assert resp.data["status"] == "todo"
        assert resp.data["priority"] == "medium"


@pytest.mark.django_db
class TestTaskRetrieve:
    def test_retrieve(self, authenticated_client):
        task = TaskFactory()
        resp = authenticated_client.get(f"{BASE}{task.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == str(task.id)


@pytest.mark.django_db
class TestTaskUpdate:
    def test_patch(self, authenticated_client):
        task = TaskFactory()
        resp = authenticated_client.patch(
            f"{BASE}{task.id}/", {"title": "Updated Task"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Updated Task"


@pytest.mark.django_db
class TestTaskDelete:
    def test_admin_can_delete(self, admin_client):
        task = TaskFactory()
        resp = admin_client.delete(f"{BASE}{task.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_cannot_delete(self, authenticated_client):
        task = TaskFactory()
        resp = authenticated_client.delete(f"{BASE}{task.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTaskFilterByAssignee:
    def test_filter(self, authenticated_client, preparer_user):
        TaskFactory(assigned_to=preparer_user)
        TaskFactory()  # different assignee
        resp = authenticated_client.get(
            f"{BASE}?assigned_to={preparer_user.id}"
        )
        assert resp.status_code == status.HTTP_200_OK
        for result in resp.data["results"]:
            assert str(result["assigned_to"]) == str(preparer_user.id)
