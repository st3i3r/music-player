from django.shortcuts import render
from django.views.generic import TemplateView
from Accounts.forms import LoginForm


# Create your views here.
class HomeView(TemplateView):
    template_name = 'spotify.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['login_form'] = LoginForm()
        context['user'] = self.request.user

        return context
