import pytest

from tests.factories import WorkflowRuleFactory, WorkflowExecutionLogFactory


@pytest.mark.django_db
class TestWorkflowRuleModel:
    def test_create_rule(self):
        rule = WorkflowRuleFactory()
        assert rule.pk is not None
        assert rule.is_active is True
        assert rule.execution_count == 0

    def test_str_representation(self):
        rule = WorkflowRuleFactory(
            name="My Rule", trigger_type="case_created", action_type="create_task"
        )
        assert "My Rule" in str(rule)
        assert "case_created" in str(rule)


@pytest.mark.django_db
class TestWorkflowExecutionLogModel:
    def test_create_log(self):
        log = WorkflowExecutionLogFactory()
        assert log.pk is not None
        assert log.result == "success"

    def test_str_representation(self):
        log = WorkflowExecutionLogFactory(result="error")
        assert "error" in str(log)
