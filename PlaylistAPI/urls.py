from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views
from .views import PlaylistViewSet

app_name = 'playlist-api'


router = DefaultRouter()
router.register("", PlaylistViewSet)
