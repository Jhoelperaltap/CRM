import api from "@/lib/api";

/* ---------- Types ---------- */

export interface AppointmentPageListItem {
  id: string;
  name: string;
  page_type: "meet_me" | "auto_assigned" | "group_event";
  slug: string;
  event_duration: number;
  event_activity_type: string;
  meet_with: string | null;
  meet_with_name: string;
  assigned_to: string | null;
  assigned_to_name: string;
  created_by: string | null;
  created_by_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppointmentPageDetail extends AppointmentPageListItem {
  introduction: string;
  css_url: string;
  meet_with_detail: { id: string; full_name: string; email: string } | null;
  assigned_to_detail: { id: string; full_name: string; email: string } | null;
  created_by_detail: { id: string; full_name: string; email: string } | null;
  allow_known_records: boolean;
  email_otp_validation: boolean;
  track_utm: boolean;
  notification_config: Record<string, unknown>;
  schedule_config: Record<string, unknown>;
  invitee_questions: { label: string; type: string; required: boolean }[];
  event: string | null;
}

export interface AppointmentPagePayload {
  name: string;
  page_type: string;
  introduction?: string;
  slug: string;
  css_url?: string;
  event_duration?: number;
  event_activity_type?: string;
  meet_with?: string | null;
  assigned_to?: string | null;
  allow_known_records?: boolean;
  email_otp_validation?: boolean;
  is_active?: boolean;
  track_utm?: boolean;
  notification_config?: Record<string, unknown>;
  schedule_config?: Record<string, unknown>;
  invitee_questions?: { label: string; type: string; required: boolean }[];
  event?: string | null;
}

/* ---------- API Functions ---------- */

export async function getAppointmentPages(
  params?: Record<string, string>
): Promise<AppointmentPageListItem[]> {
  const { data } = await api.get<AppointmentPageListItem[]>(
    "/appointment-pages/",
    { params }
  );
  return data;
}

export async function getAppointmentPage(
  id: string
): Promise<AppointmentPageDetail> {
  const { data } = await api.get<AppointmentPageDetail>(
    `/appointment-pages/${id}/`
  );
  return data;
}

export async function createAppointmentPage(
  payload: AppointmentPagePayload
): Promise<AppointmentPageDetail> {
  const { data } = await api.post<AppointmentPageDetail>(
    "/appointment-pages/",
    payload
  );
  return data;
}

export async function updateAppointmentPage(
  id: string,
  payload: Partial<AppointmentPagePayload>
): Promise<AppointmentPageDetail> {
  const { data } = await api.patch<AppointmentPageDetail>(
    `/appointment-pages/${id}/`,
    payload
  );
  return data;
}

export async function deleteAppointmentPage(id: string): Promise<void> {
  await api.delete(`/appointment-pages/${id}/`);
}
