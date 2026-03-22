from datetime import date, timedelta

from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from authentication.models import CustomUser
from resource.models import (
    Assignment,
    Resource,
    ResourceCategory,
    ResourceStatus,
    ResourceType,
)
from resource.serializers import AssignmentSerializer, ResourceSerializer


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


class PruebasModeloRecurso(TestCase):
    def setUp(self):
        self.tipo = crear_tipo()

    def test_no_permite_eliminar_recurso_en_mantenimiento(self):
        recurso = crear_recurso(code="M-001", tipo=self.tipo, status=ResourceStatus.MAINTENANCE)
        with self.assertRaises(ValidationError):
            recurso.delete()

    def test_no_permite_eliminar_recurso_con_asignacion_activa(self):
        recurso = crear_recurso(code="A-001", tipo=self.tipo, status=ResourceStatus.ASSIGNED)
        empleado = crear_usuario("emp_del")
        Assignment.objects.create(resource=recurso, assignee=empleado)
        self.assertTrue(recurso.has_active_assignment)
        self.assertFalse(recurso.can_be_deleted())
        with self.assertRaises(ValidationError):
            recurso.delete()

    def test_permite_eliminar_recurso_disponible_sin_asignaciones(self):
        recurso = crear_recurso(code="D-001", tipo=self.tipo)
        self.assertTrue(recurso.can_be_deleted())
        recurso.delete()
        self.assertFalse(Resource.objects.filter(code="D-001").exists())

    def test_recurso_dado_de_baja_puede_eliminarse(self):
        recurso = crear_recurso(code="R-001", tipo=self.tipo, status=ResourceStatus.RETIRED)
        self.assertTrue(recurso.can_be_deleted())

    def test_str_incluye_codigo_y_nombre(self):
        recurso = crear_recurso(name="Portatil", code="PT-001", tipo=self.tipo)
        self.assertIn("PT-001", str(recurso))
        self.assertIn("Portatil", str(recurso))


class PruebasModeloTipoRecurso(TestCase):
    def test_str_incluye_nombre_y_categoria(self):
        tipo = ResourceType.objects.create(
            name="Proyector", category=ResourceCategory.PHYSICAL
        )
        self.assertIn("Proyector", str(tipo))
        self.assertIn("Fisico", str(tipo))

    def test_nombre_de_tipo_debe_ser_unico(self):
        ResourceType.objects.create(name="UnicoTipo", category=ResourceCategory.DIGITAL)
        with self.assertRaises(Exception):
            ResourceType.objects.create(name="UnicoTipo", category=ResourceCategory.SPACE)


class PruebasSerializerRecurso(TestCase):
    def setUp(self):
        self.tipo = crear_tipo("Impresora")

    def test_creacion_rechaza_estado_inicial_distinto_de_available(self):
        serializer = ResourceSerializer(
            data={
                "name": "Impresora HP",
                "code": "IMP-001",
                "type": self.tipo.id,
                "value": "800.00",
                "status": ResourceStatus.ASSIGNED,
                "responsible_area": "TI",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)

    def test_creacion_fuerza_estado_available_sin_importar_payload(self):
        serializer = ResourceSerializer(
            data={
                "name": "Impresora Epson",
                "code": "IMP-002",
                "type": self.tipo.id,
                "value": "900.00",
                "responsible_area": "TI",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        recurso = serializer.save()
        self.assertEqual(recurso.status, ResourceStatus.AVAILABLE)

    def test_no_permite_marcar_available_si_tiene_asignacion_activa(self):
        recurso = crear_recurso(code="IMP-003", tipo=self.tipo, status=ResourceStatus.ASSIGNED)
        empleado = crear_usuario("emp_ser")
        Assignment.objects.create(resource=recurso, assignee=empleado)
        serializer = ResourceSerializer(
            instance=recurso,
            data={"status": ResourceStatus.AVAILABLE},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("status", serializer.errors)

    def test_codigo_unico_rechazado_en_serializador(self):
        crear_recurso(name="Base", code="BASE-001", tipo=self.tipo)
        serializer = ResourceSerializer(
            data={
                "name": "Duplicado",
                "code": "BASE-001",
                "type": self.tipo.id,
                "value": "500.00",
                "responsible_area": "TI",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("code", serializer.errors)

    def test_campos_obligatorios_fallan_sin_responsible_area(self):
        serializer = ResourceSerializer(
            data={
                "name": "Sin area",
                "code": "SA-001",
                "type": self.tipo.id,
                "value": "100.00",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("responsible_area", serializer.errors)


class PruebasSerializerAsignacion(TestCase):
    def setUp(self):
        self.tipo = crear_tipo("Tablet", ResourceCategory.DIGITAL)
        self.empleado = crear_usuario("emp_asig")

    def test_no_permite_asignar_recurso_en_mantenimiento(self):
        recurso = crear_recurso(code="TB-M01", tipo=self.tipo, status=ResourceStatus.MAINTENANCE)
        serializer = AssignmentSerializer(
            data={
                "resource": recurso.id,
                "assignee": self.empleado.id,
                "start_date": date.today(),
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource", serializer.errors)

    def test_no_permite_asignar_recurso_dado_de_baja(self):
        recurso = crear_recurso(code="TB-R01", tipo=self.tipo, status=ResourceStatus.RETIRED)
        serializer = AssignmentSerializer(
            data={
                "resource": recurso.id,
                "assignee": self.empleado.id,
                "start_date": date.today(),
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource", serializer.errors)

    def test_crear_asignacion_cambia_recurso_a_assigned(self):
        recurso = crear_recurso(code="TB-001", tipo=self.tipo)
        serializer = AssignmentSerializer(
            data={
                "resource": recurso.id,
                "assignee": self.empleado.id,
                "start_date": date.today(),
                "expected_return_date": date.today() + timedelta(days=3),
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        recurso.refresh_from_db()
        self.assertEqual(recurso.status, ResourceStatus.ASSIGNED)

    def test_devolucion_cambia_recurso_a_available(self):
        recurso = crear_recurso(code="TB-002", tipo=self.tipo)
        create_s = AssignmentSerializer(
            data={"resource": recurso.id, "assignee": self.empleado.id, "start_date": date.today()}
        )
        self.assertTrue(create_s.is_valid())
        asignacion = create_s.save()
        recurso.refresh_from_db()
        self.assertEqual(recurso.status, ResourceStatus.ASSIGNED)

        update_s = AssignmentSerializer(
            instance=asignacion,
            data={"returned_at": date.today() + timedelta(days=1)},
            partial=True,
        )
        self.assertTrue(update_s.is_valid(), update_s.errors)
        update_s.save()
        recurso.refresh_from_db()
        self.assertEqual(recurso.status, ResourceStatus.AVAILABLE)

    def test_no_permite_dos_asignaciones_activas_para_mismo_recurso(self):
        recurso = crear_recurso(code="TB-003", tipo=self.tipo)
        Assignment.objects.create(resource=recurso, assignee=self.empleado)
        otro_empleado = crear_usuario("emp_asig2")
        serializer = AssignmentSerializer(
            data={
                "resource": recurso.id,
                "assignee": otro_empleado.id,
                "start_date": date.today(),
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("resource", serializer.errors)

    def test_fecha_esperada_no_puede_ser_anterior_al_inicio(self):
        recurso = crear_recurso(code="TB-004", tipo=self.tipo)
        serializer = AssignmentSerializer(
            data={
                "resource": recurso.id,
                "assignee": self.empleado.id,
                "start_date": date.today(),
                "expected_return_date": date.today() - timedelta(days=1),
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("expected_return_date", serializer.errors)


class PruebasApiTiposRecurso(APITestCase):
    def setUp(self):
        self.admin = crear_usuario("adm_tipo", superuser=True)
        self.empleado = crear_usuario("emp_tipo")
        self.tipo = crear_tipo("Monitor")

    def test_listar_tipos_requiere_autenticacion(self):
        response = self.client.get("/api/resource/resource-types/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empleado_puede_listar_tipos(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get("/api/resource/resource-types/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_puede_crear_tipo(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/resource-types/",
            {"name": "Escaner", "category": ResourceCategory.PHYSICAL, "description": "Equipo de escaneo"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ResourceType.objects.filter(name="Escaner").exists())

    def test_empleado_no_puede_crear_tipo(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.post(
            "/api/resource/resource-types/",
            {"name": "Router", "category": ResourceCategory.DIGITAL},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_eliminar_tipo(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/resource/resource-types/{self.tipo.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class PruebasApiRecursos(APITestCase):
    def setUp(self):
        self.admin = crear_usuario("adm_rec", superuser=True)
        self.empleado = crear_usuario("emp_rec")
        self.tipo = crear_tipo("Camara")
        self.recurso = crear_recurso(name="Camara Canon", code="CAM-001", tipo=self.tipo)

    def test_listar_requiere_autenticacion(self):
        response = self.client.get("/api/resource/resources/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_puede_crear_recurso_con_estado_available(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/resources/",
            {
                "name": "Camara Sony",
                "code": "CAM-002",
                "type": self.tipo.id,
                "value": "2000.00",
                "responsible_area": "Comunicaciones",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ResourceStatus.AVAILABLE)

    def test_admin_no_puede_crear_recurso_con_estado_distinto_de_available(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/resources/",
            {
                "name": "Camara Nikon",
                "code": "CAM-003",
                "type": self.tipo.id,
                "value": "1800.00",
                "responsible_area": "Comunicaciones",
                "status": ResourceStatus.MAINTENANCE,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empleado_no_puede_crear_recurso(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.post(
            "/api/resource/resources/",
            {"name": "X", "code": "X-001", "type": self.tipo.id, "responsible_area": "TI"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_no_puede_eliminar_recurso_en_mantenimiento(self):
        recurso = crear_recurso(
            name="Baja", code="BJ-001", tipo=self.tipo, status=ResourceStatus.MAINTENANCE
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/resource/resources/{recurso.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_no_puede_eliminar_recurso_con_asignacion_activa(self):
        recurso = crear_recurso(code="AS-001", tipo=self.tipo, status=ResourceStatus.ASSIGNED)
        Assignment.objects.create(resource=recurso, assignee=self.empleado)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/resource/resources/{recurso.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_empleado_solo_ve_sus_recursos_asignados(self):
        otro_recurso = crear_recurso(name="Otro", code="OTR-001", tipo=self.tipo)
        Assignment.objects.create(resource=self.recurso, assignee=self.empleado)
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get("/api/resource/resources/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codigos = [r["code"] for r in response.data]
        self.assertIn("CAM-001", codigos)
        self.assertNotIn("OTR-001", codigos)

    def test_admin_ve_todos_los_recursos(self):
        crear_recurso(name="Extra", code="EX-001", tipo=self.tipo)
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/resource/resources/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)


class PruebasCriteriosAceptacion(APITestCase):

    def setUp(self):
        self.admin = crear_usuario("adm_ca", superuser=True)
        self.empleado = crear_usuario("emp_ca")
        self.tipo = crear_tipo("Escritorio", ResourceCategory.PHYSICAL)
        self.recurso = crear_recurso(
            name="Escritorio A", code="ESC-001", tipo=self.tipo
        )

    def test_registro_recurso_tiene_estado_available_por_defecto(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/resources/",
            {
                "name": "Escritorio B",
                "code": "ESC-002",
                "type": self.tipo.id,
                "responsible_area": "Oficina",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ResourceStatus.AVAILABLE)

    def test_codigo_duplicado_es_rechazado_en_registro(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            "/api/resource/resources/",
            {
                "name": "Duplicado",
                "code": "ESC-001",
                "type": self.tipo.id,
                "responsible_area": "Oficina",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("code", response.data)

    def test_recurso_expone_nombre_del_tipo_asociado(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/resource/resources/{self.recurso.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["type"], self.tipo.id)
        self.assertEqual(response.data["type_name"], self.tipo.name)

    def test_listado_de_tipos_es_accesible_y_muestra_datos_correctos(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get("/api/resource/resource-types/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        nombres = [t["name"] for t in response.data]
        self.assertIn("Escritorio", nombres)

    def test_asignacion_expone_datos_del_empleado_y_del_recurso(self):
        asignacion = Assignment.objects.create(
            resource=self.recurso, assignee=self.empleado
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/resource/assignments/{asignacion.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["assignee"], self.empleado.id)
        self.assertEqual(response.data["resource_code"], self.recurso.code)
        self.assertIsNotNone(response.data["assignee_name"])

    def test_empleado_puede_consultar_su_recurso_asignado_con_tipo(self):
        Assignment.objects.create(resource=self.recurso, assignee=self.empleado)
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get("/api/resource/resources/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["code"], "ESC-001")
        self.assertEqual(response.data[0]["type_name"], "Escritorio")


    def test_no_se_puede_eliminar_recurso_asignado(self):
        Assignment.objects.create(resource=self.recurso, assignee=self.empleado)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/resource/resources/{self.recurso.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Resource.objects.filter(id=self.recurso.id).exists())

    def test_no_se_puede_eliminar_recurso_en_mantenimiento(self):
        recurso_mtto = crear_recurso(
            name="En mtto", code="MTT-001", tipo=self.tipo, status=ResourceStatus.MAINTENANCE
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/resource/resources/{recurso_mtto.id}/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Resource.objects.filter(id=recurso_mtto.id).exists())

    def test_si_se_puede_eliminar_recurso_disponible(self):
        recurso_libre = crear_recurso(name="Libre", code="LB-CA1", tipo=self.tipo)
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f"/api/resource/resources/{recurso_libre.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Resource.objects.filter(code="LB-CA1").exists())


class PruebasApiAsignaciones(APITestCase):
    def setUp(self):
        self.admin = crear_usuario("adm_asig", superuser=True)
        self.empleado1 = crear_usuario("emp_asig1")
        self.empleado2 = crear_usuario("emp_asig2")
        self.tipo = crear_tipo("Silla")
        self.recurso1 = crear_recurso(name="Silla A", code="SA-001", tipo=self.tipo)
        self.recurso2 = crear_recurso(name="Silla B", code="SB-001", tipo=self.tipo)
        self.asignacion1 = Assignment.objects.create(
            resource=self.recurso1, assignee=self.empleado1
        )
        self.asignacion2 = Assignment.objects.create(
            resource=self.recurso2, assignee=self.empleado2
        )

    def test_empleado_solo_ve_sus_asignaciones(self):
        self.client.force_authenticate(user=self.empleado1)
        response = self.client.get("/api/resource/assignments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [a["id"] for a in response.data]
        self.assertIn(self.asignacion1.id, ids)
        self.assertNotIn(self.asignacion2.id, ids)

    def test_admin_ve_todas_las_asignaciones(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/resource/assignments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [a["id"] for a in response.data]
        self.assertIn(self.asignacion1.id, ids)
        self.assertIn(self.asignacion2.id, ids)

    def test_empleado_no_puede_crear_asignacion(self):
        recurso_libre = crear_recurso(name="Libre", code="LB-001", tipo=self.tipo)
        self.client.force_authenticate(user=self.empleado1)
        response = self.client.post(
            "/api/resource/assignments/",
            {
                "resource": recurso_libre.id,
                "assignee": self.empleado1.id,
                "start_date": str(date.today()),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_registrar_devolucion(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f"/api/resource/assignments/{self.asignacion1.id}/",
            {"returned_at": str(date.today() + timedelta(days=1))},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.recurso1.refresh_from_db()
        self.assertEqual(self.recurso1.status, ResourceStatus.AVAILABLE)
