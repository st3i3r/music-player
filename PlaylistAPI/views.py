from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from .models import Playlist
from .serializers import PlaylistSerializer, PlaylistCreateSerializer


class PlaylistViewSet(viewsets.ModelViewSet):
    serializer_class = PlaylistSerializer
    lookup_field = "slug"
    queryset = Playlist.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_map = {
        "list": PlaylistSerializer,
        "create": PlaylistCreateSerializer,
    }
    http_method_names = ["get", "post"]

    def get_serializer_class(self):
        return self.serializer_map.get(self.action, self.serializer_class)

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return self.queryset.filter(
                Q(shared=True) | Q(created_user=self.request.user)
            )
        return self.queryset.filter(shared=True)

    @action(methods=["GET"], detail=False, url_path="my-playlists")
    def my_playlists(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return Response(
                status=status.HTTP_400_BAD_REQUEST
            )

        playlists = self.queryset.filter(created_user=request.user)
        return Response(
            status=status.HTTP_200_OK,
            data=PlaylistSerializer(playlists, many=True).data
        )

    def perform_create(self, serializer):
        serializer.save(created_datetime=timezone.now(),
                        created_user=self.request.user,
                        slug=slugify(serializer.validated_data.get('title')))
