from django.contrib import admin

from .models import (
    MeetingParticipant,
    MeetingRecording,
    UserVideoConnection,
    VideoMeeting,
    VideoMeetingSettings,
    VideoProvider,
)


@admin.register(VideoProvider)
class VideoProviderAdmin(admin.ModelAdmin):
    list_display = ["name", "provider_type", "is_active", "is_default", "created_at"]
    list_filter = ["provider_type", "is_active", "is_default"]
    search_fields = ["name"]


@admin.register(UserVideoConnection)
class UserVideoConnectionAdmin(admin.ModelAdmin):
    list_display = ["user", "provider", "provider_email", "is_active", "created_at"]
    list_filter = ["provider", "is_active"]
    search_fields = ["user__email", "provider_email"]
    raw_id_fields = ["user"]


class MeetingParticipantInline(admin.TabularInline):
    model = MeetingParticipant
    extra = 0


@admin.register(VideoMeeting)
class VideoMeetingAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "provider",
        "status",
        "scheduled_start",
        "duration",
        "host",
        "participants_count",
    ]
    list_filter = ["status", "provider", "meeting_type"]
    search_fields = ["title", "description", "meeting_number"]
    raw_id_fields = ["host", "contact", "case", "appointment"]
    date_hierarchy = "scheduled_start"
    inlines = [MeetingParticipantInline]


@admin.register(MeetingParticipant)
class MeetingParticipantAdmin(admin.ModelAdmin):
    list_display = ["name", "email", "meeting", "role", "join_status", "joined_at"]
    list_filter = ["role", "join_status"]
    search_fields = ["name", "email"]
    raw_id_fields = ["meeting", "user", "contact"]


@admin.register(MeetingRecording)
class MeetingRecordingAdmin(admin.ModelAdmin):
    list_display = ["meeting", "recording_type", "duration", "file_size", "is_ready"]
    list_filter = ["recording_type", "is_ready"]
    raw_id_fields = ["meeting"]


@admin.register(VideoMeetingSettings)
class VideoMeetingSettingsAdmin(admin.ModelAdmin):
    list_display = [
        "default_duration",
        "default_waiting_room",
        "auto_add_to_appointments",
        "updated_at",
    ]
