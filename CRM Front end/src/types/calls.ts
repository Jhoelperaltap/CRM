export interface TelephonyProvider {
  id: string;
  name: string;
  provider_type: "twilio" | "ringcentral" | "vonage" | "asterisk" | "custom";
  provider_type_display: string;
  is_active: boolean;
  is_default: boolean;
  account_sid: string;
  api_key: string;
  webhook_url: string;
  default_caller_id: string;
  recording_enabled: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PhoneLine {
  id: string;
  provider: string;
  provider_name: string;
  phone_number: string;
  friendly_name: string;
  line_type: "inbound" | "outbound" | "both";
  line_type_display: string;
  is_active: boolean;
  assigned_user: string | null;
  assigned_user_name: string | null;
  assigned_department: string;
  voicemail_enabled: boolean;
  voicemail_greeting_url: string;
  forward_to: string;
  ring_timeout: number;
  created_at: string;
  updated_at: string;
}

export type CallDirection = "inbound" | "outbound";
export type CallStatus =
  | "initiated"
  | "ringing"
  | "in_progress"
  | "completed"
  | "busy"
  | "no_answer"
  | "failed"
  | "canceled"
  | "voicemail";
export type CallType =
  | "regular"
  | "follow_up"
  | "cold_call"
  | "support"
  | "sales"
  | "callback";

export interface Call {
  id: string;
  external_id: string;
  direction: CallDirection;
  direction_display: string;
  status: CallStatus;
  status_display: string;
  call_type: CallType;
  call_type_display: string;
  from_number: string;
  to_number: string;
  phone_line: string | null;
  phone_line_number: string | null;
  user: string | null;
  user_name: string | null;
  transferred_from: string | null;
  contact: string | null;
  contact_name: string | null;
  corporation: string | null;
  corporation_name: string | null;
  case: string | null;
  case_number: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration: number;
  ring_duration: number;
  is_recorded: boolean;
  recording_url: string;
  recording_duration: number;
  transcription: string;
  transcription_status: string;
  subject: string;
  notes: string;
  outcome: string;
  follow_up_date: string | null;
  follow_up_notes: string;
  call_quality_score: number | null;
  customer_sentiment: string;
  provider_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CallQueue {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  strategy: "ring_all" | "round_robin" | "least_recent" | "random" | "linear";
  strategy_display: string;
  timeout: number;
  max_wait_time: number;
  member_count: number;
  active_members: number;
  queue_members: CallQueueMember[];
  hold_music_url: string;
  announce_position: boolean;
  announce_wait_time: boolean;
  overflow_action: string;
  overflow_destination: string;
  created_at: string;
  updated_at: string;
}

export interface CallQueueMember {
  id: string;
  queue: string;
  user: string;
  user_name: string;
  user_email: string;
  priority: number;
  is_active: boolean;
  is_available: boolean;
  paused_at: string | null;
  pause_reason: string;
  calls_taken: number;
  last_call_at: string | null;
  created_at: string;
}

export type VoicemailStatus = "new" | "listened" | "archived" | "deleted";

export interface Voicemail {
  id: string;
  phone_line: string;
  phone_line_number: string;
  call: string | null;
  caller_number: string;
  caller_name: string;
  audio_url: string;
  duration: number;
  transcription: string;
  status: VoicemailStatus;
  status_display: string;
  listened_by: string | null;
  listened_by_name: string | null;
  listened_at: string | null;
  contact: string | null;
  contact_name: string | null;
  created_at: string;
}

export type CallScriptType =
  | "cold_call"
  | "follow_up"
  | "support"
  | "sales"
  | "survey";

export interface CallScript {
  id: string;
  name: string;
  script_type: CallScriptType;
  script_type_display: string;
  description: string;
  is_active: boolean;
  content: string;
  sections: unknown[];
  times_used: number;
  avg_success_rate: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallSettings {
  id: string;
  auto_record_all: boolean;
  record_inbound: boolean;
  record_outbound: boolean;
  recording_format: string;
  recording_retention_days: number;
  transcription_enabled: boolean;
  transcription_language: string;
  default_ring_timeout: number;
  missed_call_notification: boolean;
  voicemail_notification: boolean;
  click_to_call_enabled: boolean;
  confirm_before_dial: boolean;
  enforce_business_hours: boolean;
  after_hours_action: string;
  after_hours_message: string;
  updated_at: string;
}

export interface CallStats {
  total_calls: number;
  inbound_calls: number;
  outbound_calls: number;
  answered_calls: number;
  missed_calls: number;
  total_duration: number;
  avg_duration: number;
  avg_ring_time: number;
}

export interface ClickToCallRequest {
  phone_number: string;
  contact_id?: string;
  corporation_id?: string;
  case_id?: string;
  call_type?: CallType;
  phone_line_id?: string;
}
