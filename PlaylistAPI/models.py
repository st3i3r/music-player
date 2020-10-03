from django.db import models
from rest_framework.reverse import reverse as api_reverse
from SongAPI.models import Song
from StorageBackend import custom_storage
from django.contrib.auth import get_user_model


User = get_user_model()


# Create your models here.
class Playlist(models.Model):
    title = models.CharField(max_length=100, blank=False, null=False, unique=True)
    thumbnail = models.FileField(upload_to='playlist-thumbnail', storage=custom_storage.MediaStorage(), blank=True, null=True)
    slug = models.SlugField(max_length=200)
    description = models.CharField(max_length=100, blank=True)
    created_datetime = models.DateTimeField(auto_now_add=True)
    created_user = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    songs = models.ManyToManyField(Song, related_name='playlists', blank=True)

    class Meta:
        ordering = ['created_datetime']

    @property
    def owner(self):
        return self.created_user

    def __str__(self):
        return self.title

    def get_api_url(self, request=None):
        return api_reverse('playlist-api:playlist-rud', kwargs={'pk': self.pk}, request=request)
