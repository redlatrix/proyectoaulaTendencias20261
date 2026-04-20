from datetime import date, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.response import Response

from authentication.permissions import IsAdministrador
from .models import Maintenance, MaintenanceStatus
from .serializers import MaintenanceSerializer


class MaintenanceViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceSerializer

    def get_permissions(self):
        if self.action in ("create", "destroy", "update", "partial_update"):
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return Maintenance.objects.all()

    def perform_destroy(self, instance):
        if instance.status != MaintenanceStatus.SCHEDULED:
            raise DRFValidationError(
                "Solo se puede eliminar un mantenimiento en estado SCHEDULED."
            )
        try:
            instance.delete()
        except DjangoValidationError as e:
            raise DRFValidationError(e.message)

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        try:
            days = int(request.query_params.get("days", 7))
            if days < 1:
                days = 1
        except (ValueError, TypeError):
            days = 7

        cutoff = date.today() + timedelta(days=days)
        maintenances = Maintenance.objects.filter(
            status=MaintenanceStatus.SCHEDULED,
            scheduled_date__lte=cutoff,
        )
        serializer = self.get_serializer(maintenances, many=True)
        return Response(serializer.data)
