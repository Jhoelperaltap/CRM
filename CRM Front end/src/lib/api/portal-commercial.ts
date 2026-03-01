import axios from "axios";
import { usePortalAuthStore } from "@/stores/portal-auth-store";
import type {
  CommercialBuilding,
  CommercialBuildingListItem,
  CommercialBuildingFormData,
  CommercialFloor,
  CommercialFloorFormData,
  CommercialUnit,
  CommercialUnitFormData,
  CommercialTenant,
  CommercialTenantFormData,
  CommercialLease,
  CommercialLeaseFormData,
  CommercialPayment,
  CommercialPaymentFormData,
  BuildingDashboardData,
  CommercialDashboardData,
  LeaseRenewalData,
  BuildingPaymentSummary,
} from "@/types/portal-commercial";

/**
 * Portal Commercial Buildings API Client
 *
 * Handles all commercial building related API calls for the client portal.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const commercialApi = axios.create({
  baseURL: `${API_BASE_URL}/portal/commercial`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Required for httpOnly cookies
});

// Handle 401 — redirect to portal login
commercialApi.interceptors.response.use(
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
// Buildings
// ---------------------------------------------------------------------------

export async function getBuildings() {
  const { data } = await commercialApi.get<CommercialBuildingListItem[]>("/buildings/");
  return data;
}

export async function getBuilding(id: string) {
  const { data } = await commercialApi.get<CommercialBuilding>(`/buildings/${id}/`);
  return data;
}

export async function createBuilding(payload: CommercialBuildingFormData) {
  const { data } = await commercialApi.post<CommercialBuilding>("/buildings/", payload);
  return data;
}

export async function updateBuilding(id: string, payload: Partial<CommercialBuildingFormData>) {
  const { data } = await commercialApi.patch<CommercialBuilding>(`/buildings/${id}/`, payload);
  return data;
}

export async function deleteBuilding(id: string) {
  await commercialApi.delete(`/buildings/${id}/`);
}

export async function getBuildingDashboard(buildingId: string) {
  const { data } = await commercialApi.get<BuildingDashboardData>(
    `/buildings/${buildingId}/dashboard/`
  );
  return data;
}

export async function getBuildingPaymentSummary(
  buildingId: string,
  year: number,
  month?: number
): Promise<BuildingPaymentSummary> {
  const params: { year: number; month?: number } = { year };
  if (month) params.month = month;

  const { data } = await commercialApi.get<BuildingPaymentSummary>(
    `/buildings/${buildingId}/payment-summary/`,
    { params }
  );
  return data;
}

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------

export async function getBuildingFloors(buildingId: string) {
  const { data } = await commercialApi.get<CommercialFloor[]>(
    `/buildings/${buildingId}/floors/`
  );
  return data;
}

export async function createFloor(buildingId: string, payload: CommercialFloorFormData) {
  const { data } = await commercialApi.post<CommercialFloor>(
    `/buildings/${buildingId}/floors/`,
    payload
  );
  return data;
}

export async function getFloor(floorId: string) {
  const { data } = await commercialApi.get<CommercialFloor>(`/floors/${floorId}/`);
  return data;
}

export async function updateFloor(floorId: string, payload: Partial<CommercialFloorFormData>) {
  const { data } = await commercialApi.patch<CommercialFloor>(`/floors/${floorId}/`, payload);
  return data;
}

export async function deleteFloor(floorId: string) {
  await commercialApi.delete(`/floors/${floorId}/`);
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export async function getFloorUnits(floorId: string) {
  const { data } = await commercialApi.get<CommercialUnit[]>(`/floors/${floorId}/units/`);
  return data;
}

export async function createUnit(floorId: string, payload: CommercialUnitFormData) {
  const { data } = await commercialApi.post<CommercialUnit>(
    `/floors/${floorId}/units/`,
    payload
  );
  return data;
}

export async function getUnit(unitId: string) {
  const { data } = await commercialApi.get<CommercialUnit>(`/units/${unitId}/`);
  return data;
}

export async function updateUnit(unitId: string, payload: Partial<CommercialUnitFormData>) {
  const { data } = await commercialApi.patch<CommercialUnit>(`/units/${unitId}/`, payload);
  return data;
}

export async function deleteUnit(unitId: string) {
  await commercialApi.delete(`/units/${unitId}/`);
}

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------

export async function getUnitTenant(unitId: string) {
  const { data } = await commercialApi.get<CommercialTenant>(`/units/${unitId}/tenant/`);
  return data;
}

export async function createTenant(unitId: string, payload: CommercialTenantFormData) {
  const { data } = await commercialApi.post<CommercialTenant>(
    `/units/${unitId}/tenant/`,
    payload
  );
  return data;
}

export async function getTenant(tenantId: string) {
  const { data } = await commercialApi.get<CommercialTenant>(`/tenants/${tenantId}/`);
  return data;
}

export async function updateTenant(tenantId: string, payload: Partial<CommercialTenantFormData>) {
  const { data } = await commercialApi.patch<CommercialTenant>(`/tenants/${tenantId}/`, payload);
  return data;
}

export async function deleteTenant(tenantId: string) {
  await commercialApi.delete(`/tenants/${tenantId}/`);
}

// ---------------------------------------------------------------------------
// Leases
// ---------------------------------------------------------------------------

export async function getUnitLeases(unitId: string) {
  const { data } = await commercialApi.get<CommercialLease[]>(`/units/${unitId}/leases/`);
  return data;
}

export async function createLease(unitId: string, payload: CommercialLeaseFormData) {
  // Handle file upload for lease_document
  if (payload.lease_document instanceof File) {
    const formData = new FormData();
    formData.append("tenant", payload.tenant);
    formData.append("start_date", payload.start_date);
    formData.append("end_date", payload.end_date);
    formData.append("monthly_rent", String(payload.monthly_rent));
    if (payload.renewal_increase_percent !== undefined) {
      formData.append("renewal_increase_percent", String(payload.renewal_increase_percent));
    }
    if (payload.status) {
      formData.append("status", payload.status);
    }
    if (payload.notes) {
      formData.append("notes", payload.notes);
    }
    formData.append("lease_document", payload.lease_document);

    const { data } = await commercialApi.post<CommercialLease>(
      `/units/${unitId}/leases/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }

  const { data } = await commercialApi.post<CommercialLease>(
    `/units/${unitId}/leases/`,
    payload
  );
  return data;
}

export async function getLease(leaseId: string) {
  const { data } = await commercialApi.get<CommercialLease>(`/leases/${leaseId}/`);
  return data;
}

export async function updateLease(leaseId: string, payload: Partial<CommercialLeaseFormData>) {
  // Handle file upload for lease_document
  if (payload.lease_document instanceof File) {
    const formData = new FormData();
    if (payload.start_date) formData.append("start_date", payload.start_date);
    if (payload.end_date) formData.append("end_date", payload.end_date);
    if (payload.monthly_rent !== undefined) formData.append("monthly_rent", String(payload.monthly_rent));
    if (payload.renewal_increase_percent !== undefined) {
      formData.append("renewal_increase_percent", String(payload.renewal_increase_percent));
    }
    if (payload.status) formData.append("status", payload.status);
    if (payload.notes !== undefined) formData.append("notes", payload.notes);
    formData.append("lease_document", payload.lease_document);

    const { data } = await commercialApi.patch<CommercialLease>(
      `/leases/${leaseId}/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }

  const { data } = await commercialApi.patch<CommercialLease>(`/leases/${leaseId}/`, payload);
  return data;
}

export async function deleteLease(leaseId: string) {
  await commercialApi.delete(`/leases/${leaseId}/`);
}

export async function renewLease(leaseId: string, payload?: LeaseRenewalData) {
  const { data } = await commercialApi.post<CommercialLease>(
    `/leases/${leaseId}/renew/`,
    payload || {}
  );
  return data;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function getLeasePayments(leaseId: string, year?: number) {
  const params = year ? { year } : {};
  const { data } = await commercialApi.get<CommercialPayment[]>(
    `/leases/${leaseId}/payments/`,
    { params }
  );
  return data;
}

export async function createPayment(leaseId: string, payload: CommercialPaymentFormData) {
  // Handle file upload for receipt
  if (payload.receipt instanceof File) {
    const formData = new FormData();
    formData.append("payment_date", payload.payment_date);
    formData.append("amount", String(payload.amount));
    formData.append("payment_month", String(payload.payment_month));
    formData.append("payment_year", String(payload.payment_year));
    if (payload.notes) {
      formData.append("notes", payload.notes);
    }
    formData.append("receipt", payload.receipt);

    const { data } = await commercialApi.post<CommercialPayment>(
      `/leases/${leaseId}/payments/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }

  const { data } = await commercialApi.post<CommercialPayment>(
    `/leases/${leaseId}/payments/`,
    payload
  );
  return data;
}

export async function getPayment(paymentId: string) {
  const { data } = await commercialApi.get<CommercialPayment>(`/payments/${paymentId}/`);
  return data;
}

export async function updatePayment(paymentId: string, payload: Partial<CommercialPaymentFormData>) {
  // Handle file upload for receipt
  if (payload.receipt instanceof File) {
    const formData = new FormData();
    if (payload.payment_date) formData.append("payment_date", payload.payment_date);
    if (payload.amount !== undefined) formData.append("amount", String(payload.amount));
    if (payload.payment_month !== undefined) formData.append("payment_month", String(payload.payment_month));
    if (payload.payment_year !== undefined) formData.append("payment_year", String(payload.payment_year));
    if (payload.notes !== undefined) formData.append("notes", payload.notes);
    formData.append("receipt", payload.receipt);

    const { data } = await commercialApi.patch<CommercialPayment>(
      `/payments/${paymentId}/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  }

  const { data } = await commercialApi.patch<CommercialPayment>(`/payments/${paymentId}/`, payload);
  return data;
}

export async function deletePayment(paymentId: string) {
  await commercialApi.delete(`/payments/${paymentId}/`);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getCommercialDashboard() {
  const { data } = await commercialApi.get<CommercialDashboardData>("/dashboard/");
  return data;
}
