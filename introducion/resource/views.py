from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError as DRFValidationError

from authentication.permissions import IsAdministrador

from .models import Assignment, Resource, ResourceType
from .serializers import AssignmentSerializer, ResourceSerializer, ResourceTypeSerializer


class ResourceTypeViewSet(viewsets.ModelViewSet):
    queryset = ResourceType.objects.all()
    serializer_class = ResourceTypeSerializer

    def get_permissions(self):
        if self.action in ("create", "destroy", "update", "partial_update"):
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer

    def get_permissions(self):
        if self.action in ("create", "destroy", "update", "partial_update"):
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name='Empleado').exists():
            return Resource.objects.filter(
                assignments__assignee=user,
                assignments__returned_at__isnull=True,
            ).distinct()
        return Resource.objects.all()

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except DjangoValidationError as e:
            raise DRFValidationError(e.message)


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer

    def get_permissions(self):
        if self.action in ("create", "destroy", "update", "partial_update"):
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        if user.groups.filter(name='Empleado').exists():
            return Assignment.objects.filter(assignee=user)
        return Assignment.objects.all()
