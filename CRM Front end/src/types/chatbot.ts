// Chatbot Configuration
export interface ChatbotConfiguration {
  id: string;
  ai_provider: 'openai' | 'anthropic';
  api_key_set: boolean;
  model_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  company_name: string;
  welcome_message: string;
  is_active: boolean;
  allow_appointments: boolean;
  handoff_enabled: boolean;
  handoff_message: string;
  fallback_message: string;
  max_fallbacks_before_handoff: number;
  created_at: string;
  updated_at: string;
}

export interface ChatbotConfigurationUpdate {
  ai_provider?: 'openai' | 'anthropic';
  api_key?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  company_name?: string;
  welcome_message?: string;
  is_active?: boolean;
  allow_appointments?: boolean;
  handoff_enabled?: boolean;
  handoff_message?: string;
  fallback_message?: string;
  max_fallbacks_before_handoff?: number;
}

// Knowledge Base
export type KnowledgeEntryType = 'faq' | 'service' | 'policy' | 'general';

export interface ChatbotKnowledgeEntry {
  id: string;
  entry_type: KnowledgeEntryType;
  title: string;
  content: string;
  keywords: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatbotKnowledgeEntryCreate {
  entry_type: KnowledgeEntryType;
  title: string;
  content: string;
  keywords?: string;
  priority?: number;
  is_active?: boolean;
}

// Appointment Slots
export interface ChatbotAppointmentSlot {
  id: string;
  day_of_week: number;
  day_of_week_display: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  max_appointments: number;
  is_active: boolean;
  assigned_staff: string | null;
  assigned_staff_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotAppointmentSlotCreate {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes?: number;
  max_appointments?: number;
  is_active?: boolean;
  assigned_staff?: string | null;
}

// Conversations
export type ConversationStatus = 'active' | 'handed_off' | 'closed';
export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageType = 'text' | 'appointment_request' | 'appointment_confirm' | 'handoff_request';

export interface ChatbotMessage {
  id: string;
  role: MessageRole;
  message_type: MessageType;
  content: string;
  metadata: Record<string, unknown>;
  tokens_used: number;
  created_at: string;
}

export interface ChatbotConversation {
  id: string;
  contact: string;
  contact_name: string;
  status: ConversationStatus;
  fallback_count: number;
  message_count?: number;
  last_message_at?: string;
  assigned_staff?: string;
  assigned_staff_name?: string;
  handed_off_at?: string;
  closed_at?: string;
  appointment_context?: Record<string, unknown>;
  messages?: ChatbotMessage[];
  created_at: string;
  updated_at?: string;
}

// Stats
export interface ChatbotStats {
  total_conversations: number;
  active_conversations: number;
  handed_off_conversations: number;
  weekly_conversations: number;
  weekly_messages: number;
  weekly_appointments_booked: number;
}

// Entry type labels
export const ENTRY_TYPE_LABELS: Record<KnowledgeEntryType, string> = {
  faq: 'FAQ',
  service: 'Service Description',
  policy: 'Policy',
  general: 'General Information',
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Monday',
  1: 'Tuesday',
  2: 'Wednesday',
  3: 'Thursday',
  4: 'Friday',
  5: 'Saturday',
  6: 'Sunday',
};

export const AI_PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI (GPT)',
  anthropic: 'Anthropic (Claude)',
};

export const AI_MODELS: Record<string, string[]> = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
};
