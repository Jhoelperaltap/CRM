export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  conditions: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  created_by: string | null;
  created_by_name: string | null;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecutionLog {
  id: string;
  rule: string;
  rule_name: string;
  triggered_at: string;
  trigger_object_type: string;
  trigger_object_id: string | null;
  action_taken: string;
  result: "success" | "error";
  error_message: string;
  created_at: string;
}

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  case_status_changed: "Case Status Changed",
  case_created: "Case Created",
  document_uploaded: "Document Uploaded",
  document_missing_check: "Document Missing Check",
  appointment_reminder: "Appointment Reminder",
  case_due_date_approaching: "Case Due Date Approaching",
  task_overdue: "Task Overdue",
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  create_task: "Create Task",
  send_notification: "Send Notification",
  send_email: "Send Email",
  update_field: "Update Field",
};
