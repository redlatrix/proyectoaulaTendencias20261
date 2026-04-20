from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from resource.models import Resource, ResourceStatus


class MaintenanceType(models.TextChoices):
    PREVENTIVE = "PREVENTIVE", "Preventivo"
    CORRECTIVE = "CORRECTIVE", "Correctivo"


class MaintenanceStatus(models.TextChoices):
    SCHEDULED = "SCHEDULED", "Programado"
    IN_PROGRESS = "IN_PROGRESS", "En curso"
    COMPLETED = "COMPLETED", "Completado"
    CANCELLED = "CANCELLED", "Cancelado"


ACTIVE_STATUSES = [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]


class Maintenance(models.Model):
    resource = models.ForeignKey(
        Resource,
        on_delete=models.PROTECT,
        related_name="maintenances",
    )
    maintenance_type = models.CharField(max_length=20, choices=MaintenanceType.choices)
    scheduled_date = models.DateField()
    technician = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=MaintenanceStatus.choices,
        default=MaintenanceStatus.SCHEDULED,
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-scheduled_date", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=["resource"],
                condition=Q(status__in=["SCHEDULED", "IN_PROGRESS"]),
                name="unique_active_maintenance_per_resource",
            ),
        ]

    def __str__(self):
        return f"{self.resource.code} - {self.get_maintenance_type_display()} ({self.scheduled_date})"

    def clean(self):
        if self.pk is None and self.resource_id:
            if self.resource.status in {ResourceStatus.ASSIGNED, ResourceStatus.RETIRED}:
                raise ValidationError(
                    {"resource": "No se puede programar mantenimiento para un recurso asignado o dado de baja."}
                )

        if self.start_date and self.scheduled_date and self.start_date < self.scheduled_date:
            raise ValidationError(
                {"start_date": "La fecha de inicio no puede ser anterior a la fecha programada."}
            )

        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError(
                {"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
