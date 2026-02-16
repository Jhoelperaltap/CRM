export type VideoProviderType = "zoom" | "google_meet" | "teams" | "webex" | "custom";

export type MeetingStatus = "scheduled" | "started" | "ended" | "canceled";
export type MeetingType = "instant" | "scheduled" | "recurring" | "personal";
export type ParticipantRole = "host" | "co_host" | "participant";
export type JoinStatus = "invited" | "registered" | "joined" | "left" | "no_show";
export type RecordingType =
  | "shared_screen_speaker"
  | "shared_screen_gallery"
  | "speaker_view"
  | "gallery_view"
  | "audio_only"
  | "chat";

export interface VideoProvider {
  id: string;
  name: string;
  provider_type: VideoProviderType;
  provider_type_display: string;
  is_active: boolean;
  is_default: boolean;
  redirect_uri: string;
  webhook_url: string;
  default_duration: number;
  auto_recording: boolean;
  waiting_room_enabled: boolean;
  require_password: boolean;
  mute_on_entry: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserVideoConnection {
  id: string;
  user: string;
  provider: string;
  provider_name: string;
  provider_type: VideoProviderType;
  is_active: boolean;
  provider_user_id: string;
  provider_email: string;
  provider_name_display: string;
  personal_meeting_url: string;
  personal_meeting_id: string;
  token_expires_at: string | null;
  is_token_expired: boolean;
  created_at: string;
}

export interface MeetingParticipant {
  id: string;
  meeting: string;
  user: string | null;
  user_name: string | null;
  contact: string | null;
  contact_name: string | null;
  email: string;
  name: string;
  role: ParticipantRole;
  role_display: string;
  join_status: JoinStatus;
  join_status_display: string;
  joined_at: string | null;
  left_at: string | null;
  duration_in_meeting: number;
  created_at: string;
}

export interface MeetingRecording {
  id: string;
  meeting: string;
  recording_type: RecordingType;
  recording_type_display: string;
  file_name: string;
  file_size: number;
  file_type: string;
  duration: number;
  download_url: string;
  play_url: string;
  share_url: string;
  is_ready: boolean;
  download_expires_at: string | null;
  transcription: string;
  transcription_status: string;
  created_at: string;
}

export interface VideoMeeting {
  id: string;
  provider: string;
  provider_name: string;
  provider_type: VideoProviderType;
  external_id: string;
  meeting_number: string;
  password?: string;
  title: string;
  description?: string;
  status: MeetingStatus;
  status_display: string;
  meeting_type: MeetingType;
  meeting_type_display: string;
  scheduled_start: string;
  scheduled_end: string;
  duration: number;
  actual_start?: string | null;
  actual_end?: string | null;
  timezone: string;
  join_url: string;
  host_url?: string;
  registration_url?: string;
  host: string;
  host_name: string;
  waiting_room?: boolean;
  require_registration?: boolean;
  auto_recording?: string;
  mute_on_entry?: boolean;
  allow_screen_sharing?: boolean;
  appointment?: string | null;
  contact?: string | null;
  contact_name?: string | null;
  case?: string | null;
  case_number?: string | null;
  recording_url?: string;
  recording_duration?: number;
  participants_count: number;
  participant_count?: number;
  participants?: MeetingParticipant[];
  recordings?: MeetingRecording[];
  created_at: string;
  updated_at?: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduled_start: string;
  duration?: number;
  timezone?: string;
  provider_id?: string;
  waiting_room?: boolean;
  auto_recording?: "none" | "local" | "cloud";
  mute_on_entry?: boolean;
  participant_emails?: string[];
  appointment_id?: string;
  contact_id?: string;
  case_id?: string;
}

export interface VideoMeetingSettings {
  id: string;
  default_provider: string | null;
  default_provider_name: string | null;
  default_duration: number;
  default_waiting_room: boolean;
  default_mute_on_entry: boolean;
  default_auto_recording: "none" | "local" | "cloud";
  auto_add_to_appointments: boolean;
  send_calendar_invites: boolean;
  send_reminder_emails: boolean;
  reminder_minutes_before: number;
  recording_retention_days: number;
  auto_delete_recordings: boolean;
  updated_at: string;
}

export interface MeetingStats {
  total_meetings: number;
  upcoming: number;
  this_month: number;
  completed_this_month: number;
  total_participants: number;
}
