export interface Notification {
  id: string;
  recipient: string;
  recipient_name: string | null;
  notification_type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  related_object_type: string;
  related_object_id: string | null;
  action_url: string;
  is_read: boolean;
  email_sent: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user: string;
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
}
