from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated

from .models import CustomUser
from .permissions import IsAdministrador
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (IsAdministrador,)
    serializer_class = RegisterSerializer


class UserProfileView(generics.RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = (IsAdministrador,)

    def get_queryset(self):
        return CustomUser.objects.filter(groups__name='Empleado').order_by('username')
