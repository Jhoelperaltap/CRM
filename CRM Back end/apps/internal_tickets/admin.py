from django.contrib import admin

from apps.internal_tickets.models import InternalTicket


@admin.register(InternalTicket)
class InternalTicketAdmin(admin.ModelAdmin):
    list_display = [
        "ticket_number",
        "title",
        "status",
        "priority",
        "assigned_to",
        "employee",
        "group",
        "created_at",
    ]
    list_filter = ["status", "priority", "category", "channel", "rating"]
    search_fields = ["ticket_number", "title", "description"]
    raw_id_fields = ["assigned_to", "employee", "created_by", "group"]
    readonly_fields = ["ticket_number"]
