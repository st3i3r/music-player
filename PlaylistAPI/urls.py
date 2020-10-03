from django.urls import path, re_path, include
from rest_framework import routers
from . import views
from rest_framework.urlpatterns import format_suffix_patterns
from .models import Playlist


app_name = 'playlist-api'
urlpatterns = [
    path('', views.PlaylistListCreateView.as_view(), name='playlist-listcreate'),
    path('<slug:slug>/', views.PlaylistRUDView.as_view(), name='playlist-rud'),
]
