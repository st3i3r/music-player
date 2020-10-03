from rest_framework import serializers
from .models import VieUser
from SongAPI.models import Song
from SongAPI.serializers import SongSerializer


class UserSerializer(serializers.ModelSerializer):
    liked_songs = SongSerializer(many=True)

    class Meta:
        model = VieUser
        fields = ['id',
                  'first_name',
                  'last_name',
                  'username',
                  'email',
                  'password',
                  'profile_picture',
                  'dob',
                  'phone',
                  'liked_songs']
        read_only_fields = ['password']


class RegisterUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = VieUser
        fields = ['username',
                  'password',
                  'email']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = VieUser.objects.create(**validated_data)
        if password is not None:
            user.set_password(password)
        user.save()
        return user
