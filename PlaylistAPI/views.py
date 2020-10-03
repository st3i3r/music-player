from django.shortcuts import render
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Playlist
from .serializers import PlaylistSerializer
from .permissions import IsOwnerOrReadOnly
from Accounts.models import VieUser
from Accounts.serializers import UserSerializer


class PlaylistListCreateView(generics.ListCreateAPIView):
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        username = self.request.query_params.get('username', None)
        queryset = Playlist.objects.all()
        if username:
            queryset = queryset.filter(created_user__username=username)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_datetime=timezone.now(),
                        created_user=self.request.user,
                        slug=slugify(serializer.validated_data.get('title')))
        print(serializer.errors)


class PlaylistRUDView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Playlist.objects.all()
    lookup_field = 'slug'
    serializer_class = PlaylistSerializer
    permission_classes = [AllowAny]


