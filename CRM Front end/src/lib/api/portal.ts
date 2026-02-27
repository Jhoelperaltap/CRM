import axios from "axios";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type {
  PortalAccess,
  PortalAppointment,
  PortalCase,
  PortalDocumentUpload,
  PortalLoginResponse,
  PortalMessage,
} from "@/types/portal";
import type {
  BillingDashboard,
  CreateInvoiceInput,
  CreateProductInput,
  CreateQuoteInput,
  CreateServiceInput,
  PaginatedResponse,
  TenantInvoice,
  TenantProduct,
  TenantQuote,
  TenantService,
} from "@/types/portal-billing";

/**
 * Portal API Client
 *
 * SECURITY: Uses httpOnly cookies for JWT authentication.
 * Tokens are never stored in localStorage or JavaScript-accessible storage.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const portalApi = axios.create({
  baseURL: `${API_BASE_URL}/portal`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Required for httpOnly cookies
});

// Handle 401 — redirect to portal login
portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("auth/login")
    ) {
      usePortalAuthStore.getState().clear();
      if (typeof window !== "undefined") {
        window.location.href = "/portal/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export async function portalLogin(email: string, password: string) {
  const { data } = await portalApi.post<PortalLoginResponse>("/auth/login/", {
    email,
    password,
  });
  return data;
}

export async function portalLogout() {
  await portalApi.post("/auth/logout/");
}

export async function portalGetMe() {
  const { data } = await portalApi.get<PortalAccess>("/auth/me/");
  return data;
}

export async function portalRequestPasswordReset(email: string) {
  const { data } = await portalApi.post("/auth/password-reset/", { email });
  return data;
}

export async function portalResetPassword(token: string, new_password: string) {
  const { data } = await portalApi.post("/auth/password-reset-confirm/", {
    token,
    new_password,
  });
  return data;
}

export async function portalChangePassword(
  current_password: string,
  new_password: string,
  confirm_password: string
) {
  const { data } = await portalApi.post("/auth/change-password/", {
    current_password,
    new_password,
    confirm_password,
  });
  return data;
}

// Cases
export async function portalGetCases() {
  const { data } = await portalApi.get<PortalCase[]>("/cases/");
  return data;
}

export async function portalGetCase(id: string) {
  const { data } = await portalApi.get<PortalCase>(`/cases/${id}/`);
  return data;
}

// Documents
export async function portalGetDocuments() {
  const { data } = await portalApi.get<PortalDocumentUpload[]>("/documents/");
  return data;
}

export async function portalGetDocument(id: string) {
  const { data } = await portalApi.get<PortalDocumentUpload>(`/documents/${id}/`);
  return data;
}

export async function portalUploadDocument(formData: FormData) {
  const { data } = await portalApi.post<PortalDocumentUpload>("/documents/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// Messages
export async function portalGetMessages() {
  const { data } = await portalApi.get<PortalMessage[]>("/messages/");
  return data;
}

export async function portalGetMessage(id: string) {
  const { data } = await portalApi.get<PortalMessage>(`/messages/${id}/`);
  return data;
}

export async function portalSendMessage(payload: {
  subject: string;
  body: string;
  case?: string;
  parent_message?: string;
}) {
  const { data } = await portalApi.post<PortalMessage>("/messages/", payload);
  return data;
}

export async function portalMarkMessageRead(id: string) {
  await portalApi.post(`/messages/${id}/mark-read/`);
}

// Appointments
export async function portalGetAppointments() {
  const { data } = await portalApi.get<PortalAppointment[]>("/appointments/");
  return data;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

// Dashboard
export async function portalGetBillingDashboard() {
  const { data } = await portalApi.get<BillingDashboard>("/billing/dashboard/");
  return data;
}

// Products
export async function portalGetProducts(params?: { search?: string; page?: number }) {
  const { data } = await portalApi.get<PaginatedResponse<TenantProduct>>("/billing/products/", { params });
  return data;
}

export async function portalGetProduct(id: string) {
  const { data } = await portalApi.get<TenantProduct>(`/billing/products/${id}/`);
  return data;
}

export async function portalCreateProduct(payload: CreateProductInput) {
  const { data } = await portalApi.post<TenantProduct>("/billing/products/", payload);
  return data;
}

export async function portalUpdateProduct(id: string, payload: Partial<CreateProductInput>) {
  const { data } = await portalApi.patch<TenantProduct>(`/billing/products/${id}/`, payload);
  return data;
}

export async function portalDeleteProduct(id: string) {
  await portalApi.delete(`/billing/products/${id}/`);
}

// Services
export async function portalGetServices(params?: { search?: string; page?: number }) {
  const { data } = await portalApi.get<PaginatedResponse<TenantService>>("/billing/services/", { params });
  return data;
}

export async function portalGetService(id: string) {
  const { data } = await portalApi.get<TenantService>(`/billing/services/${id}/`);
  return data;
}

export async function portalCreateService(payload: CreateServiceInput) {
  const { data } = await portalApi.post<TenantService>("/billing/services/", payload);
  return data;
}

export async function portalUpdateService(id: string, payload: Partial<CreateServiceInput>) {
  const { data } = await portalApi.patch<TenantService>(`/billing/services/${id}/`, payload);
  return data;
}

export async function portalDeleteService(id: string) {
  await portalApi.delete(`/billing/services/${id}/`);
}

// Invoices
export async function portalGetInvoices(params?: { search?: string; status?: string; page?: number }) {
  const { data } = await portalApi.get<PaginatedResponse<TenantInvoice>>("/billing/invoices/", { params });
  return data;
}

export async function portalGetInvoice(id: string) {
  const { data } = await portalApi.get<TenantInvoice>(`/billing/invoices/${id}/`);
  return data;
}

export async function portalCreateInvoice(payload: CreateInvoiceInput) {
  const { data } = await portalApi.post<TenantInvoice>("/billing/invoices/", payload);
  return data;
}

export async function portalUpdateInvoice(id: string, payload: Partial<CreateInvoiceInput>) {
  const { data } = await portalApi.patch<TenantInvoice>(`/billing/invoices/${id}/`, payload);
  return data;
}

export async function portalDeleteInvoice(id: string) {
  await portalApi.delete(`/billing/invoices/${id}/`);
}

export async function portalSendInvoice(id: string) {
  const { data } = await portalApi.post<{ status: string }>(`/billing/invoices/${id}/send/`);
  return data;
}

export async function portalMarkInvoicePaid(id: string, amount?: string) {
  const { data } = await portalApi.post<TenantInvoice>(`/billing/invoices/${id}/mark_paid/`, amount ? { amount } : {});
  return data;
}

export async function portalGetInvoicePdfUrl(id: string) {
  return `${portalApi.defaults.baseURL}/billing/invoices/${id}/pdf/`;
}

// Quotes
export async function portalGetQuotes(params?: { search?: string; status?: string; page?: number }) {
  const { data } = await portalApi.get<PaginatedResponse<TenantQuote>>("/billing/quotes/", { params });
  return data;
}

export async function portalGetQuote(id: string) {
  const { data } = await portalApi.get<TenantQuote>(`/billing/quotes/${id}/`);
  return data;
}

export async function portalCreateQuote(payload: CreateQuoteInput) {
  const { data } = await portalApi.post<TenantQuote>("/billing/quotes/", payload);
  return data;
}

export async function portalUpdateQuote(id: string, payload: Partial<CreateQuoteInput>) {
  const { data } = await portalApi.patch<TenantQuote>(`/billing/quotes/${id}/`, payload);
  return data;
}

export async function portalDeleteQuote(id: string) {
  await portalApi.delete(`/billing/quotes/${id}/`);
}

export async function portalSendQuote(id: string) {
  const { data } = await portalApi.post<{ status: string }>(`/billing/quotes/${id}/send/`);
  return data;
}

export async function portalConvertQuoteToInvoice(id: string) {
  const { data } = await portalApi.post<{ invoice_id: string; invoice_number: string }>(`/billing/quotes/${id}/convert/`);
  return data;
}

export async function portalGetQuotePdfUrl(id: string) {
  return `${portalApi.defaults.baseURL}/billing/quotes/${id}/pdf/`;
}
