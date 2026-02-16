import api from "@/lib/api";
import type {
  VideoProvider,
  UserVideoConnection,
  VideoMeeting,
  MeetingParticipant,
  MeetingRecording,
  VideoMeetingSettings,
  CreateMeetingRequest,
  MeetingStats,
} from "@/types/video-meetings";

// Video Providers
export const videoProviderApi = {
  list: async (): Promise<VideoProvider[]> => {
    const response = await api.get<VideoProvider[] | { results: VideoProvider[] }>("/video-meetings/providers/");
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<VideoProvider> => {
    const response = await api.get<VideoProvider>(
      `/video-meetings/providers/${id}/`
    );
    return response.data;
  },

  create: async (data: Partial<VideoProvider>): Promise<VideoProvider> => {
    const response = await api.post<VideoProvider>(
      "/video-meetings/providers/",
      data
    );
    return response.data;
  },

  update: async (id: string, data: Partial<VideoProvider>): Promise<VideoProvider> => {
    const response = await api.patch<VideoProvider>(
      `/video-meetings/providers/${id}/`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/video-meetings/providers/${id}/`);
  },

  setDefault: async (id: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      `/video-meetings/providers/${id}/set_default/`
    );
    return response.data;
  },

  getOAuthUrl: async (id: string): Promise<{ oauth_url: string }> => {
    const response = await api.get<{ oauth_url: string }>(
      `/video-meetings/providers/${id}/oauth_url/`
    );
    return response.data;
  },
};

// User Video Connections
export const videoConnectionApi = {
  list: async (): Promise<UserVideoConnection[]> => {
    const response = await api.get<UserVideoConnection[] | { results: UserVideoConnection[] }>(
      "/video-meetings/connections/"
    );
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<UserVideoConnection> => {
    const response = await api.get<UserVideoConnection>(
      `/video-meetings/connections/${id}/`
    );
    return response.data;
  },

  disconnect: async (id: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      `/video-meetings/connections/${id}/disconnect/`
    );
    return response.data;
  },

  refreshToken: async (id: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      `/video-meetings/connections/${id}/refresh_token/`
    );
    return response.data;
  },
};

// Video Meetings
export const videoMeetingApi = {
  list: async (params?: Record<string, string>): Promise<VideoMeeting[]> => {
    const response = await api.get<VideoMeeting[] | { results: VideoMeeting[] }>("/video-meetings/meetings/", {
      params,
    });
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<VideoMeeting> => {
    const response = await api.get<VideoMeeting>(
      `/video-meetings/meetings/${id}/`
    );
    return response.data;
  },

  create: async (data: CreateMeetingRequest): Promise<VideoMeeting> => {
    const response = await api.post<VideoMeeting>(
      "/video-meetings/meetings/",
      data
    );
    return response.data;
  },

  update: async (id: string, data: Partial<VideoMeeting>): Promise<VideoMeeting> => {
    const response = await api.patch<VideoMeeting>(
      `/video-meetings/meetings/${id}/`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/video-meetings/meetings/${id}/`);
  },

  start: async (id: string): Promise<VideoMeeting> => {
    const response = await api.post<VideoMeeting>(
      `/video-meetings/meetings/${id}/start/`
    );
    return response.data;
  },

  end: async (id: string): Promise<VideoMeeting> => {
    const response = await api.post<VideoMeeting>(
      `/video-meetings/meetings/${id}/end/`
    );
    return response.data;
  },

  cancel: async (id: string): Promise<VideoMeeting> => {
    const response = await api.post<VideoMeeting>(
      `/video-meetings/meetings/${id}/cancel/`
    );
    return response.data;
  },

  addParticipant: async (
    id: string,
    data: { email: string; name?: string; role?: string }
  ): Promise<MeetingParticipant> => {
    const response = await api.post<MeetingParticipant>(
      `/video-meetings/meetings/${id}/add_participant/`,
      data
    );
    return response.data;
  },

  upcoming: async (): Promise<VideoMeeting[]> => {
    const response = await api.get<VideoMeeting[]>(
      "/video-meetings/meetings/upcoming/"
    );
    return response.data;
  },

  stats: async (): Promise<MeetingStats> => {
    const response = await api.get<MeetingStats>(
      "/video-meetings/meetings/stats/"
    );
    return response.data;
  },
};

// Meeting Participants
export const meetingParticipantApi = {
  list: async (meetingId?: string): Promise<MeetingParticipant[]> => {
    const params = meetingId ? { meeting: meetingId } : {};
    const response = await api.get<MeetingParticipant[] | { results: MeetingParticipant[] }>(
      "/video-meetings/participants/",
      { params }
    );
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  markJoined: async (id: string): Promise<MeetingParticipant> => {
    const response = await api.post<MeetingParticipant>(
      `/video-meetings/participants/${id}/mark_joined/`
    );
    return response.data;
  },
};

// Meeting Recordings
export const meetingRecordingApi = {
  list: async (meetingId?: string): Promise<MeetingRecording[]> => {
    const params = meetingId ? { meeting: meetingId } : {};
    const response = await api.get<MeetingRecording[] | { results: MeetingRecording[] }>(
      "/video-meetings/recordings/",
      { params }
    );
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  get: async (id: string): Promise<MeetingRecording> => {
    const response = await api.get<MeetingRecording>(
      `/video-meetings/recordings/${id}/`
    );
    return response.data;
  },

  transcribe: async (id: string): Promise<{ status: string }> => {
    const response = await api.post<{ status: string }>(
      `/video-meetings/recordings/${id}/transcribe/`
    );
    return response.data;
  },
};

// Video Meeting Settings
export const videoMeetingSettingsApi = {
  get: async (): Promise<VideoMeetingSettings> => {
    const response = await api.get<VideoMeetingSettings>(
      "/video-meetings/settings/"
    );
    return response.data;
  },

  update: async (data: Partial<VideoMeetingSettings>): Promise<VideoMeetingSettings> => {
    const response = await api.patch<VideoMeetingSettings>(
      "/video-meetings/settings/",
      data
    );
    return response.data;
  },
};
