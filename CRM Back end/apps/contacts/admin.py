from django.contrib import admin

from apps.contacts.models import Contact, ContactStar


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = [
        "last_name",
        "first_name",
        "email",
        "phone",
        "status",
        "primary_corporation",
        "assigned_to",
        "created_at",
    ]
    list_filter = ["status", "state", "country", "created_at"]
    search_fields = ["first_name", "last_name", "email", "phone"]
    list_select_related = ["primary_corporation", "assigned_to"]
    readonly_fields = ["id", "created_at", "updated_at"]
    raw_id_fields = ["primary_corporation", "assigned_to", "created_by"]
    filter_horizontal = ["corporations"]  # Better UI for M2M
    ordering = ["last_name", "first_name"]
    fieldsets = (
        (
            "Name",
            {
                "fields": (
                    "id",
                    "salutation",
                    "first_name",
                    "last_name",
                ),
            },
        ),
        (
            "Contact Information",
            {
                "fields": (
                    "email",
                    "phone",
                    "mobile",
                ),
            },
        ),
        (
            "Personal",
            {
                "fields": (
                    "date_of_birth",
                    "ssn_last_four",
                ),
            },
        ),
        (
            "Address",
            {
                "fields": (
                    "street_address",
                    "city",
                    "state",
                    "zip_code",
                    "country",
                ),
            },
        ),
        (
            "Classification",
            {
                "fields": (
                    "status",
                    "source",
                    "tags",
                ),
            },
        ),
        (
            "Relationships",
            {
                "fields": (
                    "corporations",
                    "primary_corporation",
                    "assigned_to",
                    "created_by",
                ),
            },
        ),
        (
            "Other",
            {
                "fields": (
                    "description",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )


@admin.register(ContactStar)
class ContactStarAdmin(admin.ModelAdmin):
    list_display = ["user", "contact", "created_at"]
    list_select_related = ["user", "contact"]
    raw_id_fields = ["user", "contact"]
    readonly_fields = ["id", "created_at"]
