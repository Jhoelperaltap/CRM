from rest_framework.routers import DefaultRouter

from apps.appointments.views import AppointmentPageViewSet

router = DefaultRouter()
router.register(r"", AppointmentPageViewSet, basename="appointment-page")

urlpatterns = router.urls
