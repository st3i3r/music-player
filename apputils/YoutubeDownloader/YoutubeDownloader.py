import youtube_dl
from tinytag import TinyTag
import os
import pafy


ytdl_audio_opts = {
    'format': 'bestaudio/best',
    'noplaylist': True,
    'postprocessors': [{
        'key': 'FFmpegExtractAudio',
        'preferredcodec': 'm4a',
        'preferredquality': '500',
    }],
    'outtmpl': '/tmp/tmp_music.m4a',
    'quiet': False
}


def format_time(time):
    minute = time // 60 or 0
    second = time % 60 or 0

    return '{:02d}:{:02d}'.format(minute, second)


def get_file(url):
    with youtube_dl.YoutubeDL(ytdl_audio_opts) as ytdl:
        info = ytdl.extract_info(url)
        print(info)



if __name__ == '__main__':
    song = os.listdir('/home/viet/Music')[0]
    song_abs_path = os.path.join('/home/viet/Music', song)
    tag = TinyTag.get(song_abs_path)

    video = pafy.new('https://www.youtube.com/watch?v=IDmjQigyZiE')
    print(video)
    audio = video.getbestaudio()
    print(audio)
    print(audio.url)

