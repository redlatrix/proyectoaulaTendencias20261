from datetime import date, timedelta

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser
from resource.models import Resource, ResourceCategory, ResourceStatus, ResourceType
from maintenance.models import Maintenance, MaintenanceStatus, MaintenanceType
from maintenance.serializers import MaintenanceSerializer


def crear_usuario(username, password="Pass1234!", superuser=False, grupo=None):
    if superuser:
        user = CustomUser.objects.create_superuser(username=username, password=password)
    else:
        user = CustomUser.objects.create_user(username=username, password=password)
    if grupo:
        g, _ = Group.objects.get_or_create(name=grupo)
        user.groups.set([g])
    return user


def crear_tipo(name="Laptop", category=ResourceCategory.PHYSICAL):
    return ResourceType.objects.create(name=name, category=category)


def crear_recurso(name="PC-01", code="PC-001", tipo=None, status=ResourceStatus.AVAILABLE, area="TI"):
    if tipo is None:
        tipo = crear_tipo()
    return Resource.objects.create(
        name=name, code=code, type=tipo, status=status, responsible_area=area
    )


def crear_mantenimiento(recurso, days_from_now=5, maintenance_type=MaintenanceType.PREVENTIVE,
                        technician="Tecnico", mstatus=MaintenanceStatus.SCHEDULED):
    return Maintenance.objects.create(
        resource=recurso,
        maintenance_type=maintenance_type,
        scheduled_date=date.today() + timedelta(days=days_from_now),
        technician=technician,
        status=mstatus,
    )


class PruebasModeloMantenimiento(TestCase):
    def setUp(self):
        self.tipo = crear_tipo("Servidor")
        self.recurso = crear_recurso(name="Servidor A", code="SRV-001", tipo=self.tipo)

    def test_crear_mantenimiento_valido(self):
        m = crear_mantenimiento(self.recurso)
        self.assertEqual(m.status, MaintenanceStatus.SCHEDULED)
        self.assertEqual(m.resource, self.recurso)

    def test_str_incluye_codigo_tipo_y_fecha(self):
        m = crear_mantenimiento(self.recurso)
        self.assertIn("SRV-001", str(m))
        self.assertIn("Preventivo", str(m))

    def test_no_permite_mantenimiento_en_recurso_asignado(self):
        self.recurso.status = ResourceStatus.ASSIGNED
        self.recurso.save(update_fields=["status"])
        with self.assertRaises(ValidationError):
            Maintenance.objects.create(
                resource=self.recurso,
                maintenance_type=MaintenanceType.CORRECTIVE,
                scheduled_date=date.today() + timedelta(days=3),
                technician="Tecnico",
            )

    def test_no_permite_mantenimiento_en_recurso_dado_de_baja(self):
        self.recurso.status = ResourceStatus.RETIRED
        self.recurso.save(update_fields=["status"])
        with self.assertRaises(ValidationError):
            Maintenance.objects.create(
                resource=self.recurso,
                maintenance_type=MaintenanceType.PREVENTIVE,
                scheduled_date=date.today() + timedelta(days=3),
                technician="Tecnico",
            )

    def test_no_permite_dos_mantenimientos_activos_mismo_recurso(self):
        crear_mantenimiento(self.recurso)
        with self.assertRaises(Exception):
            Maintenance.objects.create(
                resource=self.recurso,
                maintenance_type=MaintenanceType.CORRECTIVE,
                scheduled_date=date.today() + timedelta(days=7),
                technician="Otro",
            )

    def test_fecha_inicio_no_puede_ser_anterior_a_fecha_programada(self):
        with self.assertRaises(ValidationError):
            Maintenance.objects.create(
                resource=self.recurso,
                maintenance_type=MaintenanceType.PREVENTIVE,
                scheduled_date=date.today() + timedelta(days=5),
                technician="Tecnico",
                start_date=date.today(),
            )

    def test_fecha_fin_no_puede_ser_anterior_a_inicio(self):
        with self.assertRaises(ValidationError):
            Maintenance.objects.create(
                resource=self.recurso,
                maintenance_type=MaintenanceType.PREVENTIVE,
                scheduled_date=date.today(),
                technician="Tecnico",
                start_date=date.today() + timedelta(days=2),
                end_date=date.today() + timedelta(days=1),
            )


class PruebasSerializerMantenimiento(TestCase):
    def setUp(self):
        self.tipo = crear_tipo("Impresora")
        self.recurso = crear_recurso(name="Impresora A", code="IMP-001", tipo=self.tipo)

    def test_serializer_valido_con_datos_correctos(self):
        serializer = MaintenanceSerializer(
            data={
                "resource": self.recurso.id,
                "maintenance_type": MaintenanceType.PREVENTIVE,
                "scheduled_date": str(date.today() + timedelta(days=7)),
                "technician": "Juan Perez",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_campos_read_only_presentes_al_leer(self):
        m = crear_mantenimiento(self.recurso)
        serializer = MaintenanceSerializer(instance=m)
        self.assertEqual(serializer.data["resource_code"], self.recurso.code)
        self.assertEqual(serializer.data["resource_name"], self.recurso.name)

    def test_error_al_programar_mantenimiento_en_recurso_asignado(self):
        self.recurso.status = ResourceStatus.ASSIGNED
        self.recurso.save(update_fields=["status"])
        serializer = MaintenanceSerializer(
            data={
                "resource": self.recurso.id,
                "maintenance_type": MaintenanceType.CORRECTIVE,
                "scheduled_date": str(date.today() + timedelta(days=3)),
                "technician": "Tecnico",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource", serializer.errors)

    def test_error_al_programar_mantenimiento_en_recurso_dado_de_baja(self):
        self.recurso.status = ResourceStatus.RETIRED
        self.recurso.save(update_fields=["status"])
        serializer = MaintenanceSerializer(
            data={
                "resource": self.recurso.id,
                "maintenance_type": MaintenanceType.PREVENTIVE,
                "scheduled_date": str(date.today() + timedelta(days=3)),
                "technician": "Tecnico",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource", serializer.errors)

    def test_error_si_ya_existe_mantenimiento_activo_para_el_recurso(self):
        crear_mantenimiento(self.recurso)
        serializer = MaintenanceSerializer(
            data={
                "resource": self.recurso.id,
                "maintenance_type": MaintenanceType.CORRECTIVE,
                "scheduled_date": str(date.today() + timedelta(days=10)),
                "technician": "Otro",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource", serializer.errors)


class PruebasApiMantenimientos(APITestCase):
    def setUp(self):
        self.admin = crear_usuario("adm_mnt", superuser=True)
        self.empleado = crear_usuario("emp_mnt")
        self.tipo = crear_tipo("Monitor")
        self.recurso = crear_recurso(name="Monitor A", code="MON-001", tipo=self.tipo)

    def test_admin_puede_crear_mantenimiento(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/maintenance/maintenances/",
            {
                "resource": self.recurso.id,
                "maintenance_type": MaintenanceType.PREVENTIVE,
                "scheduled_date": str(date.today() + timedelta(days=5)),
                "technician": "Carlos",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_empleado_no_puede_crear_mantenimiento(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.post(
            "/api/maintenance/maintenances/",
            {
                "resource": self.recurso.id,
                "maintenance_type": MaintenanceType.PREVENTIVE,
                "scheduled_date": str(date.today() + timedelta(days=5)),
                "technician": "Carlos",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_listar_mantenimientos_requiere_autenticacion(self):
        response = self.client.get("/api/maintenance/maintenances/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_usuario_autenticado_puede_listar(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get("/api/maintenance/maintenances/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_inicio_mantenimiento_cambia_recurso_a_maintenance(self):
        m = crear_mantenimiento(self.recurso, days_from_now=0)
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/maintenance/maintenances/{m.id}/",
            {
                "status": MaintenanceStatus.IN_PROGRESS,
                "start_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.recurso.refresh_from_db()
        self.assertEqual(self.recurso.status, ResourceStatus.MAINTENANCE)

    def test_completar_mantenimiento_devuelve_recurso_a_available(self):
        m = crear_mantenimiento(self.recurso, days_from_now=0, mstatus=MaintenanceStatus.IN_PROGRESS)
        self.recurso.status = ResourceStatus.MAINTENANCE
        self.recurso.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/maintenance/maintenances/{m.id}/",
            {
                "status": MaintenanceStatus.COMPLETED,
                "start_date": str(date.today()),
                "end_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.recurso.refresh_from_db()
        self.assertEqual(self.recurso.status, ResourceStatus.AVAILABLE)

    def test_cancelar_mantenimiento_devuelve_recurso_a_available(self):
        m = crear_mantenimiento(self.recurso, days_from_now=0, mstatus=MaintenanceStatus.IN_PROGRESS)
        self.recurso.status = ResourceStatus.MAINTENANCE
        self.recurso.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/maintenance/maintenances/{m.id}/",
            {"status": MaintenanceStatus.CANCELLED},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.recurso.refresh_from_db()
        self.assertEqual(self.recurso.status, ResourceStatus.AVAILABLE)

    def test_no_se_puede_asignar_recurso_en_mantenimiento(self):
        from resource.models import Assignment
        self.recurso.status = ResourceStatus.MAINTENANCE
        self.recurso.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/assignments/",
            {
                "resource": self.recurso.id,
                "assignee": self.empleado.id,
                "start_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_no_se_puede_eliminar_mantenimiento_en_curso(self):
        m = crear_mantenimiento(self.recurso, days_from_now=0, mstatus=MaintenanceStatus.IN_PROGRESS)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/maintenance/maintenances/{m.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_si_se_puede_eliminar_mantenimiento_programado(self):
        m = crear_mantenimiento(self.recurso)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/maintenance/maintenances/{m.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Maintenance.objects.filter(id=m.id).exists())

    def test_error_claro_al_intentar_asignar_recurso_no_disponible(self):
        self.recurso.status = ResourceStatus.MAINTENANCE
        self.recurso.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/assignments/",
            {
                "resource": self.recurso.id,
                "assignee": self.empleado.id,
                "start_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("resource", response.data)


class PruebasAlertasMantenimiento(APITestCase):
    def setUp(self):
        self.admin = crear_usuario("adm_alert", superuser=True)
        self.tipo = crear_tipo("Camara", ResourceCategory.PHYSICAL)
        self.recurso1 = crear_recurso(name="Camara A", code="CAM-A01", tipo=self.tipo)
        self.recurso2 = crear_recurso(name="Camara B", code="CAM-B01", tipo=self.tipo)
        self.recurso3 = crear_recurso(name="Camara C", code="CAM-C01", tipo=self.tipo)
        self.recurso4 = crear_recurso(name="Camara D", code="CAM-D01", tipo=self.tipo)

    def test_alerta_retorna_mantenimientos_proximos(self):
        crear_mantenimiento(self.recurso1, days_from_now=3)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids_recurso = [m["resource"] for m in response.data]
        self.assertIn(self.recurso1.id, ids_recurso)

    def test_mantenimiento_fuera_de_rango_no_aparece(self):
        crear_mantenimiento(self.recurso2, days_from_now=15)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids_recurso = [m["resource"] for m in response.data]
        self.assertNotIn(self.recurso2.id, ids_recurso)

    def test_parametro_days_configurable(self):
        crear_mantenimiento(self.recurso3, days_from_now=10)
        self.client.force_authenticate(user=self.admin)
        r7 = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        r15 = self.client.get("/api/maintenance/maintenances/alerts/?days=15")
        ids_7 = [m["resource"] for m in r7.data]
        ids_15 = [m["resource"] for m in r15.data]
        self.assertNotIn(self.recurso3.id, ids_7)
        self.assertIn(self.recurso3.id, ids_15)

    def test_mantenimientos_completados_no_aparecen_en_alertas(self):
        m = crear_mantenimiento(self.recurso4, days_from_now=2)
        m.status = MaintenanceStatus.COMPLETED
        Maintenance.objects.filter(pk=m.pk).update(status=MaintenanceStatus.COMPLETED)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids_recurso = [m["resource"] for m in response.data]
        self.assertNotIn(self.recurso4.id, ids_recurso)

    def test_mantenimientos_cancelados_no_aparecen_en_alertas(self):
        recurso5 = crear_recurso(name="Camara E", code="CAM-E01", tipo=self.tipo)
        m = crear_mantenimiento(recurso5, days_from_now=2)
        Maintenance.objects.filter(pk=m.pk).update(status=MaintenanceStatus.CANCELLED)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        ids_recurso = [m["resource"] for m in response.data]
        self.assertNotIn(recurso5.id, ids_recurso)

    def test_sin_autenticacion_retorna_401(self):
        response = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_days_por_defecto_es_7(self):
        crear_mantenimiento(self.recurso1, days_from_now=5)
        self.client.force_authenticate(user=self.admin)
        r_default = self.client.get("/api/maintenance/maintenances/alerts/")
        r_7 = self.client.get("/api/maintenance/maintenances/alerts/?days=7")
        self.assertEqual(len(r_default.data), len(r_7.data))
