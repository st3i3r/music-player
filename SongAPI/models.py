from django.db import models
from django.utils import timezone
from StorageBackend import custom_storage
from Accounts.models import VieUser


class Song(models.Model):
    file = models.FileField(storage=custom_storage.MusicStorage(), blank=True, null=True)
    youtube_url = models.URLField(blank=True, null=True)
    display_title = models.CharField(max_length=100, blank=True)
    artist = models.CharField(max_length=100, blank=True)
    title = models.CharField(max_length=50, blank=True)
    duration = models.CharField(max_length=10, blank=True, default='Unknown')
    uploaded_time = models.DateTimeField(default=timezone.now)
    uploaded_user = models.ForeignKey(VieUser, on_delete=models.CASCADE)
    liked_by = models.ManyToManyField(VieUser, related_name='liked_songs', blank=True)

    class Meta:
        ordering = ['-uploaded_time']

    @property
    def owner(self):
        return self.uploaded_user

    def __str__(self):
        return self.title

