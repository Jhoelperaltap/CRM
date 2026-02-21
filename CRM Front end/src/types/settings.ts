import { ModulePermission } from "./index";

export interface ExtendedModulePermission extends ModulePermission {
  can_export: boolean;
  can_import: boolean;
  role: string;
}

export interface RoleTree {
  id: string;
  name: string;
  slug: string;
  description: string;
  level: number;
  department: string;
  assign_users_policy: string;
  assign_groups_policy: string;
  user_count: number;
  permissions: ExtendedModulePermission[];
  children: RoleTree[];
}

export interface RoleDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: string | null;
  parent_name: string;
  level: number;
  department: string;
  assign_users_policy: string;
  assign_groups_policy: string;
  created_at: string;
  permissions: ExtendedModulePermission[];
  user_count?: number;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserGroupDetail extends UserGroup {
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  joined_at: string;
}

export interface SharingRule {
  id: string;
  module: string;
  default_access: "private" | "public" | "read_only";
  share_type: "role_hierarchy" | "group" | "specific_user";
  shared_from_role: string | null;
  shared_to_role: string | null;
  shared_from_group: string | null;
  shared_to_group: string | null;
  access_level: "read_only" | "read_write";
  is_active: boolean;
  created_at: string;
}

export interface AuthenticationPolicy {
  id: string;
  password_reset_frequency_days: number;
  password_history_count: number;
  idle_session_timeout_minutes: number;
  max_concurrent_sessions: number;
  enforce_password_complexity: boolean;
  min_password_length: number;
  enforce_2fa: boolean;
  remember_device_days: number;
  // SSO
  sso_enabled: boolean;
  sso_provider: string;
  sso_entity_id: string;
  sso_login_url: string;
  sso_certificate: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------
export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  is_active: boolean;
  is_headquarters: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface LoginIPWhitelistEntry {
  id: string;
  ip_address: string;
  cidr_prefix: number | null;
  role: string | null;
  user: string | null;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginHistory {
  id: string;
  user: string | null;
  user_email: string | null;
  email_attempted: string;
  status: "success" | "failed" | "blocked";
  ip_address: string | null;
  user_agent: string;
  failure_reason: string;
  timestamp: string;
}

export interface SettingsLog {
  id: string;
  user: string | null;
  user_email: string | null;
  setting_area: string;
  setting_key: string;
  old_value: Record<string, unknown>;
  new_value: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Staff Portal Management
// ---------------------------------------------------------------------------
export interface StaffPortalAccess {
  id: string;
  contact: string;
  contact_name: string;
  email: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffBillingAccess {
  id: string;
  portal_access: string;
  portal_access_email: string;
  contact_name: string;
  tenant: string;
  tenant_name: string;
  can_manage_products: boolean;
  can_manage_services: boolean;
  can_create_invoices: boolean;
  can_create_quotes: boolean;
  can_view_reports: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffPortalAccessDetail extends StaffPortalAccess {
  contact_email: string;
  temp_password?: string;
  billing_access: StaffBillingAccess | null;
}

export interface StaffDocumentReview {
  id: string;
  contact: string;
  contact_name: string;
  case: string | null;
  document: string;
  document_title: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface StaffPortalMessage {
  id: string;
  contact: string;
  contact_name: string;
  case: string | null;
  message_type: "client_to_staff" | "staff_to_client";
  subject: string;
  body: string;
  sender_user: string | null;
  sender_name: string | null;
  parent_message: string | null;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------
// 2FA
// ---------------------------------------------------------------------------
export interface TwoFactorStatus {
  is_enabled: boolean;
  enforce_required: boolean;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

export interface EncryptedFieldAccessLog {
  id: string;
  user: string | null;
  user_email: string | null;
  module: string;
  object_id: string;
  field_name: string;
  access_type: "view" | "export";
  ip_address: string | null;
  timestamp: string;
}
