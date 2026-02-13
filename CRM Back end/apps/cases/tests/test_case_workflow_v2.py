import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.cases.models import TaxCase
from tests.factories import ContactFactory, TaxCaseFactory, UserFactory


@pytest.mark.django_db
class TestCaseNewStates:
    """Tests for the three new TaxCase workflow statuses."""

    TRANSITION_URL = "/api/v1/cases/{id}/transition/"

    def test_new_to_waiting_for_documents(self, admin_client, admin_user):
        case = TaxCaseFactory(status="new", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "waiting_for_documents"}, format="json")
        assert resp.status_code == 200
        case.refresh_from_db()
        assert case.status == TaxCase.Status.WAITING_FOR_DOCUMENTS

    def test_waiting_to_in_progress(self, admin_client, admin_user):
        case = TaxCaseFactory(status="waiting_for_documents", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "in_progress"}, format="json")
        assert resp.status_code == 200
        case.refresh_from_db()
        assert case.status == TaxCase.Status.IN_PROGRESS

    def test_under_review_to_ready_to_file(self, admin_client, admin_user):
        case = TaxCaseFactory(status="under_review", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "ready_to_file"}, format="json")
        assert resp.status_code == 200
        case.refresh_from_db()
        assert case.status == TaxCase.Status.READY_TO_FILE

    def test_ready_to_file_to_filed(self, admin_client, admin_user):
        case = TaxCaseFactory(status="ready_to_file", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "filed"}, format="json")
        assert resp.status_code == 200
        case.refresh_from_db()
        assert case.status == TaxCase.Status.FILED
        assert case.filed_date is not None

    def test_completed_to_closed(self, admin_client, admin_user):
        case = TaxCaseFactory(status="completed", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "closed"}, format="json")
        assert resp.status_code == 200
        case.refresh_from_db()
        assert case.status == TaxCase.Status.CLOSED
        assert case.closed_date is not None

    def test_closed_is_terminal(self, admin_client, admin_user):
        case = TaxCaseFactory(status="closed", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "completed"}, format="json")
        assert resp.status_code == 400

    def test_invalid_transition_rejected(self, admin_client, admin_user):
        case = TaxCaseFactory(status="new", created_by=admin_user)
        url = self.TRANSITION_URL.format(id=case.id)
        resp = admin_client.post(url, {"status": "filed"}, format="json")
        assert resp.status_code == 400


@pytest.mark.django_db
class TestCaseRecordLocking:
    """Tests that cases in Filed/Completed/Closed status cannot be edited."""

    def test_cannot_edit_filed_case(self, admin_client, admin_user):
        case = TaxCaseFactory(status="filed", created_by=admin_user)
        url = f"/api/v1/cases/{case.id}/"
        resp = admin_client.patch(url, {"title": "Changed"}, format="json")
        assert resp.status_code == 403

    def test_cannot_edit_completed_case(self, admin_client, admin_user):
        case = TaxCaseFactory(status="completed", created_by=admin_user)
        url = f"/api/v1/cases/{case.id}/"
        resp = admin_client.patch(url, {"title": "Changed"}, format="json")
        assert resp.status_code == 403

    def test_cannot_edit_closed_case(self, admin_client, admin_user):
        case = TaxCaseFactory(status="closed", created_by=admin_user)
        url = f"/api/v1/cases/{case.id}/"
        resp = admin_client.patch(url, {"title": "Changed"}, format="json")
        assert resp.status_code == 403

    def test_can_edit_in_progress_case(self, admin_client, admin_user):
        case = TaxCaseFactory(status="in_progress", created_by=admin_user)
        url = f"/api/v1/cases/{case.id}/"
        resp = admin_client.patch(url, {"title": "Updated Title"}, format="json")
        assert resp.status_code == 200

    def test_can_transition_filed_case(self, admin_client, admin_user):
        """Even locked cases can be transitioned via the transition endpoint."""
        case = TaxCaseFactory(status="filed", created_by=admin_user)
        url = f"/api/v1/cases/{case.id}/transition/"
        resp = admin_client.post(url, {"status": "completed"}, format="json")
        assert resp.status_code == 200

    def test_is_locked_property(self):
        case = TaxCase(status="filed")
        assert case.is_locked is True

        case.status = "in_progress"
        assert case.is_locked is False

        case.status = "closed"
        assert case.is_locked is True
