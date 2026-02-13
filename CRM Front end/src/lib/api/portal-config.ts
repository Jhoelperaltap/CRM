import api from "@/lib/api";
import type { PortalConfiguration } from "@/types/portal-config";

export async function getPortalConfigurations(): Promise<PortalConfiguration[]> {
  const { data } = await api.get<PortalConfiguration[]>(
    "/settings/portal-config/"
  );
  return data;
}

export async function getActivePortalConfig(): Promise<PortalConfiguration> {
  const { data } = await api.get<PortalConfiguration>(
    "/settings/portal-config/active/"
  );
  return data;
}

export async function getPortalConfig(id: string): Promise<PortalConfiguration> {
  const { data } = await api.get<PortalConfiguration>(
    `/settings/portal-config/${id}/`
  );
  return data;
}

export async function createPortalConfig(
  payload: Record<string, unknown>
): Promise<PortalConfiguration> {
  const { data } = await api.post<PortalConfiguration>(
    "/settings/portal-config/",
    payload
  );
  return data;
}

export async function updatePortalConfig(
  id: string,
  payload: Record<string, unknown>
): Promise<PortalConfiguration> {
  const { data } = await api.patch<PortalConfiguration>(
    `/settings/portal-config/${id}/`,
    payload
  );
  return data;
}

export async function deletePortalConfig(id: string): Promise<void> {
  await api.delete(`/settings/portal-config/${id}/`);
}

export async function getDefaultMenuItems(): Promise<
  { module_name: string; label: string; is_enabled: boolean }[]
> {
  const { data } = await api.get<
    { module_name: string; label: string; is_enabled: boolean }[]
  >("/settings/portal-config/default-menu-items/");
  return data;
}

export async function getDefaultFieldConfigs(): Promise<{
  contacts: { field_name: string; field_label: string; permission: string; is_mandatory: boolean }[];
  organizations: { field_name: string; field_label: string; permission: string; is_mandatory: boolean }[];
}> {
  const { data } = await api.get("/settings/portal-config/default-field-configs/");
  return data;
}
