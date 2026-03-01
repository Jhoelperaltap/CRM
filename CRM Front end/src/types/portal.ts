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
  modules?: PortalModules;
  impersonation?: PortalImpersonationInfo | null;
}

// Module access control
export interface PortalModules {
  dashboard: boolean;
  billing: boolean;
  messages: boolean;
  documents: boolean;
  cases: boolean;
  rentals: boolean;
  buildings: boolean;
  appointments: boolean;
}

// Impersonation info from backend
export interface PortalImpersonationInfo {
  is_impersonating: boolean;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  contact_id: string | null;
  contact_name: string | null;
  expires_at: string | null;
  remaining_minutes: number;
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

// License usage types
export interface LicenseLimit {
  current?: number;
  limit: number;
  unlimited: boolean;
}

export interface LicenseUsage {
  buildings: LicenseLimit;
  floors_per_building: LicenseLimit;
  units_per_building: LicenseLimit;
  rental_properties: LicenseLimit;
}
