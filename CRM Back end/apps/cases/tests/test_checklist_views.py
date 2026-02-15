import pytest
from rest_framework import status

from tests.factories import (
    ChecklistTemplateFactory,
    ChecklistTemplateItemFactory,
    TaxCaseFactory,
)

TEMPLATES_BASE = "/api/v1/settings/checklist-templates/"


@pytest.mark.django_db
class TestChecklistTemplateCRUD:
    def test_admin_can_list(self, admin_client):
        ChecklistTemplateFactory.create_batch(3)
        resp = admin_client.get(TEMPLATES_BASE)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] >= 3

    def test_admin_can_create(self, admin_client):
        payload = {
            "name": "New Template",
            "case_type": "corporate_1120",
            "tax_year": None,
            "is_active": True,
        }
        resp = admin_client.post(TEMPLATES_BASE, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["name"] == "New Template"

    def test_admin_can_update(self, admin_client):
        template = ChecklistTemplateFactory()
        resp = admin_client.patch(
            f"{TEMPLATES_BASE}{template.id}/",
            {"name": "Updated"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Updated"

    def test_admin_can_delete(self, admin_client):
        template = ChecklistTemplateFactory()
        resp = admin_client.delete(f"{TEMPLATES_BASE}{template.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_preparer_denied(self, authenticated_client):
        resp = authenticated_client.get(TEMPLATES_BASE)
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestTemplateItems:
    def test_list_items(self, admin_client):
        template = ChecklistTemplateFactory()
        ChecklistTemplateItemFactory.create_batch(3, template=template)
        resp = admin_client.get(f"{TEMPLATES_BASE}{template.id}/items/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 3

    def test_add_item(self, admin_client):
        template = ChecklistTemplateFactory()
        payload = {"title": "W-2 Forms", "is_required": True, "sort_order": 0}
        resp = admin_client.post(
            f"{TEMPLATES_BASE}{template.id}/items/",
            payload,
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED

    def test_delete_item(self, admin_client):
        template = ChecklistTemplateFactory()
        item = ChecklistTemplateItemFactory(template=template)
        resp = admin_client.delete(f"{TEMPLATES_BASE}{template.id}/items/{item.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestCaseChecklist:
    def test_retrieve_checklist(self, authenticated_client, checklist_template):
        case = TaxCaseFactory(case_type="individual_1040", fiscal_year=2025)
        resp = authenticated_client.get(f"/api/v1/cases/{case.id}/checklist/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["total_count"] == 3

    def test_toggle_item(self, authenticated_client, checklist_template):
        case = TaxCaseFactory(case_type="individual_1040", fiscal_year=2025)
        item = case.checklist.items.first()
        resp = authenticated_client.post(
            f"/api/v1/cases/{case.id}/checklist/items/{item.id}/toggle/"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["is_completed"] is True

    def test_no_checklist_404(self, authenticated_client):
        case = TaxCaseFactory(case_type="payroll")
        resp = authenticated_client.get(f"/api/v1/cases/{case.id}/checklist/")
        assert resp.status_code == status.HTTP_404_NOT_FOUND
