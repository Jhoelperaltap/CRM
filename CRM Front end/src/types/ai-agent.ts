/**
 * Types for the AI Agent system.
 */

// Action type constants
export type ActionType =
  | "email_note"
  | "appt_reminder"
  | "task_reminder"
  | "task_escalated"
  | "insight"
  | "recommendation"
  | "email_sent"
  | "task_created";

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  email_note: "Created note from email",
  appt_reminder: "Sent appointment reminder",
  task_reminder: "Sent task reminder",
  task_escalated: "Escalated overdue task",
  insight: "Generated business insight",
  recommendation: "Made recommendation",
  email_sent: "Sent email",
  task_created: "Created task",
};

// Action status constants
export type ActionStatus = "pending" | "approved" | "executed" | "rejected" | "failed";

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  executed: "Executed",
  rejected: "Rejected",
  failed: "Failed",
};

export const ACTION_STATUS_COLORS: Record<ActionStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  executed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  failed: "bg-red-200 text-red-900",
};

// Insight type constants
export type InsightType =
  | "strength"
  | "weakness"
  | "opportunity"
  | "threat"
  | "trend"
  | "metric"
  | "recommendation";

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  strength: "Business Strength",
  weakness: "Business Weakness",
  opportunity: "Opportunity",
  threat: "Threat",
  trend: "Trend Analysis",
  metric: "Metric Alert",
  recommendation: "Recommendation",
};

export const INSIGHT_TYPE_COLORS: Record<InsightType, string> = {
  strength: "bg-green-100 text-green-800",
  weakness: "bg-red-100 text-red-800",
  opportunity: "bg-blue-100 text-blue-800",
  threat: "bg-orange-100 text-orange-800",
  trend: "bg-purple-100 text-purple-800",
  metric: "bg-gray-100 text-gray-800",
  recommendation: "bg-indigo-100 text-indigo-800",
};

// Log level constants
export type LogLevel = "debug" | "info" | "warning" | "error" | "decision";

export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "text-gray-500",
  info: "text-blue-600",
  warning: "text-yellow-600",
  error: "text-red-600",
  decision: "text-purple-600",
};

// AI Provider constants
export type AIProvider = "openai" | "anthropic";

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Anthropic (Claude)",
};

// =====================
// Configuration
// =====================

export interface AgentConfiguration {
  id: string;
  is_active: boolean;
  // Capability toggles
  email_analysis_enabled: boolean;
  appointment_reminders_enabled: boolean;
  task_enforcement_enabled: boolean;
  market_analysis_enabled: boolean;
  autonomous_actions_enabled: boolean;
  // Timing settings
  email_check_interval_minutes: number;
  task_reminder_hours_before: number;
  appointment_reminder_hours: number[];
  // AI settings
  ai_provider: AIProvider;
  ai_model: string;
  ai_temperature: number;
  max_tokens: number;
  // Instructions
  custom_instructions: string;
  focus_areas: string[];
  // Rate limiting
  max_actions_per_hour: number;
  max_ai_calls_per_hour: number;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface AgentConfigurationUpdate {
  is_active?: boolean;
  email_analysis_enabled?: boolean;
  appointment_reminders_enabled?: boolean;
  task_enforcement_enabled?: boolean;
  market_analysis_enabled?: boolean;
  autonomous_actions_enabled?: boolean;
  email_check_interval_minutes?: number;
  task_reminder_hours_before?: number;
  appointment_reminder_hours?: number[];
  ai_provider?: AIProvider;
  ai_model?: string;
  ai_temperature?: number;
  max_tokens?: number;
  openai_api_key?: string;
  anthropic_api_key?: string;
  custom_instructions?: string;
  focus_areas?: string[];
  max_actions_per_hour?: number;
  max_ai_calls_per_hour?: number;
}

// =====================
// Actions
// =====================

export interface AgentActionListItem {
  id: string;
  action_type: ActionType;
  action_type_display: string;
  status: ActionStatus;
  status_display: string;
  title: string;
  requires_approval: boolean;
  contact_name: string | null;
  case_number: string | null;
  created_at: string;
  executed_at: string | null;
}

export interface RelatedContact {
  id: string;
  name: string;
  email: string;
}

export interface RelatedCase {
  id: string;
  case_number: string;
  case_type: string;
  status: string;
}

export interface RelatedTask {
  id: string;
  title: string;
  status: string;
  due_date: string;
}

export interface RelatedAppointment {
  id: string;
  title: string;
  start_datetime: string;
  location: string;
}

export interface RelatedEmail {
  id: string;
  subject: string;
  from_address: string;
  created_at: string;
}

export interface AgentAction {
  id: string;
  action_type: ActionType;
  action_type_display: string;
  status: ActionStatus;
  status_display: string;
  title: string;
  description: string;
  reasoning: string;
  action_data: Record<string, unknown>;
  // Related entities
  related_contact: RelatedContact | null;
  related_case: RelatedCase | null;
  related_task: RelatedTask | null;
  related_appointment: RelatedAppointment | null;
  related_email: RelatedEmail | null;
  // Approval workflow
  requires_approval: boolean;
  approved_by_name: string | null;
  approved_at: string | null;
  rejected_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  // Execution
  executed_at: string | null;
  execution_result: string;
  error_message: string;
  // Outcome
  outcome: string;
  outcome_score: number | null;
  outcome_recorded_by_name: string | null;
  outcome_recorded_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ApproveActionPayload {
  execute_immediately?: boolean;
}

export interface RejectActionPayload {
  reason?: string;
}

export interface RecordOutcomePayload {
  outcome: string;
  score: number;
}

// =====================
// Logs
// =====================

export interface AgentLog {
  id: string;
  level: LogLevel;
  level_display: string;
  component: string;
  message: string;
  context: Record<string, unknown>;
  action: string | null;
  action_title: string | null;
  tokens_used: number | null;
  ai_model: string;
  ai_latency_ms: number | null;
  created_at: string;
}

// =====================
// Insights
// =====================

export interface AgentInsightListItem {
  id: string;
  insight_type: InsightType;
  insight_type_display: string;
  title: string;
  priority: number;
  priority_display: string;
  is_actionable: boolean;
  is_acknowledged: boolean;
  created_at: string;
}

export interface AgentInsight {
  id: string;
  insight_type: InsightType;
  insight_type_display: string;
  title: string;
  description: string;
  supporting_data: Record<string, unknown>;
  priority: number;
  priority_display: string;
  is_actionable: boolean;
  recommended_action: string;
  is_acknowledged: boolean;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  outcome: string;
  outcome_recorded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcknowledgeInsightPayload {
  outcome?: string;
}

// =====================
// Metrics & Analytics
// =====================

export interface AgentMetrics {
  id: string;
  date: string;
  total_actions: number;
  actions_executed: number;
  actions_approved: number;
  actions_rejected: number;
  actions_failed: number;
  email_notes_created: number;
  appointment_reminders_sent: number;
  task_reminders_sent: number;
  tasks_escalated: number;
  insights_generated: number;
  total_ai_calls: number;
  total_tokens_used: number;
  avg_ai_latency_ms: number | null;
  avg_outcome_score: number | null;
  outcomes_recorded: number;
}

export interface PerformanceSummary {
  period_days: number;
  total_actions: number;
  message?: string; // When there are no actions
  status_breakdown?: {
    pending: number;
    approved: number;
    executed: number;
    rejected: number;
    failed: number;
  };
  rates?: {
    execution_rate: number;
    rejection_rate: number;
    failure_rate: number;
    approval_rate: number;
  };
  outcomes?: {
    total_recorded: number;
    avg_score: number | null;
    positive: number;
    negative: number;
    neutral: number;
  };
  by_action_type?: Record<
    string,
    {
      total: number;
      executed: number;
      avg_score: number | null;
      outcomes_recorded: number;
    }
  >;
  ai_usage?: {
    total_tokens_used: number;
    avg_latency_ms: number | null;
  };
}

export interface LearningProgress {
  recent_period: string;
  comparison_period: string;
  outcome_score: {
    recent: number | null;
    previous: number | null;
    improvement: number | null;
  };
  rejection_rate: {
    recent: number;
    previous: number;
  };
  sample_sizes: {
    recent_with_outcomes: number;
    previous_with_outcomes: number;
  };
}

export interface Recommendation {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  action: string;
}

export interface TrendDataPoint {
  date: string;
  total: number;
  executed: number;
  rejected: number;
  failed: number;
}

// =====================
// Status
// =====================

export interface AgentStatus {
  is_active: boolean;
  capabilities: {
    email_analysis: boolean;
    appointment_reminders: boolean;
    task_enforcement: boolean;
    market_analysis: boolean;
    autonomous_actions: boolean;
  };
  ai_config: {
    provider: string;
    model: string;
  };
  activity: {
    actions_last_hour: number;
    pending_actions: number;
    errors_last_hour: number;
  };
  rate_limits: {
    actions_per_hour: number;
    ai_calls_per_hour: number;
    actions_remaining: number;
  };
  today_metrics: {
    total_actions: number;
    executed: number;
    tokens_used: number;
  } | null;
  health: "healthy" | "degraded";
}

// =====================
// Task Responses
// =====================

export interface RunCycleResponse {
  status: "queued" | "completed";
  task_id?: string;
  message?: string;
  result?: {
    status: string;
    action_count: number;
    errors: Array<{ component: string; error: string }>;
  };
}
