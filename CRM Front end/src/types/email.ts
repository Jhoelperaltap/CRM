export interface EmailAccount {
  id: string;
  name: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  username: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_interval_minutes: number;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mime_type: string;
  file_size: number;
  file: string;
  document: string | null;
}

export interface EmailMessageListItem {
  id: string;
  message_id: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_addresses: string[];
  subject: string;
  sent_at: string | null;
  is_read: boolean;
  is_starred: boolean;
  folder: "inbox" | "sent" | "drafts" | "trash";
  contact: string | null;
  case: string | null;
  assigned_to: string | null;
  thread: string | null;
  attachment_count: number;
  contact_name: string | null;
  assigned_to_name: string | null;
}

export interface EmailMessageDetail {
  id: string;
  account: string;
  thread: string | null;
  message_id: string;
  in_reply_to: string;
  references: string;
  direction: "inbound" | "outbound";
  from_address: string;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string;
  body_text: string;
  sent_at: string | null;
  is_read: boolean;
  is_starred: boolean;
  folder: string;
  contact: string | null;
  case: string | null;
  assigned_to: string | null;
  sent_by: string | null;
  attachments: EmailAttachment[];
  contact_name: string | null;
  assigned_to_name: string | null;
  case_title: string | null;
  created_at: string;
}

export interface EmailThreadListItem {
  id: string;
  subject: string;
  contact: string | null;
  case: string | null;
  last_message_at: string | null;
  message_count: number;
  is_archived: boolean;
  last_message_subject: string | null;
  last_message_from: string | null;
  contact_name: string | null;
  has_unread: boolean;
}

export interface EmailThreadDetail {
  id: string;
  subject: string;
  contact: string | null;
  case: string | null;
  last_message_at: string | null;
  message_count: number;
  is_archived: boolean;
  messages: EmailMessageDetail[];
  contact_name: string | null;
  case_title: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  variables: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailSyncLog {
  id: string;
  account: string;
  account_name: string;
  status: "success" | "error";
  messages_fetched: number;
  error_message: string;
  started_at: string;
  completed_at: string | null;
}

export interface EmailSettingsData {
  server_type: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_use_tls: boolean;
  email_tracking_enabled: boolean;
  include_email_footer: boolean;
  email_footer_text: string;
  case_reply_to: string;
  case_allow_group_value: boolean;
  case_bcc_address: string;
  ticket_reply_to: string;
  ticket_reply_to_address: string;
  ticket_from_name: string;
  ticket_bcc_address: string;
  adhoc_reply_to: string;
  sys_notif_from_name: string;
  sys_notif_from_reply_to: string;
  email_font_family: string;
  email_font_size: number;
  email_opt_in: string;
  allow_adhoc_opted_out: boolean;
  allow_workflow_opted_out: boolean;
  auto_double_opt_in: boolean;
  customer_notif_from_name: string;
  customer_notif_from_email: string;
  undo_send_enabled: boolean;
  undo_send_duration: number;
  updated_at: string;
}

export interface ComposeEmailPayload {
  account: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject: string;
  body_text: string;
  contact?: string | null;
  case?: string | null;
  in_reply_to?: string;
  references?: string;
  template_id?: string | null;
  template_context?: Record<string, string>;
  attachment_ids?: string[];
}
