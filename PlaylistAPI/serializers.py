from rest_framework import serializers
from django.utils.text import slugify
from .models import Playlist
from SongAPI.serializers import SongSerializer


class PlaylistSerializer(serializers.ModelSerializer):
    created_user = serializers.PrimaryKeyRelatedField(many=False, read_only=True)
    songs = SongSerializer(many=True, read_only=True)

    class Meta:
        model = Playlist
        fields = ['id', 'title', 'thumbnail', 'slug', 'description', 'created_user', 'songs']
        read_only_fields = ['created_user', 'slug', 'songs']

    def create(self, validated_data):
        playlist = Playlist.objects.create(**validated_data)
        return playlist

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.thumbnail = validated_data.get('thumbnail', instance.thumbnail)
        instance.slug = slugify(instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.created_user = validated_data.get('created_user', instance.created_user)

        return instance


class PlaylistCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Playlist
        fields = ["title", "description", "thumbnail", "shared"]