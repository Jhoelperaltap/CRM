export interface PortalMenuItem {
  id: string;
  module_name: string;
  label: string;
  is_enabled: boolean;
  sort_order: number;
}

export interface PortalShortcut {
  id: string;
  shortcut_type: "add_document" | "create_case" | "open_cases" | "custom";
  label: string;
  custom_url: string;
  is_enabled: boolean;
  sort_order: number;
}

export interface PortalFieldConfig {
  id: string;
  module_name: string;
  field_name: string;
  field_label: string;
  permission: "hidden" | "read_only" | "read_write";
  is_mandatory: boolean;
  sort_order: number;
}

export interface PortalConfiguration {
  id: string;
  portal_url: string;
  default_assignee: string | null;
  default_assignee_name: string | null;
  support_notification_days: number;
  login_details_template: string;
  forgot_password_template: string;
  custom_css_url: string;
  default_scope: "all" | "own";
  session_timeout_hours: string;
  announcement_html: string;
  greeting_type: "standard" | "time_based";
  account_rep_widget_enabled: boolean;
  recent_documents_widget_enabled: boolean;
  recent_faq_widget_enabled: boolean;
  recent_cases_widget_enabled: boolean;
  chart_open_cases_priority: boolean;
  chart_cases_resolution_time: boolean;
  chart_projects_by_status: boolean;
  is_active: boolean;
  menu_items: PortalMenuItem[];
  shortcuts: PortalShortcut[];
  field_configs: PortalFieldConfig[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_MENU_ITEMS = [
  { module_name: "home", label: "Home", is_enabled: true },
  { module_name: "faq", label: "FAQ", is_enabled: true },
  { module_name: "invoices", label: "Invoices", is_enabled: true },
  { module_name: "quotes", label: "Quotes", is_enabled: true },
  { module_name: "products", label: "Products", is_enabled: true },
  { module_name: "services", label: "Services", is_enabled: true },
  { module_name: "documents", label: "Documents", is_enabled: true },
  { module_name: "assets", label: "Assets", is_enabled: true },
  { module_name: "project_milestones", label: "Project Milestones", is_enabled: true },
  { module_name: "projects", label: "Projects", is_enabled: true },
  { module_name: "service_contracts", label: "Service Contracts", is_enabled: true },
  { module_name: "cases", label: "Cases", is_enabled: true },
  { module_name: "tasks", label: "Tasks", is_enabled: false },
  { module_name: "deals", label: "Deals", is_enabled: false },
  { module_name: "purchase_orders", label: "Purchase Orders", is_enabled: false },
  { module_name: "sales_orders", label: "Sales Orders", is_enabled: false },
  { module_name: "campaigns", label: "Campaigns", is_enabled: false },
  { module_name: "vendors", label: "Vendors", is_enabled: false },
  { module_name: "work_orders", label: "Work Orders", is_enabled: false },
  { module_name: "esign_documents", label: "Esign Documents", is_enabled: false },
  { module_name: "live_chats", label: "Live Chats", is_enabled: false },
  { module_name: "payments", label: "Payments", is_enabled: false },
] as const;

export const DEFAULT_CONTACT_FIELDS = [
  { field_name: "first_name", field_label: "First Name", permission: "read_write" as const, is_mandatory: true },
  { field_name: "last_name", field_label: "Last Name", permission: "read_write" as const, is_mandatory: true },
  { field_name: "primary_email", field_label: "Primary Email", permission: "read_only" as const, is_mandatory: false },
  { field_name: "secondary_email", field_label: "Secondary Email", permission: "read_write" as const, is_mandatory: false },
  { field_name: "mobile_phone", field_label: "Mobile Phone", permission: "read_write" as const, is_mandatory: false },
  { field_name: "office_phone", field_label: "Office Phone", permission: "read_write" as const, is_mandatory: false },
  { field_name: "language", field_label: "Language", permission: "read_write" as const, is_mandatory: false },
];

export const DEFAULT_ORG_FIELDS = [
  { field_name: "name", field_label: "Organization Name", permission: "read_only" as const, is_mandatory: true },
  { field_name: "website", field_label: "Website", permission: "read_write" as const, is_mandatory: false },
  { field_name: "phone", field_label: "Phone", permission: "read_write" as const, is_mandatory: false },
  { field_name: "address", field_label: "Address", permission: "read_write" as const, is_mandatory: false },
];

export const SESSION_TIMEOUT_OPTIONS = [
  { value: "1", label: "1 hour(s)" },
  { value: "2", label: "2 hour(s)" },
  { value: "4", label: "4 hour(s)" },
  { value: "8", label: "8 hour(s)" },
  { value: "12", label: "12 hour(s)" },
  { value: "24", label: "24 hour(s)" },
] as const;

export const DEFAULT_SCOPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "own", label: "Own Records Only" },
] as const;

export const SHORTCUT_TYPES = [
  { value: "add_document", label: "Add Document" },
  { value: "create_case", label: "Create Case" },
  { value: "open_cases", label: "Open Cases" },
  { value: "custom", label: "Custom Link" },
] as const;
