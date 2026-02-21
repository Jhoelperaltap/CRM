// Billing Portal Types

export type InvoiceStatus =
  | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  | 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  | string;

export type QuoteStatus =
  | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted'
  | 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED'
  | string;

export interface BillingDashboard {
  total_revenue: string;
  pending_invoices_count: number;
  pending_invoices_amount: string;
  revenue_this_month: string;
  products_count: number;
  services_count: number;
  tenant: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export interface TenantProduct {
  id: string;
  name: string;
  product_code: string;
  category: string;
  unit_price: string;
  cost_price: string;
  unit: string;
  qty_in_stock: number;
  description: string;
  is_active: boolean;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface TenantService {
  id: string;
  name: string;
  service_code: string;
  category: string;
  unit_price: string;
  usage_unit: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  product: string | null;
  product_name: string | null;
  service: string | null;
  service_name: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  total: string;
  sort_order: number;
}

export interface TenantInvoice {
  id: string;
  invoice_number: string;
  subject: string;
  status: InvoiceStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  invoice_date: string;
  due_date: string | null;
  subtotal: string;
  tax_percent: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  amount_paid: string;
  amount_due: string;
  notes: string;
  terms_conditions: string;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteLineItem {
  id: string;
  product: string | null;
  product_name: string | null;
  service: string | null;
  service_name: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  total: string;
  sort_order: number;
}

export interface TenantQuote {
  id: string;
  quote_number: string;
  subject: string;
  status: QuoteStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  quote_date: string;
  valid_until: string | null;
  subtotal: string;
  tax_percent: string;
  tax_amount: string;
  discount_amount: string;
  total: string;
  notes: string;
  terms_conditions: string;
  line_items: QuoteLineItem[];
  created_at: string;
  updated_at: string;
}

// List response types
export interface TenantProductListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TenantProduct[];
}

export interface TenantServiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TenantService[];
}

export interface TenantInvoiceListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TenantInvoice[];
}

export interface TenantQuoteListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TenantQuote[];
}

// Status labels
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  DRAFT: 'Draft',
  SENT: 'Sent',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
  converted: 'Converted',
  DRAFT: 'Draft',
  SENT: 'Sent',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CONVERTED: 'Converted',
};

// Create/Update types
export interface CreateProductInput {
  name: string;
  product_code: string;
  category?: string;
  unit_price: string;
  cost_price?: string;
  unit?: string;
  qty_in_stock?: number;
  description?: string;
  image_url?: string;
}

export interface CreateServiceInput {
  name: string;
  service_code: string;
  category?: string;
  unit_price: string;
  usage_unit?: string;
  description?: string;
}

export interface CreateLineItemInput {
  product?: string;
  service?: string;
  description?: string;
  quantity: string;
  unit_price: string;
  discount_percent?: string;
}

export interface CreateInvoiceInput {
  invoice_number?: string;
  subject: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  invoice_date: string;
  due_date?: string;
  tax_percent?: string;
  discount_amount?: string;
  notes?: string;
  terms_conditions?: string;
  line_items: CreateLineItemInput[];
}

export interface CreateQuoteInput {
  quote_number?: string;
  subject: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  quote_date: string;
  valid_until?: string;
  tax_percent?: string;
  discount_amount?: string;
  notes?: string;
  terms_conditions?: string;
  line_items: CreateLineItemInput[];
}
