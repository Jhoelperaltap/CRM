from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.core.utils import get_client_ip_safe, get_current_request

# Models to audit — maps model class to module name
AUDITED_MODELS = {}


def _create_audit_log(action, instance, changes=None):
    from apps.audit.models import AuditLog

    request = get_current_request()
    module = AUDITED_MODELS.get(type(instance))
    if module is None:
        return

    user = None
    ip_address = None
    user_agent = ""
    request_path = ""

    if request:
        user = getattr(request, "user", None)
        if user and not user.is_authenticated:
            user = None
        ip_address = get_client_ip_safe(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "")
        request_path = request.get_full_path()

    AuditLog.objects.create(
        user=user,
        action=action,
        module=module,
        object_id=str(instance.pk),
        object_repr=str(instance)[:255],
        changes=changes or {},
        ip_address=ip_address,
        user_agent=user_agent,
        request_path=request_path,
    )


@receiver(post_save)
def audit_post_save(sender, instance, created, **kwargs):
    if sender not in AUDITED_MODELS:
        return

    if created:
        _create_audit_log("create", instance)
    else:
        _create_audit_log("update", instance)


@receiver(post_delete)
def audit_post_delete(sender, instance, **kwargs):
    if sender not in AUDITED_MODELS:
        return

    _create_audit_log("delete", instance)


def register_audit_signals():
    """
    Register models that should produce audit trail entries.
    Called from AuditConfig.ready().
    """
    from apps.appointments.models import Appointment
    from apps.cases.models import TaxCase, TaxCaseNote
    from apps.contacts.models import Contact
    from apps.corporations.models import Corporation
    from apps.documents.models import Document
    from apps.tasks.models import Task
    from apps.users.models import Role, SharingRule, User, UserGroup

    AUDITED_MODELS.update(
        {
            Contact: "contacts",
            Corporation: "corporations",
            TaxCase: "cases",
            TaxCaseNote: "cases",
            Appointment: "appointments",
            Document: "documents",
            Task: "tasks",
            User: "users",
            Role: "roles",
            UserGroup: "groups",
            SharingRule: "sharing_rules",
        }
    )
