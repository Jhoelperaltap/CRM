export type MessageType = 'inquiry' | 'document_request' | 'status_update' | 'general';

export interface PortalMessage {
  id: string;
  subject: string;
  body: string;
  message_type: MessageType;
  is_from_staff: boolean;
  is_read: boolean;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  case: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  parent_message: string | null;
  replies: PortalMessage[];
  attachments: {
    id: string;
    file: string;
    file_name: string;
    file_size: number;
  }[];
  created_at: string;
  updated_at: string;
}

export interface PortalMessageCreate {
  subject: string;
  body: string;
  message_type?: MessageType;
  case_id?: string;
  parent_message_id?: string;
}

export interface PortalMessageListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PortalMessage[];
}

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  inquiry: 'Inquiry',
  document_request: 'Document Request',
  status_update: 'Status Update',
  general: 'General',
};
