export interface UserGroupSummary {
  id: string;
  name: string;
}

export interface BusinessHoursSummary {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  // User Information
  user_type: "standard" | "admin" | "power_user";
  role: Role | null;
  role_slug: string | null;
  is_admin: boolean;
  is_manager: boolean;
  reports_to: UserSummary | null;
  primary_group: UserGroupSummary | null;
  language: string;
  branch: string | null;
  branch_name: string | null;
  // Employee Information
  title: string;
  department: string;
  secondary_email: string;
  other_email: string;
  phone: string;
  home_phone: string;
  mobile_phone: string;
  secondary_phone: string;
  fax: string;
  // User Address
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  // Currency and Number Preferences
  preferred_currency: string;
  show_amounts_in_preferred_currency: boolean;
  digit_grouping_pattern: string;
  decimal_separator: string;
  digit_grouping_separator: string;
  symbol_placement: string;
  number_of_currency_decimals: number;
  truncate_trailing_zeros: boolean;
  currency_format: string;
  aggregated_number_format: string;
  // Phone Preferences
  phone_country_code: string;
  asterisk_extension: string;
  use_full_screen_record_preview: boolean;
  // Signature
  signature_block: string;
  insert_signature_before_quoted_text: boolean;
  // User Business Hours
  business_hours: BusinessHoursSummary | null;
  // Usage Preferences
  default_page_after_login: string;
  default_record_view: "summary" | "detail";
  use_mail_composer: boolean;
  person_name_format: string;
  // Avatar & Security
  avatar: string;
  is_active: boolean;
  last_login: string | null;
  last_login_ip: string | null;
  email_account: string | null;
  email_account_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string;
  parent: string | null;
  level: number;
  department: string;
  permissions: ModulePermission[];
  user_count?: number;
}

export interface ModulePermission {
  id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_import: boolean;
}

export interface Contact {
  id: string;
  contact_number: string;
  // Basic Information
  salutation: string;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string;
  department: string;
  reports_to: ContactSummary | null;
  // Contact Info
  email: string;
  secondary_email: string;
  phone: string;
  mobile: string;
  home_phone: string;
  fax: string;
  assistant: string;
  assistant_phone: string;
  // Personal
  date_of_birth: string | null;
  ssn_last_four: string;
  // Lead & Source
  lead_source: string;
  source: string;
  referred_by: string;
  source_campaign: string;
  platform: string;
  ad_group: string;
  // Communication Preferences
  do_not_call: boolean;
  notify_owner: boolean;
  email_opt_in: string;
  sms_opt_in: string;
  // Mailing Address
  mailing_street: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
  mailing_country: string;
  mailing_po_box: string;
  // Other Address
  other_street: string;
  other_city: string;
  other_state: string;
  other_zip: string;
  other_country: string;
  other_po_box: string;
  // Legacy Address
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  // Language & Timezone
  preferred_language: string;
  timezone: string;
  // Status
  status: "active" | "inactive" | "lead";
  // Customer Portal
  portal_user: boolean;
  support_start_date: string | null;
  support_end_date: string | null;
  // Social Media
  twitter_username: string;
  linkedin_url: string;
  linkedin_followers: number | null;
  facebook_url: string;
  facebook_followers: number | null;
  // Image
  image: string | null;
  // Relationships
  corporation: CorporationSummary | null;
  assigned_to: UserSummary | null;
  created_by: UserSummary | null;
  sla: SLASummary | null;
  // Office Services
  office_services: string;
  // Other
  description: string;
  tags: string;
  is_starred: boolean;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContactListItem {
  id: string;
  contact_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  secondary_email: string;
  phone: string;
  mobile: string;
  title: string;
  department: string;
  status: string;
  lead_source: string;
  source: string;
  preferred_language: string;
  mailing_city: string;
  mailing_state: string;
  office_services: string;
  corporation_name: string | null;
  assigned_to_name: string | null;
  is_starred: boolean;
  created_at: string;
}

export interface SLASummary {
  id: string;
  name: string;
}

export interface Corporation {
  id: string;
  // Organization Details
  name: string;
  legal_name: string;
  entity_type: string;
  organization_type: "lead" | "customer" | "partner" | "reseller" | "competitor" | "investor" | "press" | "prospect" | "other";
  organization_status: "hot" | "warm" | "cold";
  ein: string;
  state_id: string;
  // Business details
  employees: number | null;
  ownership: string;
  ticker_symbol: string;
  sic_code: string;
  industry: string;
  annual_revenue: number | null;
  annual_revenue_range: string;
  fiscal_year_end: string;
  date_incorporated: string | null;
  region: string;
  timezone: string;
  // Contact info
  phone: string;
  secondary_phone: string;
  fax: string;
  email: string;
  secondary_email: string;
  email_domain: string;
  website: string;
  // Social media
  twitter_username: string;
  linkedin_url: string;
  facebook_url: string;
  // Marketing preferences
  email_opt_in: string;
  sms_opt_in: string;
  notify_owner: boolean;
  // Billing address
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  billing_po_box: string;
  // Shipping address
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  shipping_po_box: string;
  // Legacy address
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  // Status & relationships
  status: "active" | "inactive" | "dissolved";
  member_of: CorporationSummary | null;
  primary_contact: ContactSummary | null;
  assigned_to: UserSummary | null;
  created_by: UserSummary | null;
  sla: SLASummary | null;
  // Other
  description: string;
  image: string | null;
  custom_fields: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CorporationListItem {
  id: string;
  name: string;
  entity_type: string;
  organization_type: string;
  organization_status: string;
  ein: string;
  phone: string;
  email: string;
  website: string;
  industry: string;
  employees: number | null;
  region: string;
  billing_city: string;
  billing_state: string;
  status: string;
  primary_contact_name: string | null;
  assigned_to_name: string | null;
  member_of_name: string | null;
  created_at: string;
}

export interface TaxCase {
  id: string;
  case_number: string;
  title: string;
  case_type: string;
  fiscal_year: number;
  status: string;
  priority: string;
  contact: ContactSummary;
  corporation: CorporationSummary | null;
  assigned_preparer: UserSummary | null;
  reviewer: UserSummary | null;
  created_by: UserSummary | null;
  estimated_fee: number | null;
  actual_fee: number | null;
  due_date: string | null;
  extension_date: string | null;
  filed_date: string | null;
  completed_date: string | null;
  closed_date: string | null;
  description: string;
  notes: TaxCaseNote[];
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxCaseListItem {
  id: string;
  case_number: string;
  title: string;
  case_type: string;
  fiscal_year: number;
  status: string;
  priority: string;
  contact_name: string;
  assigned_preparer_name: string;
  due_date: string | null;
  estimated_fee: number | null;
  closed_date: string | null;
  created_at: string;
}

export interface TaxCaseNote {
  id: string;
  case: string;
  author: UserSummary;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  status: string;
  contact: ContactSummary;
  assigned_to: UserSummary | null;
  created_by: UserSummary | null;
  case: CaseSummary | null;
  reminder_at: string | null;
  notes: string;
  recurrence_pattern: "none" | "daily" | "weekly" | "monthly";
  recurrence_end_date: string | null;
  parent_appointment: string | null;
  recurrence_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AppointmentListItem {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location: string;
  status: string;
  contact: string;
  contact_name: string;
  assigned_to: string | null;
  assigned_to_name: string;
  case: string | null;
  created_at: string;
}

export interface CalendarAppointment {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  contact_name: string;
  assigned_to_name: string;
  location: string;
  color: string;
  parent_appointment: string | null;
  recurrence_pattern: string;
}

export interface DocumentFolder {
  id: string;
  name: string;
  parent: string | null;
  owner: string | null;
  is_default: boolean;
  document_count: number;
  children_count: number;
}

export interface DocumentFolderTreeNode {
  id: string;
  name: string;
  parent: string | null;
  owner: string | null;
  is_default: boolean;
  document_count: number;
  children: DocumentFolderTreeNode[];
}

export interface DocumentTag {
  id: string;
  name: string;
  color: string;
  tag_type: "shared" | "personal";
  owner: string | null;
  created_at: string;
}

export interface DocumentLink {
  id: string;
  title: string;
  url: string;
  description: string;
  folder: string | null;
  contact: string | null;
  corporation: string | null;
  case: string | null;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
}

export interface DocumentLinkDetail {
  id: string;
  title: string;
  url: string;
  description: string;
  folder: { id: string; name: string } | null;
  tags: DocumentTag[];
  contact: ContactSummary | null;
  corporation: CorporationSummary | null;
  case: CaseSummary | null;
  created_by: UserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  file: string;
  doc_type: string;
  status: string;
  description: string;
  file_size: number;
  mime_type: string;
  version: number;
  is_encrypted: boolean;
  encryption_key_id: string;
  parent_document: string | null;
  contact: ContactSummary | null;
  corporation: CorporationSummary | null;
  case: CaseSummary | null;
  folder: { id: string; name: string } | null;
  tags: DocumentTag[];
  uploaded_by: UserSummary | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentAccessLog {
  id: string;
  user: string | null;
  user_id: string | null;
  action: "view" | "download";
  ip_address: string | null;
  created_at: string;
}

export interface DocumentListItem {
  id: string;
  title: string;
  doc_type: string;
  status: string;
  file_size: number;
  mime_type: string;
  version: number;
  is_encrypted: boolean;
  parent_document: string | null;
  contact: string | null;
  corporation: string | null;
  case: string | null;
  folder: string | null;
  folder_name: string | null;
  tag_ids: string[];
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
}

export interface GroupSummary {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: UserSummary | null;
  assigned_group: GroupSummary | null;
  created_by: UserSummary | null;
  case: CaseSummary | null;
  contact: ContactSummary | null;
  due_date: string | null;
  completed_at: string | null;
  sla_hours: number | null;
  sla_breached_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskListItem {
  id: string;
  title: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string;
  assigned_group: string | null;
  case: string | null;
  contact: string | null;
  due_date: string | null;
  completed_at: string | null;
  sla_hours: number | null;
  sla_breached_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user: UserSummary | null;
  action: string;
  module: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string;
  request_path: string;
  timestamp: string;
}

// Internal Ticket types
export interface InternalTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  group: GroupSummary | null;
  assigned_to: UserSummary | null;
  channel: string;
  resolution: string;
  email: string;
  category: string;
  deferred_date: string | null;
  resolution_type: string;
  rating: string;
  reopen_count: number;
  satisfaction_survey_feedback: string;
  employee: UserSummary | null;
  created_by: UserSummary | null;
  sla_name: string;
  sla_hours: number | null;
  sla_breached_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InternalTicketListItem {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  channel: string;
  assigned_to: string | null;
  assigned_to_name: string;
  group: string | null;
  group_name: string;
  employee: string | null;
  employee_name: string;
  deferred_date: string | null;
  rating: string;
  reopen_count: number;
  satisfaction_survey_feedback: string;
  sla_name: string;
  sla_hours: number | null;
  sla_breached_at: string | null;
  created_at: string;
}

// Quote types
export interface QuoteLineItem {
  id: string;
  service_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  quote_number: string;
  subject: string;
  stage: string;
  valid_until: string | null;
  contact: ContactSummary;
  corporation: CorporationSummary | null;
  case: CaseSummary | null;
  assigned_to: UserSummary | null;
  created_by: UserSummary | null;
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  terms_conditions: string;
  description: string;
  line_items: QuoteLineItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteListItem {
  id: string;
  quote_number: string;
  subject: string;
  stage: string;
  contact_name: string;
  corporation_name: string | null;
  assigned_to_name: string | null;
  total: number;
  valid_until: string | null;
  created_at: string;
}

// Summary types for nested serializers
export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
}

export interface ContactSummary {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

export interface CorporationSummary {
  id: string;
  name: string;
}

export interface CaseSummary {
  id: string;
  case_number: string;
  title: string;
}

// Module Config types
export interface CRMModule {
  id: string;
  name: string;
  label: string;
  label_plural: string;
  icon: string;
  description: string;
  is_active: boolean;
  sort_order: number;
  number_prefix: string;
  number_format: string;
  number_reset_period: string;
  number_next_seq: number;
  default_fields: Record<string, unknown>;
  custom_fields_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  module: string;
  field_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_active: boolean;
  default_value: string;
  placeholder: string;
  help_text: string;
  options: { value: string; label: string }[];
  validation_rules: Record<string, unknown>;
  sort_order: number;
  section: string;
  visible_to_roles: string[];
  created_at: string;
  updated_at: string;
}

export interface Picklist {
  id: string;
  name: string;
  label: string;
  module: string | null;
  module_name: string | null;
  is_system: boolean;
  description: string;
  values: PicklistValue[];
  created_at: string;
  updated_at: string;
}

export interface PicklistValue {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_default: boolean;
  is_active: boolean;
  color: string;
  description: string;
}

export interface FieldLabel {
  id: string;
  module: string;
  field_name: string;
  language: string;
  custom_label: string;
  created_at: string;
  updated_at: string;
}

/* ── Esign Documents ────────────────────────────────────────────── */

export interface EsignSignee {
  id: string;
  order: number;
  signee_type: "contact" | "user" | "external";
  contact: string | null;
  contact_name: string;
  user: string | null;
  recipient_email: string;
  status: "pending" | "sent" | "viewed" | "signed" | "declined";
  signed_at: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface EsignDocumentListItem {
  id: string;
  title: string;
  status: string;
  document_source: "upload" | "internal" | "related";
  email_subject: string;
  created_by: string | null;
  created_by_name: string;
  signee_count: number;
  sent_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface EsignDocumentDetail {
  id: string;
  title: string;
  status: string;
  document_source: "upload" | "internal" | "related";
  file: string | null;
  internal_document: string | null;
  internal_document_title: string;
  related_module: string;
  related_record_id: string | null;
  email_subject: string;
  email_note: string;
  created_by: string | null;
  created_by_name: string;
  signees: EsignSignee[];
  sent_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ── Inventory ────────────────────────────────────────────────── */

export interface TaxRateItem {
  id: string;
  name: string;
  rate: string;
  is_active: boolean;
  is_compound: boolean;
  tax_type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface TermsAndConditionsItem {
  id: string;
  name: string;
  content: string;
  module: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorListItem {
  id: string;
  name: string;
  vendor_code: string;
  email: string;
  phone: string;
  category: string;
  city: string;
  country: string;
  is_active: boolean;
  assigned_to: string | null;
  assigned_to_name: string;
  created_at: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  product_code: string;
  category: string;
  unit_price: string;
  cost_price: string;
  unit: string;
  qty_in_stock: number;
  reorder_level: number;
  is_active: boolean;
  vendor: string | null;
  vendor_name: string;
  tax_rate: string | null;
  tax_rate_name: string;
  created_at: string;
}

export interface ServiceListItem {
  id: string;
  name: string;
  service_code: string;
  category: string;
  unit_price: string;
  usage_unit: string;
  is_active: boolean;
  tax_rate: string | null;
  tax_rate_name: string;
  created_at: string;
}

export interface PriceBookListItem {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  currency: string;
  entry_count: number;
  created_at: string;
}

export interface InvoiceLineItemDetail {
  id: string;
  product: string | null;
  product_name: string;
  service: string | null;
  service_name: string;
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string | null;
  total: string;
  sort_order: number;
}

export interface InvoiceDetail {
  id: string;
  invoice_number: string;
  subject: string;
  status: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  sales_order: string | null;
  order_date: string | null;
  due_date: string | null;
  customer_no: string;
  purchase_order_ref: string;
  sales_commission: string;
  excise_duty: string;
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  billing_po_box: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  shipping_po_box: string;
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  tax_amount: string;
  adjustment: string;
  total: string;
  terms_and_conditions: string;
  description: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_by: string | null;
  created_by_name: string;
  line_items: InvoiceLineItemDetail[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceListItem {
  id: string;
  invoice_number: string;
  subject: string;
  status: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  invoice_date: string | null;
  due_date: string | null;
  total: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_at: string;
}

export interface SalesOrderDetail {
  id: string;
  so_number: string;
  subject: string;
  status: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  quote: string | null;
  order_date: string | null;
  due_date: string | null;
  customer_no: string;
  purchase_order_ref: string;
  carrier: string;
  pending: string;
  sales_commission: string;
  excise_duty: string;
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  billing_po_box: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  shipping_po_box: string;
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  tax_amount: string;
  adjustment: string;
  total: string;
  terms_and_conditions: string;
  description: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_by: string | null;
  created_by_name: string;
  line_items: InvoiceLineItemDetail[];
  created_at: string;
  updated_at: string;
}

export interface SalesOrderListItem {
  id: string;
  so_number: string;
  subject: string;
  status: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  quote: string | null;
  order_date: string | null;
  due_date: string | null;
  total: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_at: string;
}

export interface PurchaseOrderListItem {
  id: string;
  po_number: string;
  subject: string;
  status: string;
  vendor: string | null;
  vendor_name: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  order_date: string | null;
  due_date: string | null;
  total: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_at: string;
}

export interface PurchaseOrderDetail {
  id: string;
  po_number: string;
  subject: string;
  status: string;
  vendor: string | null;
  vendor_name: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  sales_order: string | null;
  order_date: string | null;
  due_date: string | null;
  requisition_number: string;
  sales_commission: string;
  excise_duty: string;
  carrier: string;
  tracking_number: string;
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_zip: string;
  billing_country: string;
  billing_po_box: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  shipping_po_box: string;
  subtotal: string;
  discount_percent: string;
  discount_amount: string;
  tax_amount: string;
  adjustment: string;
  total: string;
  terms_and_conditions: string;
  description: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_by: string | null;
  created_by_name: string;
  line_items: InvoiceLineItemDetail[];
  created_at: string;
  updated_at: string;
}

export interface PaymentListItem {
  id: string;
  payment_number: string;
  amount: string;
  payment_date: string;
  payment_mode: string;
  status: string;
  reference_number: string;
  invoice: string | null;
  invoice_number: string;
  contact: string | null;
  contact_name: string;
  created_at: string;
}

export interface WorkOrderListItem {
  id: string;
  wo_number: string;
  subject: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_to_name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface AssetListItem {
  id: string;
  name: string;
  serial_number: string;
  status: string;
  product: string | null;
  product_name: string;
  contact: string | null;
  contact_name: string;
  corporation: string | null;
  corporation_name: string;
  assigned_to: string | null;
  assigned_to_name: string;
  purchase_date: string | null;
  warranty_end_date: string | null;
  date_in_service: string | null;
  date_sold: string | null;
  created_at: string;
}

export interface StockTransactionItem {
  id: string;
  product: string;
  product_name: string;
  transaction_type: string;
  quantity: number;
  reference: string;
  notes: string;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
}
