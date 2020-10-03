from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse as api_reverse
from rest_framework import status
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt import exceptions
from .models import VieUser
from .serializers import UserSerializer, RegisterUserSerializer


# Create your views here.
@api_view(['GET'])
def api_root(request, format=None):
    return Response({
        'song': api_reverse('song-api:song-listcreate', request=request, format=format),
        'playlist': api_reverse('playlist-api:playlist-listcreate', request=request, format=format),
        'account': api_reverse('accounts:user-listcreate', request=request, format=format)
    })


class UserRegisterView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        reg_serializer = RegisterUserSerializer(data=request.data)
        if reg_serializer.is_valid():
            new_user = reg_serializer.save()
            data = {
                'info': 'User successfully registered.'
            }
            if new_user:
                return JsonResponse(data=data, status=status.HTTP_201_CREATED)
        print(type(reg_serializer.errors))
        return Response(reg_serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserListView(generics.ListCreateAPIView):
    queryset = VieUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class UserDetailView(generics.RetrieveAPIView):
    queryset = VieUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'


class CurrentUser(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserSerializer

    def get_object(self):
        if self.request.user.is_anonymous:
            return None
        return self.request.user


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
