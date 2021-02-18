from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.owner == request.user


class CustomPermissions(permissions.BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method == 'PUT':
            if obj.owner == request.user:
                return True

        return False
