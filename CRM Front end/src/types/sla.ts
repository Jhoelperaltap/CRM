export interface SLA {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  is_default: boolean;
  response_time_urgent: number;
  response_time_high: number;
  response_time_medium: number;
  response_time_low: number;
  resolution_time_urgent: number;
  resolution_time_high: number;
  resolution_time_medium: number;
  resolution_time_low: number;
  use_business_hours: boolean;
  business_hours: Record<string, { start: string; end: string }> | null;
  escalation_enabled: boolean;
  escalation_notify_assignee: boolean;
  escalation_notify_manager: boolean;
  escalation_email: string | null;
  applicable_case_types: string[];
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SLAList {
  id: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  response_time_medium: number;
  resolution_time_medium: number;
  case_count: number;
  created_at: string;
}

export interface EscalationRule {
  id: string;
  sla: string;
  name: string;
  is_active: boolean;
  order: number;
  trigger_type: 'breach' | 'percentage' | 'hours_before';
  trigger_value: number;
  applies_to: 'response' | 'resolution' | 'both';
  notify_assignee: boolean;
  notify_manager: boolean;
  notify_user_ids: string[];
  notify_emails: string[];
  reassign_to: string | null;
  change_priority: string | null;
  email_subject: string;
  email_body: string;
  created_at: string;
  updated_at: string;
}

export interface SLABreach {
  id: string;
  case: string;
  case_number: string;
  case_title: string;
  sla: string;
  sla_name: string;
  breach_type: 'response' | 'resolution';
  target_time: string;
  breach_time: string;
  breach_duration: string;
  case_priority: string;
  case_status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  escalation_sent: boolean;
  escalation_sent_at: string | null;
  escalation_acknowledged: boolean;
  escalation_acknowledged_by: string | null;
  escalation_acknowledged_at: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string;
  created_at: string;
}

export interface CaseSLAStatus {
  id: string;
  case: string;
  sla: string;
  sla_name: string;
  response_status: 'pending' | 'at_risk' | 'met' | 'breached';
  response_target: string | null;
  response_met_at: string | null;
  response_breached: boolean;
  response_remaining: string | null;
  resolution_status: 'pending' | 'at_risk' | 'met' | 'breached';
  resolution_target: string | null;
  resolution_met_at: string | null;
  resolution_breached: boolean;
  resolution_remaining: string | null;
  is_paused: boolean;
  paused_at: string | null;
  total_paused_time: string;
  pause_reason: string;
  time_to_response: string | null;
  time_to_resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface SLAMetrics {
  total_cases: number;
  response_met: number;
  response_breached: number;
  response_rate: number;
  resolution_met: number;
  resolution_breached: number;
  resolution_rate: number;
  avg_response_time: string | null;
  avg_resolution_time: string | null;
}

export interface SLADashboard {
  summary: {
    at_risk: number;
    breached: number;
    unacknowledged: number;
  };
  recent_breaches: SLABreach[];
  at_risk_cases: CaseSLAStatus[];
}

export interface SLAFormData {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  response_time_urgent: number;
  response_time_high: number;
  response_time_medium: number;
  response_time_low: number;
  resolution_time_urgent: number;
  resolution_time_high: number;
  resolution_time_medium: number;
  resolution_time_low: number;
  use_business_hours?: boolean;
  business_hours?: Record<string, { start: string; end: string }> | null;
  escalation_enabled?: boolean;
  escalation_notify_assignee?: boolean;
  escalation_notify_manager?: boolean;
  escalation_email?: string;
  applicable_case_types?: string[];
}

export interface EscalationRuleFormData {
  sla: string;
  name: string;
  is_active?: boolean;
  order?: number;
  trigger_type: 'breach' | 'percentage' | 'hours_before';
  trigger_value: number;
  applies_to: 'response' | 'resolution' | 'both';
  notify_assignee?: boolean;
  notify_manager?: boolean;
  notify_user_ids?: string[];
  notify_emails?: string[];
  reassign_to?: string | null;
  change_priority?: string | null;
  email_subject?: string;
  email_body?: string;
}
