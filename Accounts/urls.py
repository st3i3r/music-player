from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views


app_name = 'accounts'
urlpatterns = [
    path('root/', views.api_root, name='api-root'),
    path('account/', views.UserListView.as_view(), name='user-list'),
    path('account/logout/', views.BlackListTokenView.as_view(), name='user-logout'),
    path('account/current-user/', views.CurrentUser.as_view(), name='current-user'),
    path('account/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('account/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('account/register/', views.UserRegisterView.as_view(), name='user-register'),
    path('account/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
]
