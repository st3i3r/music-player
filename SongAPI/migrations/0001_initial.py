# Generated by Django 3.1.1 on 2020-09-29 09:50

import StorageBackend.custom_storage
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Song',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(storage=StorageBackend.custom_storage.MusicStorage(), upload_to='')),
                ('display_title', models.CharField(blank=True, max_length=100)),
                ('artist', models.CharField(max_length=100)),
                ('title', models.CharField(max_length=50)),
                ('duration', models.CharField(blank=True, default='Unknown', max_length=10)),
                ('uploaded_time', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'ordering': ['-uploaded_time'],
            },
        ),
    ]
