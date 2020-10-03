from rest_framework import serializers
from .models import Song
from Accounts.models import VieUser


class SongSerializer(serializers.ModelSerializer):
    uploaded_user = serializers.PrimaryKeyRelatedField(many=False, read_only=True)
    liked_by = serializers.PrimaryKeyRelatedField(many=True, queryset=VieUser.objects.all())

    class Meta:
        model = Song
        fields = ['id', 'file', 'display_title', 'title', 'artist', 'uploaded_user', 'liked_by']
        read_only_fields = ['uploaded_user']
