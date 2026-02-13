import api from "@/lib/api";
import type { PaginatedResponse } from "@/types/api";
import type { Appointment, AppointmentListItem, CalendarAppointment } from "@/types";

export async function getAppointments(params?: Record<string, string>) {
  const { data } = await api.get<PaginatedResponse<AppointmentListItem>>("/appointments/", { params });
  return data;
}

export async function getAppointment(id: string) {
  const { data } = await api.get<Appointment>(`/appointments/${id}/`);
  return data;
}

export async function createAppointment(payload: Record<string, unknown>) {
  const { data } = await api.post<Appointment>("/appointments/", payload);
  return data;
}

export async function updateAppointment(id: string, payload: Record<string, unknown>) {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/`, payload);
  return data;
}

export async function deleteAppointment(id: string) {
  await api.delete(`/appointments/${id}/`);
}

export async function getCalendarAppointments(params: {
  start_date: string;
  end_date: string;
  assigned_to?: string;
}) {
  const { data } = await api.get<CalendarAppointment[]>("/appointments/calendar/", { params });
  return data;
}

export async function quickCreateAppointment(payload: {
  title: string;
  contact: string;
  start_datetime: string;
  end_datetime: string;
  assigned_to?: string;
  location?: string;
  color?: string;
}) {
  const { data } = await api.post<Appointment>("/appointments/quick-create/", payload);
  return data;
}
