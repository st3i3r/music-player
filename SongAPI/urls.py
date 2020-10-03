from django.urls import path, re_path, include
from rest_framework import routers
from rest_framework.urlpatterns import format_suffix_patterns
from . import views

app_name = 'song-api'

urlpatterns = [
    path('', views.SongListCreateView.as_view(), name='song-listcreate'),
    path('<int:pk>/', views.SongRUDView.as_view(), name='song-rud'),
    path('<int:pk>/like/', views.toggle_like, name='song-like'),
    path('add/<int:song_pk>/<int:playlist_pk>/', views.add_to_playlist, name='add-to-playlist'),
    path('lyrics/', views.get_lyrics, name='song-lyrics'),
]
