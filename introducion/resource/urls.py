from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AssignmentViewSet, ResourceTypeViewSet, ResourceViewSet

router = DefaultRouter()
router.register(r"resources", ResourceViewSet, basename="resources")
router.register(r"resource-types", ResourceTypeViewSet, basename="resource-types")
router.register(r"assignments", AssignmentViewSet, basename="assignments")

urlpatterns = [
    path("", include(router.urls)),
]
