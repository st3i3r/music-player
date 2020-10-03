from rest_framework.test import APITestCase
from rest_framework.reverse import reverse as api_reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework_jwt.settings import api_settings
from .models import Playlist
from .serializers import PlaylistSerializer
from Accounts.models import VieUser


User = get_user_model()
jwt_payload_handler = api_settings.JWT_PAYLOAD_HANDLER
jwt_encode_handler = api_settings.JWT_ENCODE_HANDLER


# Create your tests here.
class PlaylistAPITestCase(APITestCase):
    def setUp(self):
        user = User.objects.create(username='steier', email='aldersonelliot@gmail.com')
        user.set_password('qviet1997')
        user.save()

        user2 = User.objects.create(username='viet', email='quangviet910@gmail.com')
        user2.set_password('qviet1997')
        user2.save()

        # Create new song, playlist
        playlist = Playlist.objects.create(title='Test playlist', description='Description for test playlist',
                                           slug='test-playlist', created_user=user)
        playlist.save()

    def test_retrieve_single_playlist(self):
        playlist = Playlist.objects.first()
        url = playlist.get_api_url()

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_playlist_with_unauth_user(self):
        url = api_reverse('playlist-api:playlist-create')
        data = {
            'title': 'Test tilte',
            'description': 'Test descrription',
            'slug': 'Test slug'
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_playlist_with_unauth_user(self):
        playlist = Playlist.objects.first()
        url = playlist.get_api_url()

        data = PlaylistSerializer(playlist).data
        data.update({'description': 'This is new description.'})
        data.update({'thumbnail': ''})

        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_playlist(self):
        user = User.objects.first()
        data = {
            'title': 'New playlist',
            'slug': 'new-playlist',
            'description': 'Test description'
        }

        url = api_reverse('playlist-api:playlist-create')

        payload = jwt_payload_handler(user)
        token = jwt_encode_handler(payload)
        self.client.credentials(HTTP_AUTHORIZATION='JWT ' + token)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_update_playlist_with_no_perm(self):
        playlist = Playlist.objects.first()
        data = PlaylistSerializer(playlist).data
        data.update({
            'description': 'New desscriptionsdsdsd',
            'thumbnail': ''
        })

        url = api_reverse('playlist-api:playlist-rud', kwargs={'pk': playlist.pk})

        viet = User.objects.get(username='viet')
        payload = jwt_payload_handler(viet)
        token = jwt_encode_handler(payload)

        self.client.credentials(HTTP_AUTHORIZATION='JWT ' + token)
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)



