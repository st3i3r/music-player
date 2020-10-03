from django.shortcuts import render
from django.views.generic import TemplateView
from Accounts.forms import LoginForm
from django.conf import settings


LOCAL_URL = 'http://127.0.0.1:8000/api/'
AWS_URL = 'http://18.192.37.56/api/'

# Create your views here.
class HomeView(TemplateView):
    template_name = 'spotify.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['login_form'] = LoginForm()
        context['user'] = self.request.user
        context['base_url'] = LOCAL_URL if settings.MODE == 'dev' else AWS_URL

        return context
