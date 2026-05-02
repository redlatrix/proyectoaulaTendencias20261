from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Datos del Empleado', {'fields': ('cargo', 'area')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'cargo', 'area', 'is_staff')
