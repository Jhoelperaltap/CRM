import axios from "axios";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type {
  RentalProperty,
  RentalPropertyFormData,
  RentalTransaction,
  RentalTransactionFormData,
  RentalExpenseCategory,
  RentalMonthlySummary,
  RentalDashboardData,
  TransactionFilters,
} from "@/types/portal-rental";

/**
 * Portal Rental Properties API Client
 *
 * Handles all rental property related API calls for the client portal.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const rentalApi = axios.create({
  baseURL: `${API_BASE_URL}/portal/rentals`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Required for httpOnly cookies
});

// Handle 401 — redirect to portal login
rentalApi.interceptors.response.use(
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

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

export async function getRentalProperties(year?: number) {
  const params = year ? { year } : {};
  const { data } = await rentalApi.get<RentalProperty[]>("/properties/", { params });
  return data;
}

export async function getRentalProperty(id: string) {
  const { data } = await rentalApi.get<RentalProperty>(`/properties/${id}/`);
  return data;
}

export async function createRentalProperty(payload: RentalPropertyFormData) {
  const { data } = await rentalApi.post<RentalProperty>("/properties/", payload);
  return data;
}

export async function updateRentalProperty(id: string, payload: Partial<RentalPropertyFormData>) {
  const { data } = await rentalApi.patch<RentalProperty>(`/properties/${id}/`, payload);
  return data;
}

export async function deleteRentalProperty(id: string) {
  await rentalApi.delete(`/properties/${id}/`);
}

export async function getPropertySummary(propertyId: string, year: number) {
  const { data } = await rentalApi.get<RentalMonthlySummary>(
    `/properties/${propertyId}/summary/`,
    { params: { year } }
  );
  return data;
}

export function getPropertyExportUrl(propertyId: string, year: number) {
  return `${rentalApi.defaults.baseURL}/properties/${propertyId}/export/?year=${year}`;
}

export async function exportPropertyCSV(propertyId: string, year: number) {
  const response = await rentalApi.get(`/properties/${propertyId}/export/`, {
    params: { year },
    responseType: "blob",
  });
  return response.data as Blob;
}

export function getPropertyPdfUrl(propertyId: string, year: number) {
  return `${rentalApi.defaults.baseURL}/properties/${propertyId}/pdf/?year=${year}`;
}

export async function exportPropertyPDF(propertyId: string, year: number) {
  const response = await rentalApi.get(`/properties/${propertyId}/pdf/`, {
    params: { year },
    responseType: "blob",
  });
  return response.data as Blob;
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

export async function getTransactions(filters?: TransactionFilters) {
  const { data } = await rentalApi.get<RentalTransaction[]>("/transactions/", {
    params: filters,
  });
  return data;
}

export async function getPropertyTransactions(
  propertyId: string,
  params?: { year?: number; month?: number }
) {
  const { data } = await rentalApi.get<RentalTransaction[]>("/transactions/", {
    params: { property: propertyId, ...params },
  });
  return data;
}

export async function getTransaction(id: string) {
  const { data } = await rentalApi.get<RentalTransaction>(`/transactions/${id}/`);
  return data;
}

export async function createTransaction(payload: RentalTransactionFormData) {
  // If there's a receipt file, use FormData
  if (payload.receipt) {
    const formData = new FormData();
    formData.append("property", payload.property);
    formData.append("transaction_type", payload.transaction_type);
    formData.append("transaction_date", payload.transaction_date);
    formData.append("amount", String(payload.amount));
    if (payload.category) {
      formData.append("category", payload.category);
    }
    if (payload.description) {
      formData.append("description", payload.description);
    }
    formData.append("receipt", payload.receipt);

    const { data } = await rentalApi.post<RentalTransaction>("/transactions/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }

  // Otherwise, use regular JSON
  const { data } = await rentalApi.post<RentalTransaction>("/transactions/", payload);
  return data;
}

export async function updateTransaction(id: string, payload: Partial<RentalTransactionFormData>) {
  const { data } = await rentalApi.patch<RentalTransaction>(`/transactions/${id}/`, payload);
  return data;
}

export async function deleteTransaction(id: string) {
  await rentalApi.delete(`/transactions/${id}/`);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getExpenseCategories() {
  const { data } = await rentalApi.get<RentalExpenseCategory[]>("/categories/");
  return data;
}

export async function createExpenseCategory(payload: { name: string; slug: string }) {
  const { data } = await rentalApi.post<RentalExpenseCategory>("/categories/", payload);
  return data;
}

export async function deleteExpenseCategory(id: string) {
  await rentalApi.delete(`/categories/${id}/`);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getRentalDashboard(year?: number) {
  const params = year ? { year } : {};
  const { data } = await rentalApi.get<RentalDashboardData>("/dashboard/", { params });
  return data;
}
