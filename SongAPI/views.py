from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import SongSerializer, AddSongToPlaylistSerializer
from .permissions import IsOwnerOrReadOnly, CustomPermissions
from PlaylistAPI.models import Playlist
from rest_framework import status
from .models import Song
import lyricsgenius


class SongViewSet(viewsets.ModelViewSet):
    queryset = Song.objects.all()
    lookup_field = "pk"
    permission_classes = [IsAuthenticatedOrReadOnly]
    serializer_class = SongSerializer
    http_method_names = ["get", "post"]
    serializer_map = {
        "list": SongSerializer,
    }

    def get_serializer_class(self):
        return self.serializer_map.get(self.action, self.serializer_class)

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return self.queryset.filter(uploaded_user=self.request.user)
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_user=self.request.user)

    @action(methods=["GET"], detail=False, url_path="liked-songs")
    def liked_songs(self, request, *args, **kwargs):
        queryset = request.user.liked_songs if request.user.is_authenticated else Song.objects.none()
        serializer = SongSerializer(queryset, many=True)
        return Response(data=serializer.data, status=status.HTTP_200_OK)

    @action(methods=["GET"], detail=True, url_path="toggle-like")
    def toggle_like(self, request, *args, **kwargs):
        song = self.get_object()
        if not request.user.is_authenticated:
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={
                    "message": "Login required !!!"
                }
            )

        if request.user in song.liked_by.all():
            song.liked_by.remove(request.user)
        else:
            song.liked_by.add(request.user)

        serializer = SongSerializer(song, context={'request': request})
        return Response(data=serializer.data, status=status.HTTP_200_OK)

    @action(methods=["POST"], detail=True, url_path="add-to-playlist")
    def add_to_playlist(self, request, *args, **kwargs):
        song = self.get_object()
        serializer = AddSongToPlaylistSerializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            playlist = Playlist.objects.get(pk=serializer.validated_data["playlist_id"])
            playlist.songs.add(song)
            return Response(
                {'data': request.data, 'message': 'Song added to playlist !'},
                status=status.HTTP_200_OK)

    @action(methods=["GET"], detail=True, url_path="lyrics")
    def get_lyrics(self, request, *args, **kwargs):
        # token = os.environ.get('client_access_token')
        song = self.get_object()
        title = song.title
        artist = song.artist
        try:
            genius = lyricsgenius.Genius(client_access_token='tq4sc6DWbH1sKBsECDTdef1OClRBToa599PvGldAvySj1-n5IT1AkBO4_RbS8yZe')
            song = genius.search_song(title, artist)
            lyrics = song.lyrics if song else '404 NOT FOUND !!!'
        except Exception as e:
            lyrics = "Failed to get lyrics !!!"
            return Response(
                {"data": request.data, "lyrics": lyrics},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            return Response({'data': request.data, 'lyrics': lyrics}, status=status.HTTP_200_OK)


