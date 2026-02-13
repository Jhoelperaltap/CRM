import pytest

from tests.factories import (
    ChecklistTemplateFactory,
    ChecklistTemplateItemFactory,
    CaseChecklistFactory,
)


@pytest.mark.django_db
class TestChecklistTemplateModel:
    def test_create_template(self):
        template = ChecklistTemplateFactory()
        assert template.pk is not None
        assert template.is_active is True

    def test_str_representation(self):
        template = ChecklistTemplateFactory(name="1040 Template", case_type="individual_1040", tax_year=2025)
        assert "1040 Template" in str(template)
        assert "2025" in str(template)

    def test_unique_constraint(self):
        ChecklistTemplateFactory(case_type="individual_1040", tax_year=2025)
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            ChecklistTemplateFactory(case_type="individual_1040", tax_year=2025)

    def test_null_year_means_all_years(self):
        template = ChecklistTemplateFactory(tax_year=None)
        assert "All Years" in str(template)


@pytest.mark.django_db
class TestChecklistTemplateItemModel:
    def test_create_item(self):
        item = ChecklistTemplateItemFactory()
        assert item.pk is not None
        assert item.is_required is True

    def test_ordering_by_sort_order(self):
        template = ChecklistTemplateFactory()
        ChecklistTemplateItemFactory(template=template, sort_order=3)  # i3 - for ordering test
        i1 = ChecklistTemplateItemFactory(template=template, sort_order=1)
        i2 = ChecklistTemplateItemFactory(template=template, sort_order=2)
        items = list(template.items.all())
        assert items[0].pk == i1.pk
        assert items[1].pk == i2.pk


@pytest.mark.django_db
class TestCaseChecklistModel:
    def test_progress_percent_zero(self):
        cl = CaseChecklistFactory(completed_count=0, total_count=0)
        assert cl.progress_percent == 0

    def test_progress_percent(self):
        cl = CaseChecklistFactory(completed_count=3, total_count=5)
        assert cl.progress_percent == 60

    def test_progress_percent_100(self):
        cl = CaseChecklistFactory(completed_count=5, total_count=5)
        assert cl.progress_percent == 100
