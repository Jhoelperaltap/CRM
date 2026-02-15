from unittest.mock import patch

import pytest

from apps.workflows.models import WorkflowExecutionLog
from apps.workflows.workflow_engine import (
    evaluate_conditions,
    evaluate_signal_trigger,
    execute_action,
)
from tests.factories import (
    TaxCaseFactory,
    WorkflowRuleFactory,
)


@pytest.mark.django_db
class TestEvaluateConditions:
    def test_empty_conditions_match(self):
        rule = WorkflowRuleFactory(conditions={})
        case = TaxCaseFactory(case_type="individual_1040")
        assert evaluate_conditions(rule, case, {}) is True

    def test_matching_conditions(self):
        rule = WorkflowRuleFactory(conditions={"case_type": "individual_1040"})
        case = TaxCaseFactory(case_type="individual_1040")
        assert evaluate_conditions(rule, case, {}) is True

    def test_non_matching_conditions(self):
        rule = WorkflowRuleFactory(conditions={"case_type": "corporate_1120"})
        case = TaxCaseFactory(case_type="individual_1040")
        assert evaluate_conditions(rule, case, {}) is False


@pytest.mark.django_db
class TestExecuteAction:
    def test_execute_notification_action(self):
        rule = WorkflowRuleFactory(action_type="send_notification")
        case = TaxCaseFactory()
        with patch.dict(
            "apps.workflows.workflow_engine._ACTION_HANDLERS",
            {"send_notification": lambda r, i, c: "mocked"},
        ):
            execute_action(rule, case, {})
        assert WorkflowExecutionLog.objects.filter(rule=rule).exists()

    def test_execute_create_task_action(self):
        rule = WorkflowRuleFactory(action_type="create_task")
        case = TaxCaseFactory()
        with patch.dict(
            "apps.workflows.workflow_engine._ACTION_HANDLERS",
            {"create_task": lambda r, i, c: "mocked"},
        ):
            execute_action(rule, case, {})


@pytest.mark.django_db
class TestEvaluateSignalTrigger:
    @patch("apps.workflows.workflow_engine.execute_action")
    def test_fires_matching_rules(self, mock_exec):
        WorkflowRuleFactory(
            trigger_type="case_created",
            is_active=True,
            conditions={},
        )
        case = TaxCaseFactory()
        # Reset mock to clear calls from signal during TaxCaseFactory()
        mock_exec.reset_mock()
        evaluate_signal_trigger("case_created", case)
        mock_exec.assert_called_once()

    @patch("apps.workflows.workflow_engine.execute_action")
    def test_skips_inactive_rules(self, mock_exec):
        WorkflowRuleFactory(trigger_type="case_created", is_active=False)
        case = TaxCaseFactory()
        mock_exec.reset_mock()
        evaluate_signal_trigger("case_created", case)
        mock_exec.assert_not_called()
