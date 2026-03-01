/**
 * Types for Portal Administration Panel
 */

// Module preset (template configuration)
export interface PortalModulePreset {
  id: string;
  name: string;
  description: string;
  module_dashboard: boolean;
  module_billing: boolean;
  module_messages: boolean;
  module_documents: boolean;
  module_cases: boolean;
  module_rentals: boolean;
  module_buildings: boolean;
  module_appointments: boolean;
  is_system: boolean;
  is_default: boolean;
  enabled_modules: string[];
  created_at: string;
  updated_at: string;
}

// Per-client configuration
export interface PortalClientConfig {
  id: string;
  contact: string;
  preset: string | null;
  preset_name: string | null;
  module_dashboard: boolean;
  module_billing: boolean;
  module_messages: boolean;
  module_documents: boolean;
  module_cases: boolean;
  module_rentals: boolean;
  module_buildings: boolean;
  module_appointments: boolean;
  is_portal_active: boolean;
  last_login: string | null;
  last_activity: string | null;
  notes: string | null;
  enabled_modules: string[];
  // Licensing limits (0 = unlimited)
  max_buildings: number;
  max_floors_per_building: number;
  max_units_per_building: number;
  max_rental_properties: number;
  created_at: string;
  updated_at: string;
}

// Client list item
export interface PortalClient {
  contact_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  has_portal_access: boolean;
  portal_config: {
    is_portal_active: boolean;
    enabled_modules: string[];
    last_login: string | null;
    last_activity: string | null;
    preset_name: string | null;
  } | null;
  is_online: boolean;
  created_at: string;
}

// Client detail with additional info
export interface PortalClientDetail extends PortalClient {
  active_sessions: PortalSession[];
  portal_access_email: string | null;
}

// Portal session
export interface PortalSession {
  id: string;
  contact: string;
  session_key: string;
  ip_address: string;
  user_agent: string | null;
  is_active: boolean;
  last_activity: string;
  logged_out_at: string | null;
  created_at: string;
}

// Admin audit log
export interface PortalAdminLog {
  id: string;
  admin_user: string;
  admin_user_name: string;
  admin_user_email: string;
  contact: string;
  contact_name: string;
  action: string;
  action_display: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

// Impersonation token
export interface PortalImpersonationToken {
  id: string;
  admin_user: string;
  admin_user_name: string;
  contact: string;
  contact_name: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  is_valid: boolean;
  remaining_minutes: number;
  ended_at: string | null;
  ip_address: string;
  created_at: string;
}

// Impersonation start response
export interface ImpersonationStartResponse {
  token: string;
  expires_at: string;
  remaining_minutes: number;
  contact_id: string;
  contact_name: string;
  portal_url: string;
}

// Admin statistics
export interface PortalAdminStats {
  total_clients: number;
  clients_with_access: number;
  active_clients: number;
  online_now: number;
  inactive_30_days: number;
}

// Update config input
export interface UpdateClientConfigInput {
  module_dashboard?: boolean;
  module_billing?: boolean;
  module_messages?: boolean;
  module_documents?: boolean;
  module_cases?: boolean;
  module_rentals?: boolean;
  module_buildings?: boolean;
  module_appointments?: boolean;
  is_portal_active?: boolean;
  notes?: string;
  // Licensing limits (0 = unlimited)
  max_buildings?: number;
  max_floors_per_building?: number;
  max_units_per_building?: number;
  max_rental_properties?: number;
}

// Preset create/update input
export interface PresetInput {
  name: string;
  description?: string;
  module_dashboard?: boolean;
  module_billing?: boolean;
  module_messages?: boolean;
  module_documents?: boolean;
  module_cases?: boolean;
  module_rentals?: boolean;
  module_buildings?: boolean;
  module_appointments?: boolean;
  is_default?: boolean;
}
