from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from . import views
from .views import UserViewSet

router = DefaultRouter()
router.register("", UserViewSet)


app_name = 'accounts'
urlpatterns = [
    path('user/logout/', views.BlackListTokenView.as_view(), name='user-logout'),
    path('user/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('user/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("user/", include(router.urls)),
]
