import pafy
from tinytag import TinyTag
import os


def format_time(time):
    minute = time // 60 or 0
    second = time % 60 or 0

    return '{:02d}:{:02d}'.format(minute, second)


def get_file(url):
    video = pafy.new(url)
    audio = video.getbestaudio()
    print(audio)


if __name__ == '__main__':
    song = os.listdir('/home/viet/Music')[0]
    song_abs_path = os.path.join('/home/viet/Music', song)
    tag = TinyTag.get(song_abs_path)
