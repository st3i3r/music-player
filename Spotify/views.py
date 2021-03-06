from django.shortcuts import render
from django.views.generic import TemplateView
from Accounts.forms import LoginForm
from django.conf import settings

# Create your views here.
class HomeView(TemplateView):
    template_name = 'spotify.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['base_url'] = settings.API_BASE_URL
        return context
