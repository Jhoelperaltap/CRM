// Portal Billing Types

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled";
export type QuoteStatus = "draft" | "sent" | "accepted" | "declined" | "expired" | "converted";

export interface BillingDashboard {
  total_revenue: string;
  pending_invoices_count: number;
  pending_invoices_amount: string;
  overdue_invoices_count: number;
  overdue_invoices_amount: string;
  revenue_this_month: string;
  products_count: number;
  services_count: number;
  quotes_pending_count: number;
  tenant: {
    id: string;
    name: string;
    logo_url: string | null;
    billing_address: {
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
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
  status_display: string;
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
  status_display: string;
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
  converted_invoice: string | null;
  converted_invoice_number: string | null;
  line_items: QuoteLineItem[];
  created_at: string;
  updated_at: string;
}

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

// Paginated responses
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Status badge colors
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  partial: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
  converted: "bg-purple-100 text-purple-800",
};
