from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.reverse import reverse as api_reverse
from rest_framework import status, viewsets
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt import exceptions
from .models import VieUser
from .serializers import UserSerializer, RegisterUserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = VieUser.objects.all()
    permission_classes = [AllowAny]
    lookup_field = "pk"
    serializer_map = {}

    def get_queryset(self):
        return self.queryset

    def get_serializer_class(self):
        return self.serializer_map.get(self.action, self.serializer_class)

    @action(methods=["POST"], detail=False, url_path="register")
    def register(self, request, *args, **kwargs):
        reg_serializer = RegisterUserSerializer(data=request.data)
        if reg_serializer.is_valid():
            new_user = reg_serializer.save()
            data = {
                'info': 'User successfully registered.'
            }
            if new_user:
                return Response(data=data, status=status.HTTP_201_CREATED)
        return Response(reg_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(methods=["GET"], detail=False, url_path="current-user")
    def current_user(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return Response(
                status=status.HTTP_200_OK,
                data=UserSerializer(request.user).data
            )
        return Response(
            status=status.HTTP_400_BAD_REQUEST
        )


class BlackListTokenView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            token = request.data.get('refresh_token')
            token = RefreshToken(token)
            token.blacklist()
            return Response(status=status.HTTP_200_OK)
        except exceptions.TokenError:
            return Response(status=status.HTTP_200_OK)
