/**
 * Types for Webforms
 */

export interface WebformField {
  id: string;
  field_name: string;
  is_mandatory: boolean;
  is_hidden: boolean;
  override_value: string;
  reference_field: string;
  duplicate_handling: "none" | "skip" | "update";
  sort_order: number;
}

export interface WebformHiddenField {
  id: string;
  field_name: string;
  url_parameter: string;
  override_value: string;
  sort_order: number;
}

export interface WebformRoundRobinUser {
  id: string;
  user: string;
  user_name: string;
  sort_order: number;
}

export interface WebformListItem {
  id: string;
  name: string;
  primary_module: string;
  is_active: boolean;
  captcha_enabled: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  field_count: number;
  created_by_name: string | null;
  created_at: string;
}

export interface WebformDetail {
  id: string;
  name: string;
  primary_module: string;
  return_url: string;
  description: string;
  is_active: boolean;
  captcha_enabled: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  round_robin_enabled: boolean;
  fields: WebformField[];
  hidden_fields: WebformHiddenField[];
  round_robin_users: WebformRoundRobinUser[];
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebformCreatePayload {
  name: string;
  primary_module: string;
  return_url?: string;
  description?: string;
  is_active?: boolean;
  captcha_enabled?: boolean;
  assigned_to?: string | null;
  round_robin_enabled?: boolean;
  fields?: Omit<WebformField, "id">[];
  hidden_fields?: Omit<WebformHiddenField, "id">[];
  round_robin_user_ids?: string[];
}

export const MODULE_OPTIONS = [
  { value: "contacts", label: "Contacts" },
  { value: "corporations", label: "Organizations" },
  { value: "cases", label: "Cases" },
] as const;

export const DUPLICATE_HANDLING_OPTIONS = [
  { value: "none", label: "None" },
  { value: "skip", label: "Skip" },
  { value: "update", label: "Update" },
] as const;
