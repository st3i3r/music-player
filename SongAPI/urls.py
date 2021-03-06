from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SongViewSet

app_name = 'song-api'

router = DefaultRouter()
router.register("", SongViewSet)
