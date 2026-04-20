from django.contrib import admin

from .models import Maintenance


@admin.register(Maintenance)
class MaintenanceAdmin(admin.ModelAdmin):
    list_display = ("resource", "maintenance_type", "scheduled_date", "technician", "status")
    list_filter = ("status", "maintenance_type")
    search_fields = ("resource__code", "resource__name", "technician")
    autocomplete_fields = ("resource",)
