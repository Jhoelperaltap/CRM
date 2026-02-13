import pytest
from unittest.mock import patch, ANY

from tests.factories import TaxCaseFactory, DocumentFactory


@pytest.mark.django_db
class TestCaseSignals:
    @patch("apps.workflows.workflow_engine.evaluate_signal_trigger")
    def test_case_creation_fires_trigger(self, mock_eval):
        TaxCaseFactory()
        mock_eval.assert_any_call("case_created", ANY)

    @patch("apps.workflows.workflow_engine.evaluate_signal_trigger")
    def test_case_status_change_fires_trigger(self, mock_eval):
        case = TaxCaseFactory(status="new")
        mock_eval.reset_mock()
        case.status = "in_progress"
        case.save()
        calls = [c for c in mock_eval.call_args_list if c[0][0] == "case_status_changed"]
        assert len(calls) >= 1


@pytest.mark.django_db
class TestDocumentSignals:
    @patch("apps.workflows.workflow_engine.evaluate_signal_trigger")
    def test_document_creation_fires_trigger(self, mock_eval):
        DocumentFactory()
        calls = [c for c in mock_eval.call_args_list if c[0][0] == "document_uploaded"]
        assert len(calls) >= 1
