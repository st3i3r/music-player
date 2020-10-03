from django.db import models
from django.contrib.auth.models import AbstractUser
from phonenumber_field.modelfields import PhoneNumberField


# Create your models here.
class VieUser(AbstractUser):
    GENDER_CHOICE = [('1', 'Male'), ('0', 'Female')]

    profile_picture = models.ImageField(upload_to='user-profile', blank=True, null=True)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True, choices=GENDER_CHOICE)
    phone = PhoneNumberField(null=True, blank=True, unique=True)

    @property
    def full_name(self):
        return ' '.join([self.first_name, self.last_name])

    @full_name.setter
    def full_name(self, value):
        pass

    def __str__(self):
        return self.username

    def get_gender(self):
        return 'Male' if self.gender == '1' else 'Female'

