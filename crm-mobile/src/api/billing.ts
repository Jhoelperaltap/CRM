import apiClient from './client';
import { API_ENDPOINTS } from '../constants/api';
import {
  BillingDashboard,
  TenantProduct,
  TenantProductListResponse,
  TenantService,
  TenantServiceListResponse,
  TenantInvoice,
  TenantInvoiceListResponse,
  TenantQuote,
  TenantQuoteListResponse,
  CreateProductInput,
  CreateServiceInput,
  CreateInvoiceInput,
  CreateQuoteInput,
} from '../types/billing';

// Dashboard
export async function getBillingDashboard(): Promise<BillingDashboard> {
  const response = await apiClient.get<BillingDashboard>(API_ENDPOINTS.BILLING_DASHBOARD);
  return response.data;
}

// Products
export async function getProducts(params?: {
  page?: number;
  search?: string;
  category?: string;
}): Promise<TenantProductListResponse> {
  const response = await apiClient.get<TenantProduct[] | TenantProductListResponse>(
    API_ENDPOINTS.BILLING_PRODUCTS,
    { params }
  );
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length, next: null, previous: null };
  }
  return response.data;
}

export async function getProduct(id: string): Promise<TenantProduct> {
  const response = await apiClient.get<TenantProduct>(API_ENDPOINTS.BILLING_PRODUCT_DETAIL(id));
  return response.data;
}

export async function createProduct(data: CreateProductInput): Promise<TenantProduct> {
  const response = await apiClient.post<TenantProduct>(API_ENDPOINTS.BILLING_PRODUCTS, data);
  return response.data;
}

export async function updateProduct(id: string, data: Partial<CreateProductInput>): Promise<TenantProduct> {
  const response = await apiClient.patch<TenantProduct>(API_ENDPOINTS.BILLING_PRODUCT_DETAIL(id), data);
  return response.data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.BILLING_PRODUCT_DETAIL(id));
}

// Services
export async function getServices(params?: {
  page?: number;
  search?: string;
  category?: string;
}): Promise<TenantServiceListResponse> {
  const response = await apiClient.get<TenantService[] | TenantServiceListResponse>(
    API_ENDPOINTS.BILLING_SERVICES,
    { params }
  );
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length, next: null, previous: null };
  }
  return response.data;
}

export async function getService(id: string): Promise<TenantService> {
  const response = await apiClient.get<TenantService>(API_ENDPOINTS.BILLING_SERVICE_DETAIL(id));
  return response.data;
}

export async function createService(data: CreateServiceInput): Promise<TenantService> {
  const response = await apiClient.post<TenantService>(API_ENDPOINTS.BILLING_SERVICES, data);
  return response.data;
}

export async function updateService(id: string, data: Partial<CreateServiceInput>): Promise<TenantService> {
  const response = await apiClient.patch<TenantService>(API_ENDPOINTS.BILLING_SERVICE_DETAIL(id), data);
  return response.data;
}

export async function deleteService(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.BILLING_SERVICE_DETAIL(id));
}

// Invoices
export async function getInvoices(params?: {
  page?: number;
  status?: string;
  search?: string;
}): Promise<TenantInvoiceListResponse> {
  const response = await apiClient.get<TenantInvoice[] | TenantInvoiceListResponse>(
    API_ENDPOINTS.BILLING_INVOICES,
    { params }
  );
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length, next: null, previous: null };
  }
  return response.data;
}

export async function getInvoice(id: string): Promise<TenantInvoice> {
  const response = await apiClient.get<TenantInvoice>(API_ENDPOINTS.BILLING_INVOICE_DETAIL(id));
  return response.data;
}

export async function createInvoice(data: CreateInvoiceInput): Promise<TenantInvoice> {
  const response = await apiClient.post<TenantInvoice>(API_ENDPOINTS.BILLING_INVOICES, data);
  return response.data;
}

export async function updateInvoice(id: string, data: Partial<CreateInvoiceInput>): Promise<TenantInvoice> {
  const response = await apiClient.patch<TenantInvoice>(API_ENDPOINTS.BILLING_INVOICE_DETAIL(id), data);
  return response.data;
}

export async function deleteInvoice(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.BILLING_INVOICE_DETAIL(id));
}

export async function sendInvoice(id: string): Promise<TenantInvoice> {
  const response = await apiClient.post<TenantInvoice>(API_ENDPOINTS.BILLING_INVOICE_SEND(id));
  return response.data;
}

export async function markInvoicePaid(id: string, amount?: string): Promise<TenantInvoice> {
  const response = await apiClient.post<TenantInvoice>(
    API_ENDPOINTS.BILLING_INVOICE_MARK_PAID(id),
    amount ? { amount } : {}
  );
  return response.data;
}

export async function getInvoicePdfUrl(id: string): Promise<string> {
  const response = await apiClient.get<{ pdf_url: string }>(API_ENDPOINTS.BILLING_INVOICE_PDF(id));
  return response.data.pdf_url;
}

// Quotes
export async function getQuotes(params?: {
  page?: number;
  status?: string;
  search?: string;
}): Promise<TenantQuoteListResponse> {
  const response = await apiClient.get<TenantQuote[] | TenantQuoteListResponse>(
    API_ENDPOINTS.BILLING_QUOTES,
    { params }
  );
  if (Array.isArray(response.data)) {
    return { results: response.data, count: response.data.length, next: null, previous: null };
  }
  return response.data;
}

export async function getQuote(id: string): Promise<TenantQuote> {
  const response = await apiClient.get<TenantQuote>(API_ENDPOINTS.BILLING_QUOTE_DETAIL(id));
  return response.data;
}

export async function createQuote(data: CreateQuoteInput): Promise<TenantQuote> {
  const response = await apiClient.post<TenantQuote>(API_ENDPOINTS.BILLING_QUOTES, data);
  return response.data;
}

export async function updateQuote(id: string, data: Partial<CreateQuoteInput>): Promise<TenantQuote> {
  const response = await apiClient.patch<TenantQuote>(API_ENDPOINTS.BILLING_QUOTE_DETAIL(id), data);
  return response.data;
}

export async function deleteQuote(id: string): Promise<void> {
  await apiClient.delete(API_ENDPOINTS.BILLING_QUOTE_DETAIL(id));
}

export async function sendQuote(id: string): Promise<TenantQuote> {
  const response = await apiClient.post<TenantQuote>(API_ENDPOINTS.BILLING_QUOTE_SEND(id));
  return response.data;
}

export async function convertQuoteToInvoice(id: string): Promise<TenantInvoice> {
  const response = await apiClient.post<TenantInvoice>(API_ENDPOINTS.BILLING_QUOTE_CONVERT(id));
  return response.data;
}

export async function getQuotePdfUrl(id: string): Promise<string> {
  const response = await apiClient.get<{ pdf_url: string }>(API_ENDPOINTS.BILLING_QUOTE_PDF(id));
  return response.data.pdf_url;
}
