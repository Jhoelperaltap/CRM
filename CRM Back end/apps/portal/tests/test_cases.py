import pytest

from tests.factories import ContactFactory, TaxCaseFactory


@pytest.mark.django_db
class TestPortalCaseList:
    """Tests for GET /api/v1/portal/cases/."""

    URL = "/api/v1/portal/cases/"

    def test_list_own_cases(self, portal_authenticated_client, portal_contact):
        TaxCaseFactory(contact=portal_contact, title="My Tax Return")
        TaxCaseFactory(contact=portal_contact, title="My Business Return")

        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data) == 2

    def test_cannot_see_other_contacts_cases(
        self, portal_authenticated_client, portal_contact
    ):
        other_contact = ContactFactory()
        TaxCaseFactory(contact=other_contact, title="Not Mine")
        TaxCaseFactory(contact=portal_contact, title="Mine")

        resp = portal_authenticated_client.get(self.URL)
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["title"] == "Mine"


@pytest.mark.django_db
class TestPortalCaseDetail:
    """Tests for GET /api/v1/portal/cases/{id}/."""

    def test_view_own_case(self, portal_authenticated_client, portal_contact):
        case = TaxCaseFactory(contact=portal_contact)
        resp = portal_authenticated_client.get(
            f"/api/v1/portal/cases/{case.id}/"
        )
        assert resp.status_code == 200
        assert resp.data["case_number"] == case.case_number

    def test_cannot_view_other_contacts_case(
        self, portal_authenticated_client
    ):
        other_contact = ContactFactory()
        case = TaxCaseFactory(contact=other_contact)
        resp = portal_authenticated_client.get(
            f"/api/v1/portal/cases/{case.id}/"
        )
        assert resp.status_code == 404

    def test_case_includes_checklist(
        self, portal_authenticated_client, portal_contact
    ):
        from tests.factories import (
            CaseChecklistFactory,
            CaseChecklistItemFactory,
        )

        case = TaxCaseFactory(contact=portal_contact)
        checklist = CaseChecklistFactory(case=case, total_count=2, completed_count=1)
        CaseChecklistItemFactory(
            checklist=checklist, title="W-2", is_completed=True
        )
        CaseChecklistItemFactory(
            checklist=checklist, title="1099", is_completed=False
        )

        resp = portal_authenticated_client.get(
            f"/api/v1/portal/cases/{case.id}/"
        )
        assert resp.status_code == 200
        assert resp.data["checklist"] is not None
        assert resp.data["checklist"]["total_count"] == 2
        assert resp.data["checklist"]["completed_count"] == 1
        assert len(resp.data["checklist"]["items"]) == 2
