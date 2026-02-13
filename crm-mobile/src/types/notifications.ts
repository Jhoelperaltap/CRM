export type NotificationType =
  | 'new_message'
  | 'case_update'
  | 'document_status'
  | 'appointment_reminder'
  | 'system';

export interface PortalNotification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  related_message_id: string | null;
  related_case_id: string | null;
  related_case_number: string | null;
  related_appointment_id: string | null;
  created_at: string;
}

export interface PortalNotificationListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PortalNotification[];
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  new_message: 'New Message',
  case_update: 'Case Update',
  document_status: 'Document Status',
  appointment_reminder: 'Appointment',
  system: 'System',
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  new_message: 'message',
  case_update: 'folder',
  document_status: 'file-document',
  appointment_reminder: 'calendar',
  system: 'bell',
};
