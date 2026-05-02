from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand

User = get_user_model()

TEST_USERNAME = "test_selenium"
TEST_PASSWORD = "TestUI_2024!"
TEST_EMAIL = "test_selenium@test.com"


class Command(BaseCommand):
    help = "Crea el usuario de prueba para los tests de Selenium (idempotente)"

    def handle(self, *args, **options):
        admin_group, _ = Group.objects.get_or_create(name="Administrador")

        user, created = User.objects.get_or_create(
            username=TEST_USERNAME,
            defaults={
                "email": TEST_EMAIL,
                "first_name": "Test",
                "last_name": "Selenium",
                "cargo": "QA",
                "area": "Testing",
            },
        )

        user.set_password(TEST_PASSWORD)
        user.save()
        user.groups.set([admin_group])

        if created:
            self.stdout.write(self.style.SUCCESS(f"Usuario '{TEST_USERNAME}' creado."))
        else:
            self.stdout.write(self.style.WARNING(f"Usuario '{TEST_USERNAME}' ya existía — contraseña actualizada."))
