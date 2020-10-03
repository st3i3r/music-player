from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework.reverse import reverse as api_reverse
from PlaylistAPI.models import Playlist
from django.urls import reverse
from SongAPI.models import Song
from PlaylistAPI.serializers import PlaylistSerializer


User = get_user_model()


# Create your tests here.
class SongAPITestCase(APITestCase):

    def setUp(self):
        user = User.objects.create(username='steier', email='aldersonelliot@gmail.com')
        user.set_password('qviet1997')
        user.save()

        user2 = User.objects.create(username='viet', email='quangviet910@gmail.com')
        user2.set_password('qviet1997')
        user2.save()

        # Create new song, playlist
        playlist = Playlist.objects.create(title='Test playlist', description='Description for test playlist', slug='test-playlist', created_user=user)
        playlist.save()

