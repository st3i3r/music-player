from rest_framework import generics, mixins
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .serializers import SongSerializer
from .permissions import IsOwnerOrReadOnly, CustomPermissions
from PlaylistAPI.models import Playlist
from rest_framework import status
from .models import Song
import lyricsgenius
from tinytag import TinyTag
import apputils


class SongListCreateView(generics.ListCreateAPIView):
    queryset = Song.objects.all()
    permission_classes = [AllowAny]
    serializer_class = SongSerializer
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        queryset = self.get_queryset()
        liked_song_only = request.query_params.get('liked', None)
        if liked_song_only:
            queryset = request.user.liked_songs if request.user.is_authenticated else Song.objects.none()

        serializer = SongSerializer(queryset, many=True)
        return Response(data=serializer.data, status=status.HTTP_200_OK)

    def perform_create(self, serializer):
        serializer.save(uploaded_user=self.request.user)


class SongRUDView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Song.objects.all()
    lookup_field = 'pk'
    permission_classes = [IsOwnerOrReadOnly]
    serializer_class = SongSerializer


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def toggle_like(request, pk):
    instance = Song.objects.get(pk=pk)
    if request.user in instance.liked_by.all():
        instance.liked_by.remove(request.user)
    else:
        instance.liked_by.add(request.user)

    seralizer = SongSerializer(instance, context={'request': request})
    return Response(data=seralizer.data, status=status.HTTP_200_OK)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def add_to_playlist(request, song_pk, playlist_pk):
    song = Song.objects.get(pk=song_pk)
    playlist = Playlist.objects.get(pk=playlist_pk)

    playlist.songs.add(song)
    return Response({'data': request.data, 'message': 'Song added to playlist !'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_lyrics(request):
    # token = os.environ.get('client_access_token')
    title = request.query_params.get('title')
    artist = request.query_params.get('artist')
    try:
        genius = lyricsgenius.Genius(client_access_token='tq4sc6DWbH1sKBsECDTdef1OClRBToa599PvGldAvySj1-n5IT1AkBO4_RbS8yZe')
        song = genius.search_song(title, artist)
        lyrics = song.lyrics if song else '404 NOT FOUND !!!'
    except Exception as e:
        lyrics = "Connection error !"

    return Response({'data': request.data, 'lyrics': lyrics}, status=status.HTTP_200_OK)


