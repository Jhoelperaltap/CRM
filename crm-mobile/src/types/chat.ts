export type MessageRole = 'user' | 'assistant' | 'system';
export type ConversationStatus = 'active' | 'handed_off' | 'closed';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  status: ConversationStatus;
  messages: ChatMessage[];
  created_at: string;
}

export interface ChatStartResponse {
  conversation_id: string;
  message: string;
  status: ConversationStatus;
}

export interface ChatMessageResponse {
  conversation_id: string;
  message: string;
  action: string | null;
  metadata: Record<string, unknown>;
  status: ConversationStatus;
}

export interface AppointmentSlot {
  date: string;
  time: string;
  end_time: string;
}

export interface BookAppointmentRequest {
  date: string;
  time: string;
  service_type: 'tax_preparation' | 'tax_consultation' | 'document_review' | 'general_inquiry';
  notes?: string;
}

export interface BookAppointmentResponse {
  success: boolean;
  appointment_id?: string;
  message: string;
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  tax_preparation: 'Tax Preparation',
  tax_consultation: 'Tax Consultation',
  document_review: 'Document Review',
  general_inquiry: 'General Inquiry',
};
