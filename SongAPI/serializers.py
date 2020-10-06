from rest_framework import serializers
from .models import Song
from Accounts.models import VieUser
import apputils
from tinytag import TinyTag


class SongSerializer(serializers.ModelSerializer):
    uploaded_user = serializers.PrimaryKeyRelatedField(many=False, read_only=True)
    liked_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Song
        fields = ['id', 'file', 'youtube_url', 'display_title', 'title', 'artist', 'duration', 'uploaded_user', 'liked_by']
        read_only_fields = ['uploaded_user']

    def create(self, validated_data):
        youtube_url = validated_data.pop('youtube_url')
        if youtube_url:
            audio_link = apputils.get_file(youtube_url)
            instance = super().save(youtube_url=audio_link)
        else:
            song = validated_data.get('file')
            tag = TinyTag.get(song.temporary_file_path())
            duration = apputils.format_time(int(tag.duration))
            instance = Song.objects.create(duration=duration, **validated_data)

        return instance

    def update(self, instance, validated_data):
        pass

