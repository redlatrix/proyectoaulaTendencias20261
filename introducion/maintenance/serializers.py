from rest_framework import serializers

from resource.models import ResourceStatus
from .models import ACTIVE_STATUSES, Maintenance, MaintenanceStatus


class MaintenanceSerializer(serializers.ModelSerializer):
    resource_code = serializers.CharField(source="resource.code", read_only=True)
    resource_name = serializers.CharField(source="resource.name", read_only=True)

    class Meta:
        model = Maintenance
        fields = (
            "id",
            "resource",
            "resource_code",
            "resource_name",
            "maintenance_type",
            "scheduled_date",
            "technician",
            "description",
            "estimated_cost",
            "status",
            "start_date",
            "end_date",
            "actual_cost",
            "notes",
        )

    def validate(self, attrs):
        instance = self.instance
        resource = attrs.get("resource") or (instance.resource if instance else None)

        if instance is None and resource:
            if resource.status in {ResourceStatus.ASSIGNED, ResourceStatus.RETIRED}:
                raise serializers.ValidationError(
                    {"resource": "No se puede programar mantenimiento para un recurso asignado o dado de baja."}
                )
            if Maintenance.objects.filter(resource=resource, status__in=ACTIVE_STATUSES).exists():
                raise serializers.ValidationError(
                    {"resource": "Este recurso ya tiene un mantenimiento activo o programado."}
                )

        scheduled_date = attrs.get("scheduled_date") or (instance.scheduled_date if instance else None)
        start_date = attrs.get("start_date") or (instance.start_date if instance else None)
        end_date = attrs.get("end_date") or (instance.end_date if instance else None)

        if start_date and scheduled_date and start_date < scheduled_date:
            raise serializers.ValidationError(
                {"start_date": "La fecha de inicio no puede ser anterior a la fecha programada."}
            )
        if end_date and start_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."}
            )

        return attrs

    def _apply_status_transition(self, maintenance):
        resource = maintenance.resource
        if maintenance.status == MaintenanceStatus.IN_PROGRESS:
            resource.status = ResourceStatus.MAINTENANCE
            resource.save(update_fields=["status"])
        elif maintenance.status in {MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED}:
            resource.status = ResourceStatus.AVAILABLE
            resource.save(update_fields=["status"])

    def create(self, validated_data):
        maintenance = super().create(validated_data)
        self._apply_status_transition(maintenance)
        return maintenance

    def update(self, instance, validated_data):
        old_status = instance.status
        maintenance = super().update(instance, validated_data)
        if old_status != maintenance.status:
            self._apply_status_transition(maintenance)
        return maintenance
