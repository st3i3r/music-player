from django.conf import settings
from django.core.files.base import File
from django.core.files.uploadedfile import InMemoryUploadedFile, UploadedFile
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from .models import Song
import apputils
from tinytag import TinyTag, TinyTagException


class SongSerializer(serializers.ModelSerializer):
    uploaded_user = serializers.PrimaryKeyRelatedField(many=False, read_only=True)
    liked_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Song
        fields = ['id', 'file', 'youtube_url', 'display_title', 'title', 'artist', 'duration', 'uploaded_user', 'liked_by']
        read_only_fields = ['duration']

    def validate(self, attrs):
        file = attrs.get("file")
        if file and not file.content_type.startswith("audio"):
            raise ValidationError({
                "file": "Music file required"
            })

        if attrs.get("youtube_url"):
            if not attrs.get("title"):
                raise ValidationError({
                    "title": "Title required"
                })
            if not attrs.get("artist"):
                raise ValidationError({
                    "artist": "Artist required"
                })

        return attrs

    def create(self, validated_data):
        youtube_url = validated_data.get('youtube_url', None)
        if youtube_url:
            # Save file to tmp, celery task
            file_path = apputils.download_file(youtube_url, dir=settings.TEMPORARY_DOWNLOAD_DIR)
            tag = TinyTag.get(file_path)
            duration = apputils.format_time(int(tag.duration))
            with open(file_path, "rb") as f:
                validated_data["file"] = UploadedFile(File(f))
                instance = Song.objects.create(duration=duration, **validated_data)
        else:
            song: InMemoryUploadedFile = validated_data.get('file')
            tag = TinyTag.get(song.temporary_file_path())

            validated_data['title'] = validated_data['title'] if validated_data['title'] else tag.title
            validated_data['artist'] = validated_data['artist'] if validated_data['artist'] else tag.artist
            duration = apputils.format_time(int(tag.duration))
            instance = Song.objects.create(duration=duration, **validated_data)
        return instance


class AddSongToPlaylistSerializer(serializers.Serializer):
    playlist_id = serializers.IntegerField(required=True)