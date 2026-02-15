from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth
    path("api/v1/auth/", include("apps.users.urls_auth")),
    # CRM modules
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/roles/", include("apps.users.urls_roles")),
    path("api/v1/departments/", include("apps.users.urls_department")),
    path("api/v1/branches/", include("apps.users.urls_branch")),
    path("api/v1/contacts/", include("apps.contacts.urls")),
    path("api/v1/corporations/", include("apps.corporations.urls")),
    path("api/v1/cases/", include("apps.cases.urls")),
    path("api/v1/sla/", include("apps.cases.sla_urls")),
    path("api/v1/quotes/", include("apps.quotes.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/v1/appointments/", include("apps.appointments.urls")),
    path("api/v1/appointment-pages/", include("apps.appointments.urls_pages")),
    path("api/v1/documents/", include("apps.documents.urls")),
    path(
        "api/v1/department-folders/", include("apps.documents.urls_department_folder")
    ),
    path("api/v1/tasks/", include("apps.tasks.urls")),
    path("api/v1/internal-tickets/", include("apps.internal_tickets.urls")),
    path("api/v1/preferences/", include("apps.dashboard.urls_preferences")),
    path("api/v1/settings/", include("apps.users.urls_settings")),
    path("api/v1/settings/login-history/", include("apps.audit.urls_login_history")),
    path("api/v1/settings/settings-log/", include("apps.audit.urls_settings_log")),
    path("api/v1/settings/pii-access-log/", include("apps.audit.urls_pii_log")),
    path("api/v1/emails/", include("apps.emails.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/settings/", include("apps.workflows.urls")),
    path("api/v1/settings/", include("apps.cases.checklist_urls")),
    path("api/v1/module-config/", include("apps.module_config.urls")),
    path("api/v1/settings/", include("apps.emails.urls_settings")),
    path("api/v1/reports/analytics/", include("apps.dashboard.urls_reports")),
    path("api/v1/reports/", include("apps.reports.urls")),
    path("api/v1/sales-insights/", include("apps.sales_insights.urls")),
    path("api/v1/forecasts/", include("apps.forecasts.urls")),
    path("api/v1/esign-documents/", include("apps.esign.urls")),
    path("api/v1/settings/approvals/", include("apps.approvals.urls")),
    path("api/v1/settings/", include("apps.webforms.urls")),
    path("api/v1/settings/", include("apps.business_hours.urls")),
    path("api/v1/settings/", include("apps.portal.urls_config")),
    path("api/v1/portal/", include("apps.portal.urls")),
    path("api/v1/portal/chat/", include("apps.chatbot.urls_portal")),
    path("api/v1/chatbot/", include("apps.chatbot.urls")),
    path("api/v1/ai-agent/", include("apps.ai_agent.urls")),
    path("api/v1/inventory/", include("apps.inventory.urls")),
    path("api/v1/marketing/", include("apps.marketing.urls")),
    path("api/v1/knowledge-base/", include("apps.knowledge_base.urls")),
    path("api/v1/live-chat/", include("apps.live_chat.urls")),
    path("api/v1/calls/", include("apps.calls.urls")),
    path("api/v1/playbooks/", include("apps.playbooks.urls")),
    path("api/v1/video-meetings/", include("apps.video_meetings.urls")),
    path("api/v1/search/", include("apps.core.urls")),
    path("api/v1/", include("apps.activities.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    try:
        import debug_toolbar

        urlpatterns += [path("__debug__/", include(debug_toolbar.urls))]
    except ImportError:
        pass
