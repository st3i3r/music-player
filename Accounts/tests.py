from rest_framework.test import APITestCase
from rest_framework.reverse import reverse as api_reverse
from rest_framework import status
from django.contrib.auth import get_user_model


User = get_user_model()


# Create your tests here.
class UserTestCase(APITestCase):

    def setUp(self):
        user = User.objects.create(username='steier', email='aldersonelliot@gmail.com')
        user.set_password('qviet1997')
        user.save()

        user2 = User.objects.create(username='viet', email='quangviet910@gmail.com')
        user2.set_password('qviet1997')
        user2.save()

    def test_user(self):
        user_count = User.objects.count()
        self.assertEqual(user_count, 2)

    def test_user_login(self):
        data = {
            'username': 'steier',
            'password': 'qviet1997'
        }

        url = api_reverse('accounts:api-login')
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)



