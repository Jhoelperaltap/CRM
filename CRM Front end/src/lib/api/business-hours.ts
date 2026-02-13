import api from "@/lib/api";
import type {
  BusinessHoursListItem,
  BusinessHoursDetail,
} from "@/types/business-hours";

export async function getBusinessHoursList(
  params?: Record<string, string>
): Promise<BusinessHoursListItem[]> {
  const { data } = await api.get<BusinessHoursListItem[]>(
    "/settings/business-hours/",
    { params }
  );
  return data;
}

export async function getBusinessHours(id: string): Promise<BusinessHoursDetail> {
  const { data } = await api.get<BusinessHoursDetail>(
    `/settings/business-hours/${id}/`
  );
  return data;
}

export async function createBusinessHours(
  payload: Record<string, unknown>
): Promise<BusinessHoursDetail> {
  const { data } = await api.post<BusinessHoursDetail>(
    "/settings/business-hours/",
    payload
  );
  return data;
}

export async function updateBusinessHours(
  id: string,
  payload: Record<string, unknown>
): Promise<BusinessHoursDetail> {
  const { data } = await api.patch<BusinessHoursDetail>(
    `/settings/business-hours/${id}/`,
    payload
  );
  return data;
}

export async function deleteBusinessHours(id: string): Promise<void> {
  await api.delete(`/settings/business-hours/${id}/`);
}
