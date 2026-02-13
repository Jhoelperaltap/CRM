import api from "@/lib/api";
import { PaginatedResponse } from "@/types/api";
import { Notification, NotificationPreference } from "@/types/notifications";

export async function getNotifications(
  params?: Record<string, string>
): Promise<PaginatedResponse<Notification>> {
  const { data } = await api.get("/notifications/", { params });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get("/notifications/unread-count/");
  return data.count;
}

export async function markRead(id: string): Promise<Notification> {
  const { data } = await api.post(`/notifications/${id}/mark-read/`);
  return data;
}

export async function markAllRead(): Promise<{ updated: number }> {
  const { data } = await api.post("/notifications/mark-all-read/");
  return data;
}

export async function getNotificationPreferences(): Promise<
  NotificationPreference[]
> {
  const { data } = await api.get("/notifications/preferences/bulk/");
  return data;
}

export async function updateNotificationPreferences(
  prefs: Partial<NotificationPreference>[]
): Promise<NotificationPreference[]> {
  const { data } = await api.put("/notifications/preferences/bulk/", prefs);
  return data;
}
