export interface ChatDepartment {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  order: number;
  auto_assign: boolean;
  max_concurrent_chats: number;
  offline_message: string;
  collect_email_offline: boolean;
  online_agents_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatAgent {
  id: string;
  user: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  departments: string[];
  department_ids: string[];
  is_available: boolean;
  status: "online" | "away" | "busy" | "offline";
  status_message: string;
  max_concurrent_chats: number;
  current_chat_count: number;
  total_chats_handled: number;
  avg_response_time: string | null;
  avg_rating: number | null;
  sound_enabled: boolean;
  desktop_notifications: boolean;
  last_seen: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session: string;
  message_type: "text" | "file" | "image" | "system" | "note";
  sender_type: "visitor" | "agent" | "system" | "bot";
  agent: string | null;
  agent_name: string | null;
  sender_name: string;
  content: string;
  file: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
  is_internal: boolean;
  created_at: string;
}

export interface ChatSessionList {
  id: string;
  session_id: string;
  status: "waiting" | "active" | "on_hold" | "closed" | "missed";
  source: "widget" | "portal" | "internal";
  visitor_name: string;
  visitor_email: string;
  department: string | null;
  department_name: string | null;
  assigned_agent: string | null;
  assigned_agent_name: string | null;
  subject: string;
  started_at: string;
  wait_time: string | null;
  last_message: {
    content: string;
    sender_type: string;
    created_at: string;
  } | null;
  unread_count: number;
  message_count: number;
  rating: number | null;
}

export interface ChatSession extends ChatSessionList {
  visitor_phone: string;
  portal_access: string | null;
  contact: string | null;
  contact_name: string | null;
  first_response_at: string | null;
  ended_at: string | null;
  duration: string;
  initial_message: string;
  ip_address: string | null;
  user_agent: string;
  page_url: string;
  referrer: string;
  tags: string[];
  custom_fields: Record<string, unknown>;
  rating_comment: string;
  transcript_sent: boolean;
  transcript_sent_at: string | null;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  shortcut: string;
  content: string;
  department: string | null;
  department_name: string | null;
  created_by: string | null;
  created_by_name: string | null;
  is_global: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatWidgetSettings {
  id: string;
  primary_color: string;
  position: "bottom-right" | "bottom-left";
  button_icon: string;
  company_name: string;
  welcome_message: string;
  away_message: string;
  require_name: boolean;
  require_email: boolean;
  require_phone: boolean;
  require_department: boolean;
  auto_popup: boolean;
  auto_popup_delay: number;
  play_sound: boolean;
  show_agent_photo: boolean;
  show_typing_indicator: boolean;
  use_operating_hours: boolean;
  operating_hours: Record<string, { start: string; end: string }>;
  timezone: string;
  file_upload_enabled: boolean;
  max_file_size_mb: number;
  allowed_file_types: string[];
  enable_rating: boolean;
  rating_prompt: string;
  offer_transcript: boolean;
  created_at: string;
  updated_at: string;
}

export interface OfflineMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  department: string | null;
  department_name: string | null;
  ip_address: string | null;
  page_url: string;
  is_read: boolean;
  read_by: string | null;
  read_by_name: string | null;
  read_at: string | null;
  is_responded: boolean;
  responded_by: string | null;
  responded_by_name: string | null;
  responded_at: string | null;
  converted_to_contact: string | null;
  converted_to_case: string | null;
  created_at: string;
}

export interface ChatStats {
  total_chats: number;
  active_chats: number;
  waiting_chats: number;
  closed_today: number;
  avg_wait_time: string | null;
  avg_duration: string | null;
  avg_rating: number | null;
  online_agents: number;
  total_agents: number;
}
