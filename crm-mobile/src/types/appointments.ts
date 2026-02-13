export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface PortalAppointment {
  id: string;
  title: string;
  description?: string;
  // API uses start_datetime/end_datetime
  start_datetime: string;
  end_datetime: string;
  // Legacy fields for compatibility
  start_time?: string;
  end_time?: string;
  location: string;
  is_virtual?: boolean;
  meeting_link?: string | null;
  status: AppointmentStatus;
  case?: {
    id: string;
    case_number: string;
    title: string;
  } | null;
  // API returns assigned_to_name as string
  assigned_to?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
  };
  assigned_to_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface PortalAppointmentListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: PortalAppointment[];
}

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  SCHEDULED: 'Scheduled',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
};
