from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    cargo = models.CharField(max_length=100, blank=True)
    area = models.CharField(max_length=100, blank=True)
