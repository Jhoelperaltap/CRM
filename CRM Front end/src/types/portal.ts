export interface PortalContact {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface PortalAccess {
  portal_access_id: string;
  email: string;
  contact: PortalContact;
  last_login: string | null;
}

export interface PortalLoginResponse {
  access: string;
  refresh: string;
  contact: PortalContact;
}

export interface PortalCase {
  id: string;
  case_number: string;
  title: string;
  status: string;
  case_type: string;
  due_date: string | null;
  description?: string;
  checklist?: PortalChecklist | null;
  created_at: string;
}

export interface PortalChecklist {
  completed_count: number;
  total_count: number;
  items: PortalChecklistItem[];
}

export interface PortalChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
  is_required: boolean;
}

export interface PortalDocumentUpload {
  id: string;
  contact: string;
  case: string | null;
  document: string;
  document_title: string;
  document_file: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface PortalMessage {
  id: string;
  contact: string;
  case: string | null;
  message_type: "client_to_staff" | "staff_to_client";
  subject: string;
  body: string;
  sender_user: string | null;
  sender_name: string;
  parent_message: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PortalAppointment {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  status: string;
  assigned_to_name: string;
  created_at: string;
}
