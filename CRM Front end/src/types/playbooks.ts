export type PlaybookType =
  | "sales"
  | "onboarding"
  | "support"
  | "renewal"
  | "upsell"
  | "collection"
  | "custom";

export type TriggerType =
  | "manual"
  | "case_stage"
  | "contact_created"
  | "quote_created"
  | "appointment_scheduled";

export type StepType =
  | "task"
  | "email"
  | "call"
  | "meeting"
  | "note"
  | "update_field"
  | "wait"
  | "decision"
  | "checklist";

export type WaitUnit = "hours" | "days" | "weeks";

export type ExecutionStatus =
  | "in_progress"
  | "paused"
  | "completed"
  | "abandoned"
  | "failed";

export type StepExecutionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped"
  | "failed";

export interface PlaybookStep {
  id: string;
  playbook: string;
  order: number;
  name: string;
  description: string;
  step_type: StepType;
  step_type_display: string;
  is_required: boolean;
  is_active: boolean;
  config: Record<string, unknown>;
  wait_duration: number | null;
  wait_unit: WaitUnit;
  wait_unit_display: string;
  condition: Record<string, unknown>;
  next_step: string | null;
  reminder_days: number | null;
  escalate_after_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  playbook_type: PlaybookType;
  playbook_type_display: string;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_type_display: string;
  trigger_conditions: Record<string, unknown>;
  applies_to_contacts: boolean;
  applies_to_cases: boolean;
  applies_to_corporations: boolean;
  target_completion_days: number | null;
  success_criteria: string;
  times_started: number;
  times_completed: number;
  avg_completion_time: number | null;
  completion_rate: number;
  step_count?: number;
  steps?: PlaybookStep[];
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlaybookStepExecution {
  id: string;
  execution: string;
  step: string;
  step_name: string;
  step_type: StepType;
  step_order: number;
  status: StepExecutionStatus;
  status_display: string;
  started_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  completed_by: string | null;
  completed_by_name: string | null;
  notes: string;
  output_data: Record<string, unknown>;
  created_task: string | null;
  created_appointment: string | null;
  reminder_sent: boolean;
  escalated: boolean;
  is_overdue: boolean;
  created_at: string;
}

export interface PlaybookExecution {
  id: string;
  playbook: string;
  playbook_name: string;
  playbook_type: PlaybookType;
  status: ExecutionStatus;
  status_display: string;
  contact?: string | null;
  case?: string | null;
  corporation?: string | null;
  entity_name: string | null;
  entity_type: "contact" | "case" | "corporation" | null;
  current_step: string | null;
  current_step_name?: string | null;
  steps_completed: number;
  total_steps: number;
  progress_percentage: number;
  started_at: string;
  target_completion_date: string | null;
  completed_at: string | null;
  paused_at: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  started_by?: string | null;
  started_by_name?: string | null;
  notes: string;
  outcome: string;
  outcome_notes: string;
  is_overdue: boolean;
  step_executions?: PlaybookStepExecution[];
  created_at?: string;
  updated_at?: string;
}

export type PlaybookTemplateCategory =
  | "tax_services"
  | "sales"
  | "onboarding"
  | "support"
  | "general";

export interface PlaybookTemplate {
  id: string;
  name: string;
  description: string;
  category: PlaybookTemplateCategory;
  category_display: string;
  is_system: boolean;
  is_public: boolean;
  playbook_data: Record<string, unknown>;
  times_used: number;
  rating: number;
  rating_count: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartPlaybookRequest {
  playbook_id: string;
  contact_id?: string;
  case_id?: string;
  corporation_id?: string;
  assigned_to_id?: string;
  notes?: string;
}

export interface CompleteStepRequest {
  notes?: string;
  output_data?: Record<string, unknown>;
  skip?: boolean;
}

export interface PlaybookStats {
  total_playbooks: number;
  active_executions: number;
  completed_this_month: number;
  avg_completion_rate: number;
  overdue_executions: number;
}
