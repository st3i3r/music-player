# Generated by Django 3.1.1 on 2021-03-06 01:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('SongAPI', '0006_auto_20210218_0317'),
    ]

    operations = [
        migrations.AddField(
            model_name='song',
            name='shared',
            field=models.BooleanField(default=True),
        ),
    ]
