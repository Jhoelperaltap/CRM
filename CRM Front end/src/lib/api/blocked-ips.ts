import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import {
  BlockedIPCreatePayload,
  BlockedIPDetail,
  BlockedIPListItem,
  BlockedIPLog,
} from "@/types/blocked-ip";

export async function getBlockedIPs(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<BlockedIPListItem>>(
    "/settings/blocked-ips/",
    { params }
  );
  return data;
}

export async function getBlockedIP(id: string) {
  const { data } = await api.get<BlockedIPDetail>(`/settings/blocked-ips/${id}/`);
  return data;
}

export async function createBlockedIP(payload: BlockedIPCreatePayload) {
  const { data } = await api.post<BlockedIPListItem>("/settings/blocked-ips/", payload);
  return data;
}

export async function updateBlockedIP(id: string, payload: Partial<BlockedIPCreatePayload>) {
  const { data } = await api.patch<BlockedIPListItem>(`/settings/blocked-ips/${id}/`, payload);
  return data;
}

export async function deleteBlockedIP(id: string) {
  await api.delete(`/settings/blocked-ips/${id}/`);
}

export async function getBlockedIPLogs(id: string) {
  const { data } = await api.get<BlockedIPLog[]>(`/settings/blocked-ips/${id}/logs/`);
  return data;
}

export async function clearBlockedIPLogs(id: string) {
  const { data } = await api.post<{ detail: string }>(`/settings/blocked-ips/${id}/clear-logs/`);
  return data;
}

export async function getAllBlockedIPLogs(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<BlockedIPLog>>(
    "/settings/blocked-ip-logs/",
    { params }
  );
  return data;
}
