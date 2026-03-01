/**
 * Portal Administration API Client
 *
 * All endpoints under /api/v1/portal-admin/
 * Only accessible by Admin role users.
 */

import { api } from "@/lib/api";
import type {
  PortalModulePreset,
  PortalClient,
  PortalClientDetail,
  PortalClientConfig,
  PortalSession,
  PortalAdminLog,
  PortalAdminStats,
  ImpersonationStartResponse,
  PortalImpersonationToken,
  UpdateClientConfigInput,
  PresetInput,
} from "@/types/portal-admin";

const BASE_URL = "/portal-admin";

// ---------------------------------------------------------------------------
// Module Presets
// ---------------------------------------------------------------------------

export async function getPresets(): Promise<PortalModulePreset[]> {
  const { data } = await api.get<PortalModulePreset[]>(`${BASE_URL}/presets/`);
  return data;
}

export async function getPreset(id: string): Promise<PortalModulePreset> {
  const { data } = await api.get<PortalModulePreset>(`${BASE_URL}/presets/${id}/`);
  return data;
}

export async function createPreset(payload: PresetInput): Promise<PortalModulePreset> {
  const { data } = await api.post<PortalModulePreset>(`${BASE_URL}/presets/`, payload);
  return data;
}

export async function updatePreset(
  id: string,
  payload: Partial<PresetInput>
): Promise<PortalModulePreset> {
  const { data } = await api.patch<PortalModulePreset>(`${BASE_URL}/presets/${id}/`, payload);
  return data;
}

export async function deletePreset(id: string): Promise<void> {
  await api.delete(`${BASE_URL}/presets/${id}/`);
}

// ---------------------------------------------------------------------------
// Portal Clients
// ---------------------------------------------------------------------------

interface GetClientsParams {
  search?: string;
  has_access?: boolean;
  is_active?: boolean;
  is_online?: boolean;
  page?: number;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export async function getPortalClients(
  params?: GetClientsParams
): Promise<PaginatedResponse<PortalClient>> {
  const { data } = await api.get<PaginatedResponse<PortalClient>>(`${BASE_URL}/clients/`, {
    params,
  });
  return data;
}

export async function getPortalClient(contactId: string): Promise<PortalClientDetail> {
  const { data } = await api.get<PortalClientDetail>(`${BASE_URL}/clients/${contactId}/`);
  return data;
}

// Get client config
export async function getClientConfig(contactId: string): Promise<PortalClientConfig> {
  const { data } = await api.get<PortalClientConfig>(`${BASE_URL}/clients/${contactId}/config/`);
  return data;
}

// Update client config
export async function updateClientConfig(
  contactId: string,
  payload: UpdateClientConfigInput
): Promise<PortalClientConfig> {
  const { data } = await api.patch<PortalClientConfig>(
    `${BASE_URL}/clients/${contactId}/config/`,
    payload
  );
  return data;
}

// Apply preset to client
export async function applyPresetToClient(
  contactId: string,
  presetId: string
): Promise<PortalClientConfig> {
  const { data } = await api.post<PortalClientConfig>(
    `${BASE_URL}/clients/${contactId}/apply-preset/`,
    { preset_id: presetId }
  );
  return data;
}

// Toggle portal access
export async function togglePortalAccess(
  contactId: string,
  isActive: boolean
): Promise<{ is_portal_active: boolean }> {
  const { data } = await api.post<{ is_portal_active: boolean }>(
    `${BASE_URL}/clients/${contactId}/toggle-access/`,
    { is_active: isActive }
  );
  return data;
}

// Get client sessions
export async function getClientSessions(contactId: string): Promise<PortalSession[]> {
  const { data } = await api.get<PortalSession[]>(`${BASE_URL}/clients/${contactId}/sessions/`);
  return data;
}

// Force logout all sessions
export async function forceLogoutClient(
  contactId: string
): Promise<{ terminated_count: number }> {
  const { data } = await api.post<{ terminated_count: number }>(
    `${BASE_URL}/clients/${contactId}/force-logout/`
  );
  return data;
}

// Reset client password
export async function resetClientPassword(
  contactId: string
): Promise<{ email_sent: boolean; message: string }> {
  const { data } = await api.post<{ email_sent: boolean; message: string }>(
    `${BASE_URL}/clients/${contactId}/reset-password/`
  );
  return data;
}

// Start impersonation
export async function startImpersonation(
  contactId: string
): Promise<ImpersonationStartResponse> {
  const { data } = await api.post<ImpersonationStartResponse>(
    `${BASE_URL}/clients/${contactId}/impersonate/`
  );
  return data;
}

// Get client admin logs
export async function getClientLogs(contactId: string): Promise<PortalAdminLog[]> {
  const { data } = await api.get<PortalAdminLog[]>(`${BASE_URL}/clients/${contactId}/logs/`);
  return data;
}

// ---------------------------------------------------------------------------
// Impersonation
// ---------------------------------------------------------------------------

// Get current impersonation status
export async function getImpersonationStatus(): Promise<PortalImpersonationToken | null> {
  try {
    const { data } = await api.get<PortalImpersonationToken>(`${BASE_URL}/impersonate/`);
    return data;
  } catch {
    return null;
  }
}

// End impersonation
export async function endImpersonation(): Promise<void> {
  await api.delete(`${BASE_URL}/impersonate/`);
}

// ---------------------------------------------------------------------------
// Audit Logs
// ---------------------------------------------------------------------------

interface GetAdminLogsParams {
  action?: string;
  admin?: string;
  contact?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

interface AdminLogsResponse {
  results: PortalAdminLog[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  actions: { value: string; label: string }[];
}

export async function getAdminLogs(params?: GetAdminLogsParams): Promise<AdminLogsResponse> {
  const { data } = await api.get<AdminLogsResponse>(`${BASE_URL}/logs/`, { params });
  return data;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export async function getPortalAdminStats(): Promise<PortalAdminStats> {
  const { data } = await api.get<PortalAdminStats>(`${BASE_URL}/stats/`);
  return data;
}
