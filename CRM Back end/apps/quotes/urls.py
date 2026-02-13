from rest_framework.routers import DefaultRouter

from apps.quotes.views import QuoteViewSet

router = DefaultRouter()
router.register(r"", QuoteViewSet, basename="quote")

urlpatterns = router.urls
