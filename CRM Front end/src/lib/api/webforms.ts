/**
 * API client for Webforms
 */

import api from "../api";
import type {
  WebformListItem,
  WebformDetail,
  WebformCreatePayload,
} from "@/types/webforms";
import type { PaginatedResponse } from "@/types/api";

export async function getWebforms(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<WebformListItem>>(
    "/settings/webforms/",
    { params }
  );
  return data;
}

export async function getWebform(id: string) {
  const { data } = await api.get<WebformDetail>(`/settings/webforms/${id}/`);
  return data;
}

export async function createWebform(payload: WebformCreatePayload) {
  const { data } = await api.post<WebformDetail>("/settings/webforms/", payload);
  return data;
}

export async function updateWebform(
  id: string,
  payload: Partial<WebformCreatePayload>
) {
  const { data } = await api.patch<WebformDetail>(
    `/settings/webforms/${id}/`,
    payload
  );
  return data;
}

export async function deleteWebform(id: string) {
  await api.delete(`/settings/webforms/${id}/`);
}

export async function generateWebformHtml(id: string) {
  const { data } = await api.get<{ html: string }>(
    `/settings/webforms/${id}/generate-html/`
  );
  return data;
}
