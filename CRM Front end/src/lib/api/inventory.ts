import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type {
  TaxRateItem,
  TermsAndConditionsItem,
  VendorListItem,
  ProductListItem,
  ServiceListItem,
  PriceBookListItem,
  InvoiceListItem,
  SalesOrderListItem,
  PurchaseOrderListItem,
  PaymentListItem,
  WorkOrderListItem,
  AssetListItem,
  StockTransactionItem,
} from "@/types";

const BASE = "/inventory";

// --- Products ---

export async function getProducts(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ProductListItem>>(
    `${BASE}/products/`,
    { params }
  );
  return data;
}

export async function getProduct(id: string) {
  const { data } = await api.get(`${BASE}/products/${id}/`);
  return data;
}

export async function createProduct(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/products/`, payload);
  return data;
}

export async function updateProduct(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/products/${id}/`, payload);
  return data;
}

export async function deleteProduct(id: string) {
  await api.delete(`${BASE}/products/${id}/`);
}

// --- Services ---

export async function getServices(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<ServiceListItem>>(
    `${BASE}/services/`,
    { params }
  );
  return data;
}

export async function getService(id: string) {
  const { data } = await api.get(`${BASE}/services/${id}/`);
  return data;
}

export async function createService(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/services/`, payload);
  return data;
}

export async function updateService(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/services/${id}/`, payload);
  return data;
}

export async function deleteService(id: string) {
  await api.delete(`${BASE}/services/${id}/`);
}

// --- Price Books ---

export async function getPriceBooks(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<PriceBookListItem>>(
    `${BASE}/price-books/`,
    { params }
  );
  return data;
}

export async function getPriceBook(id: string) {
  const { data } = await api.get(`${BASE}/price-books/${id}/`);
  return data;
}

export async function createPriceBook(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/price-books/`, payload);
  return data;
}

export async function updatePriceBook(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/price-books/${id}/`, payload);
  return data;
}

export async function deletePriceBook(id: string) {
  await api.delete(`${BASE}/price-books/${id}/`);
}

// --- Vendors ---

export async function getVendors(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<VendorListItem>>(
    `${BASE}/vendors/`,
    { params }
  );
  return data;
}

export async function getVendor(id: string) {
  const { data } = await api.get(`${BASE}/vendors/${id}/`);
  return data;
}

export async function createVendor(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/vendors/`, payload);
  return data;
}

export async function updateVendor(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/vendors/${id}/`, payload);
  return data;
}

export async function deleteVendor(id: string) {
  await api.delete(`${BASE}/vendors/${id}/`);
}

// --- Invoices ---

export async function getInvoices(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<InvoiceListItem>>(
    `${BASE}/invoices/`,
    { params }
  );
  return data;
}

export async function getInvoice(id: string) {
  const { data } = await api.get(`${BASE}/invoices/${id}/`);
  return data;
}

export async function createInvoice(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/invoices/`, payload);
  return data;
}

export async function updateInvoice(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/invoices/${id}/`, payload);
  return data;
}

export async function deleteInvoice(id: string) {
  await api.delete(`${BASE}/invoices/${id}/`);
}

// --- Sales Orders ---

export async function getSalesOrders(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<SalesOrderListItem>>(
    `${BASE}/sales-orders/`,
    { params }
  );
  return data;
}

export async function getSalesOrder(id: string) {
  const { data } = await api.get(`${BASE}/sales-orders/${id}/`);
  return data;
}

export async function createSalesOrder(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/sales-orders/`, payload);
  return data;
}

export async function updateSalesOrder(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/sales-orders/${id}/`, payload);
  return data;
}

export async function deleteSalesOrder(id: string) {
  await api.delete(`${BASE}/sales-orders/${id}/`);
}

// --- Purchase Orders ---

export async function getPurchaseOrders(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<PurchaseOrderListItem>>(
    `${BASE}/purchase-orders/`,
    { params }
  );
  return data;
}

export async function getPurchaseOrder(id: string) {
  const { data } = await api.get(`${BASE}/purchase-orders/${id}/`);
  return data;
}

export async function createPurchaseOrder(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/purchase-orders/`, payload);
  return data;
}

export async function updatePurchaseOrder(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/purchase-orders/${id}/`, payload);
  return data;
}

export async function deletePurchaseOrder(id: string) {
  await api.delete(`${BASE}/purchase-orders/${id}/`);
}

// --- Payments ---

export async function getPayments(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<PaymentListItem>>(
    `${BASE}/payments/`,
    { params }
  );
  return data;
}

export async function getPayment(id: string) {
  const { data } = await api.get(`${BASE}/payments/${id}/`);
  return data;
}

export async function createPayment(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/payments/`, payload);
  return data;
}

export async function updatePayment(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/payments/${id}/`, payload);
  return data;
}

export async function deletePayment(id: string) {
  await api.delete(`${BASE}/payments/${id}/`);
}

// --- Work Orders ---

export async function getWorkOrders(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<WorkOrderListItem>>(
    `${BASE}/work-orders/`,
    { params }
  );
  return data;
}

export async function getWorkOrder(id: string) {
  const { data } = await api.get(`${BASE}/work-orders/${id}/`);
  return data;
}

export async function createWorkOrder(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/work-orders/`, payload);
  return data;
}

export async function updateWorkOrder(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/work-orders/${id}/`, payload);
  return data;
}

export async function deleteWorkOrder(id: string) {
  await api.delete(`${BASE}/work-orders/${id}/`);
}

// --- Assets ---

export async function getAssets(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<AssetListItem>>(
    `${BASE}/assets/`,
    { params }
  );
  return data;
}

export async function getAsset(id: string) {
  const { data } = await api.get(`${BASE}/assets/${id}/`);
  return data;
}

export async function createAsset(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/assets/`, payload);
  return data;
}

export async function updateAsset(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/assets/${id}/`, payload);
  return data;
}

export async function deleteAsset(id: string) {
  await api.delete(`${BASE}/assets/${id}/`);
}

// --- Tax Rates ---

export async function getTaxRates(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<TaxRateItem>>(
    `${BASE}/tax-rates/`,
    { params }
  );
  return data;
}

export async function createTaxRate(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/tax-rates/`, payload);
  return data;
}

export async function updateTaxRate(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/tax-rates/${id}/`, payload);
  return data;
}

export async function deleteTaxRate(id: string) {
  await api.delete(`${BASE}/tax-rates/${id}/`);
}

// --- Terms and Conditions ---

export async function getTermsAndConditions(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<TermsAndConditionsItem>>(
    `${BASE}/terms-conditions/`,
    { params }
  );
  return data;
}

export async function createTermsAndConditions(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/terms-conditions/`, payload);
  return data;
}

export async function updateTermsAndConditions(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch(`${BASE}/terms-conditions/${id}/`, payload);
  return data;
}

export async function deleteTermsAndConditions(id: string) {
  await api.delete(`${BASE}/terms-conditions/${id}/`);
}

// --- Stock Transactions ---

export async function getStockTransactions(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<StockTransactionItem>>(
    `${BASE}/stock-transactions/`,
    { params }
  );
  return data;
}

export async function createStockTransaction(payload: Record<string, unknown>) {
  const { data } = await api.post(`${BASE}/stock-transactions/`, payload);
  return data;
}
