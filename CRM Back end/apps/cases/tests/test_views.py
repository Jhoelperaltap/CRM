import re

import pytest
from rest_framework import status

from tests.factories import ContactFactory, TaxCaseFactory, TaxCaseNoteFactory


BASE = "/api/v1/cases/"


@pytest.mark.django_db
class TestCaseList:
    def test_list(self, authenticated_client):
        TaxCaseFactory.create_batch(3)
        resp = authenticated_client.get(BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3


@pytest.mark.django_db
class TestCaseCreate:
    def test_create_auto_case_number(self, authenticated_client):
        contact = ContactFactory()
        resp = authenticated_client.post(
            BASE,
            {
                "title": "2025 Individual Return",
                "case_type": "individual_1040",
                "fiscal_year": 2025,
                "contact": str(contact.id),
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert re.match(r"TC-\d{4}-\d{4}", resp.data["case_number"])

    def test_create_two_cases_unique_numbers(self, authenticated_client):
        contact = ContactFactory()
        payload = {
            "title": "Case",
            "case_type": "individual_1040",
            "fiscal_year": 2025,
            "contact": str(contact.id),
        }
        r1 = authenticated_client.post(BASE, payload, format="json")
        r2 = authenticated_client.post(BASE, payload, format="json")
        assert r1.status_code == status.HTTP_201_CREATED
        assert r2.status_code == status.HTTP_201_CREATED
        assert r1.data["case_number"] != r2.data["case_number"]

    def test_create_missing_contact(self, authenticated_client):
        resp = authenticated_client.post(
            BASE,
            {"title": "Test", "case_type": "individual_1040", "fiscal_year": 2025},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestCaseRetrieve:
    def test_retrieve(self, authenticated_client):
        case = TaxCaseFactory()
        resp = authenticated_client.get(f"{BASE}{case.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["case_number"] == case.case_number


@pytest.mark.django_db
class TestCaseUpdate:
    def test_patch(self, authenticated_client):
        case = TaxCaseFactory()
        resp = authenticated_client.patch(
            f"{BASE}{case.id}/", {"title": "Updated Title"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["title"] == "Updated Title"


@pytest.mark.django_db
class TestCaseDelete:
    def test_admin_can_delete(self, admin_client):
        case = TaxCaseFactory()
        resp = admin_client.delete(f"{BASE}{case.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_cannot_delete(self, authenticated_client):
        case = TaxCaseFactory()
        resp = authenticated_client.delete(f"{BASE}{case.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestCaseTransition:
    def test_valid_transition_new_to_in_progress(self, authenticated_client):
        case = TaxCaseFactory(status="new")
        resp = authenticated_client.post(
            f"{BASE}{case.id}/transition/",
            {"status": "in_progress"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "in_progress"

    def test_invalid_transition_new_to_completed(self, authenticated_client):
        case = TaxCaseFactory(status="new")
        resp = authenticated_client.post(
            f"{BASE}{case.id}/transition/",
            {"status": "completed"},
            format="json",
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_full_workflow(self, authenticated_client):
        case = TaxCaseFactory(status="new")
        cid = case.id
        # new -> in_progress
        authenticated_client.post(
            f"{BASE}{cid}/transition/", {"status": "in_progress"}, format="json"
        )
        # in_progress -> under_review
        authenticated_client.post(
            f"{BASE}{cid}/transition/", {"status": "under_review"}, format="json"
        )
        # under_review -> ready_to_file
        authenticated_client.post(
            f"{BASE}{cid}/transition/", {"status": "ready_to_file"}, format="json"
        )
        # ready_to_file -> filed
        resp = authenticated_client.post(
            f"{BASE}{cid}/transition/", {"status": "filed"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == "filed"
        assert resp.data["filed_date"] is not None


@pytest.mark.django_db
class TestCaseNotes:
    def test_list_notes(self, authenticated_client):
        case = TaxCaseFactory()
        TaxCaseNoteFactory(case=case)
        TaxCaseNoteFactory(case=case)
        resp = authenticated_client.get(f"{BASE}{case.id}/notes/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 2

    def test_create_note(self, authenticated_client):
        case = TaxCaseFactory()
        resp = authenticated_client.post(
            f"{BASE}{case.id}/notes/",
            {"content": "Test note", "is_internal": True},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["content"] == "Test note"
        assert resp.data["is_internal"] is True
