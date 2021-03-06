import pytube


def format_time(time):
    minute = time // 60 or 0
    second = time % 60 or 0

    return '{:02d}:{:02d}'.format(minute, second)


def download_file(url, dir):
    youtube = pytube.YouTube(url)
    video = youtube.streams.first()
    return video.download(dir)


if __name__ == '__main__':
    pass
