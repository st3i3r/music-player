from django import forms
from django.contrib.auth.forms import AuthenticationForm
from .models import VieUser


class LoginForm(AuthenticationForm):
    username = forms.CharField(required=True, widget=forms.TextInput(
        attrs={'class': 'form-control mb-3', 'placeholder': 'Username'}
    ))
    password = forms.CharField(required=True, widget=forms.PasswordInput(
        attrs={'class': 'form-control mb-3', 'placeholder': 'Password'}
    ))

    class Meta:
        model = VieUser
        fields = ['username', 'password']


