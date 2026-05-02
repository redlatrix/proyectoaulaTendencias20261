from datetime import date
from uuid import uuid4

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q


class ResourceCategory(models.TextChoices):
    PHYSICAL = "PHYSICAL", "Fisico"
    DIGITAL = "DIGITAL", "Digital"
    SPACE = "SPACE", "Espacio"


class ResourceStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Disponible"
    ASSIGNED = "ASSIGNED", "Asignado"
    MAINTENANCE = "MAINTENANCE", "En mantenimiento"
    RETIRED = "RETIRED", "Dado de baja"


class ResourceType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=ResourceCategory.choices)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class Resource(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=40, unique=True, default=uuid4)
    type = models.ForeignKey(
        ResourceType,
        on_delete=models.PROTECT,
        related_name="resources",
        null=True,
        blank=True,
    )
    technical_description = models.TextField(blank=True)
    acquisition_date = models.DateField(blank=True, null=True)
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=ResourceStatus.choices,
        default=ResourceStatus.AVAILABLE,
    )
    responsible_area = models.CharField(max_length=100, default="General")

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def has_active_assignment(self):
        return self.assignments.filter(returned_at__isnull=True).exists()

    def can_be_deleted(self):
        if self.status == ResourceStatus.MAINTENANCE:
            return False
        if self.has_active_assignment:
            return False
        return True

    def delete(self, *args, **kwargs):
        if not self.can_be_deleted():
            raise ValidationError(
                "No se puede eliminar un recurso asignado o en mantenimiento."
            )
        return super().delete(*args, **kwargs)


class Assignment(models.Model):
    resource = models.ForeignKey(
        Resource,
        on_delete=models.PROTECT,
        related_name="assignments",
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="assignments",
        null=True,
    )
    start_date = models.DateField(default=date.today)
    expected_return_date = models.DateField(blank=True, null=True)
    returned_at = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("-start_date", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=["resource"],
                condition=Q(returned_at__isnull=True),
                name="unique_active_assignment_per_resource",
            ),
            models.CheckConstraint(
                condition=Q(returned_at__isnull=True)
                | Q(returned_at__gte=models.F("start_date")),
                name="assignment_returned_after_start",
            ),
        ]

    def __str__(self):
        assignee_name = self.assignee.get_full_name() or self.assignee.username
        return f"{self.resource.code} -> {assignee_name} ({self.start_date})"

    def clean(self):
        if self.expected_return_date and self.expected_return_date < self.start_date:
            raise ValidationError(
                {"expected_return_date": "La fecha esperada no puede ser menor al inicio."}
            )
        if self.returned_at and self.returned_at < self.start_date:
            raise ValidationError(
                {"returned_at": "La fecha de devolucion no puede ser menor al inicio."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
