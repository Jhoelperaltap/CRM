from rest_framework.routers import DefaultRouter

from apps.internal_tickets.views import InternalTicketViewSet

router = DefaultRouter()
router.register(r"", InternalTicketViewSet, basename="internal-ticket")

urlpatterns = router.urls
