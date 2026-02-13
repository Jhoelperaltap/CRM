import pytest
from rest_framework import status

from tests.factories import WorkflowRuleFactory, WorkflowExecutionLogFactory


WORKFLOWS_BASE = "/api/v1/settings/workflows/"
WORKFLOW_LOGS_BASE = "/api/v1/settings/workflow-logs/"


@pytest.mark.django_db
class TestWorkflowRuleCRUD:
    def test_admin_can_list(self, admin_client):
        WorkflowRuleFactory.create_batch(3)
        resp = admin_client.get(WORKFLOWS_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_admin_can_create(self, admin_client):
        payload = {
            "name": "New Rule",
            "trigger_type": "case_created",
            "action_type": "send_notification",
            "action_config": {"title": "New case", "severity": "info", "recipient": "preparer"},
        }
        resp = admin_client.post(WORKFLOWS_BASE, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Rule"

    def test_admin_can_update(self, admin_client):
        rule = WorkflowRuleFactory()
        resp = admin_client.patch(
            f"{WORKFLOWS_BASE}{rule.id}/",
            {"name": "Updated"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Updated"

    def test_admin_can_delete(self, admin_client):
        rule = WorkflowRuleFactory()
        resp = admin_client.delete(f"{WORKFLOWS_BASE}{rule.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(WORKFLOWS_BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_denied(self, api_client):
        resp = api_client.get(WORKFLOWS_BASE)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestWorkflowExecutionLogs:
    def test_admin_can_list(self, admin_client):
        WorkflowExecutionLogFactory.create_batch(3)
        resp = admin_client.get(WORKFLOW_LOGS_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(WORKFLOW_LOGS_BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN
