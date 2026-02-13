import pytest

from apps.cases.checklist_models import CaseChecklist
from tests.factories import (
    DocumentFactory,
    TaxCaseFactory,
)


@pytest.mark.django_db
class TestAutoPopulateChecklist:
    def test_populates_on_case_creation(self, checklist_template):
        case = TaxCaseFactory(case_type="individual_1040", fiscal_year=2025)
        assert CaseChecklist.objects.filter(case=case).exists()
        checklist = case.checklist
        assert checklist.total_count == 3
        assert checklist.items.count() == 3

    def test_fallback_to_null_year(self, checklist_template):
        # checklist_template has tax_year=None (all years)
        case = TaxCaseFactory(case_type="individual_1040", fiscal_year=2030)
        assert CaseChecklist.objects.filter(case=case).exists()

    def test_no_template_no_checklist(self):
        case = TaxCaseFactory(case_type="payroll")
        assert not CaseChecklist.objects.filter(case=case).exists()


@pytest.mark.django_db
class TestAutoCheckOnDocUpload:
    def test_auto_checks_matching_item(self, checklist_template):
        case = TaxCaseFactory(case_type="individual_1040", fiscal_year=2025)
        checklist = case.checklist
        assert checklist.completed_count == 0

        # Upload a w2 document
        doc = DocumentFactory(case=case, doc_type="w2")
        checklist.refresh_from_db()
        assert checklist.completed_count == 1

        w2_item = checklist.items.get(doc_type="w2")
        assert w2_item.is_completed is True
        assert w2_item.linked_document == doc

    def test_no_match_no_auto_check(self, checklist_template):
        case = TaxCaseFactory(case_type="individual_1040", fiscal_year=2025)
        DocumentFactory(case=case, doc_type="other")
        checklist = case.checklist
        checklist.refresh_from_db()
        assert checklist.completed_count == 0
