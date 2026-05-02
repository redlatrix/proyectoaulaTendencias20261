from django.contrib.auth.models import AnonymousUser, Group
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase

from authentication.models import CustomUser
from authentication.permissions import IsAdministrador


class PruebasModeloCustomUser(TestCase):
    def test_campos_cargo_y_area_se_guardan_correctamente(self):
        user = CustomUser.objects.create_user(
            username="empleado1",
            password="Pass1234!",
            cargo="Docente",
            area="Sistemas",
        )
        user.refresh_from_db()
        self.assertEqual(user.cargo, "Docente")
        self.assertEqual(user.area, "Sistemas")

    def test_usuario_nuevo_queda_en_grupo_empleado_por_signal(self):
        user = CustomUser.objects.create_user(
            username="empleado2",
            password="Pass1234!",
        )
        grupos = list(user.groups.values_list("name", flat=True))
        self.assertIn("Empleado", grupos)

    def test_superusuario_no_queda_en_grupo_empleado(self):
        superuser = CustomUser.objects.create_superuser(
            username="root",
            password="Pass1234!",
        )
        grupos = list(superuser.groups.values_list("name", flat=True))
        self.assertNotIn("Empleado", grupos)


class PruebasPermisoIsAdministrador(TestCase):
    def setUp(self):
        self.permission = IsAdministrador()
        self.factory = APIRequestFactory()

    def test_deniega_usuario_anonimo(self):
        request = self.factory.get("/api/resource/resources/")
        request.user = AnonymousUser()
        self.assertFalse(self.permission.has_permission(request, view=None))

    def test_deniega_empleado_sin_grupo_administrador(self):
        user = CustomUser.objects.create_user(username="emp", password="Pass1234!")
        request = self.factory.get("/api/resource/resources/")
        request.user = user
        self.assertFalse(self.permission.has_permission(request, view=None))

    def test_permite_usuario_en_grupo_administrador(self):
        user = CustomUser.objects.create_user(username="adm", password="Pass1234!")
        grupo, _ = Group.objects.get_or_create(name="Administrador")
        user.groups.add(grupo)
        request = self.factory.get("/api/resource/resources/")
        request.user = user
        self.assertTrue(self.permission.has_permission(request, view=None))

    def test_permite_superusuario_sin_grupo(self):
        superuser = CustomUser.objects.create_superuser(
            username="root2", password="Pass1234!"
        )
        request = self.factory.get("/api/resource/resources/")
        request.user = superuser
        self.assertTrue(self.permission.has_permission(request, view=None))


class PruebasApiLogin(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="login_user", password="Pass1234!"
        )

    def test_login_retorna_tokens_jwt(self):
        response = self.client.post(
            "/api/authentication/login/",
            {"username": "login_user", "password": "Pass1234!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_con_credenciales_incorrectas_retorna_401(self):
        response = self.client.post(
            "/api/authentication/login/",
            {"username": "login_user", "password": "wrongpass"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PruebasApiMe(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            username="me_user",
            password="Pass1234!",
            email="me@example.com",
            cargo="Ingeniero",
            area="TI",
        )

    def test_me_sin_token_retorna_401(self):
        response = self.client.get("/api/authentication/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_retorna_datos_del_usuario_autenticado(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/authentication/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "me_user")
        self.assertEqual(response.data["email"], "me@example.com")
        self.assertEqual(response.data["cargo"], "Ingeniero")
        self.assertEqual(response.data["area"], "TI")


class PruebasApiRegistroEmpleados(APITestCase):
    def setUp(self):
        self.superuser = CustomUser.objects.create_superuser(
            username="admin", password="Pass1234!"
        )
        self.empleado = CustomUser.objects.create_user(
            username="empleado_base", password="Pass1234!"
        )
        self.payload = {
            "username": "nuevo_emp",
            "password": "Pass1234!",
            "email": "nuevo@example.com",
            "first_name": "Nuevo",
            "last_name": "Empleado",
            "cargo": "Auxiliar",
            "area": "Biblioteca",
        }

    def test_registro_sin_autenticacion_retorna_401(self):
        response = self.client.post(
            "/api/authentication/register/", self.payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empleado_no_puede_registrar_usuarios(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.post(
            "/api/authentication/register/", self.payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_registrar_empleado_con_cargo_y_area(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.post(
            "/api/authentication/register/", self.payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", response.data)
        user = CustomUser.objects.get(username="nuevo_emp")
        self.assertEqual(user.cargo, "Auxiliar")
        self.assertEqual(user.area, "Biblioteca")
        self.assertTrue(user.check_password("Pass1234!"))

    def test_empleado_creado_queda_en_grupo_empleado(self):
        self.client.force_authenticate(user=self.superuser)
        self.client.post(
            "/api/authentication/register/", self.payload, format="json"
        )
        user = CustomUser.objects.get(username="nuevo_emp")
        self.assertIn("Empleado", list(user.groups.values_list("name", flat=True)))


class PruebasApiCrudEmpleados(APITestCase):
    def setUp(self):
        self.superuser = CustomUser.objects.create_superuser(
            username="admin2", password="Pass1234!"
        )
        self.empleado = CustomUser.objects.create_user(
            username="emp2", password="Pass1234!"
        )

    def test_admin_puede_listar_empleados(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.get("/api/authentication/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_empleado_no_puede_listar_usuarios(self):
        self.client.force_authenticate(user=self.empleado)
        response = self.client.get("/api/authentication/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_actualizar_datos_de_empleado(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.patch(
            f"/api/authentication/users/{self.empleado.id}/",
            {"cargo": "Coordinador", "area": "Docencia"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.empleado.refresh_from_db()
        self.assertEqual(self.empleado.cargo, "Coordinador")
        self.assertEqual(self.empleado.area, "Docencia")

    def test_admin_puede_eliminar_empleado(self):
        self.client.force_authenticate(user=self.superuser)
        response = self.client.delete(
            f"/api/authentication/users/{self.empleado.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomUser.objects.filter(id=self.empleado.id).exists())
