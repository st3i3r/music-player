import {axiosInstance, string_to_slug, setCookie, getCookie, deleteCookie} from './axios.js';
import {API_BASE_URL} from './env.js';

const LIKED_SONGS_THUMBNAIL_URL = 'https://www.wallpaperup.com/uploads/wallpapers/2012/10/12/19094/c1292e4d5ab3004662897fdb3bc3442f-1400.jpg';
const ALL_SONGS_THUMBNAIL_URL = 'https://www.wallpaperup.com/uploads/wallpapers/2016/10/03/1022589/19ced86c47db26a166db19f2a78dd769-1400.jpg';

function getUsername() {
    const username = document.getElementById('username')
    if (username !== null) {
        return username.textContent.trim();
    }
    return null;
}


class Queue {
    constructor() {
        this.queue = [];
    }

    enqueue(song) {
        this.queue.push(song);
    }

    dequeue() {
        if (this.isEmpty()) {
            return "Underflow";
        }
       this.queue.shift();
    }

    isEmpty() {
        return this.queue.length === 0;
    }

    front() {
        if (this.isEmpty()) {
            return null;
        }
        return this.queue[0];
    }

}


class SongQueue {
    constructor(songs) {
        this.normalQueue = new Queue();
        this.randomQueue = new Queue();
        this.randomMode = null;

        this.updateNormalQueue(songs);
        this.updateRandomQueue(songs);
    }

    shuffleSongs(songs) {
        const _songs = [...songs];
        for (let i = _songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random()*(i+1));
            const tmp = _songs[i];
            _songs[i] = _songs[j];
            _songs[j] = tmp;
        }

        return _songs;
    }

    setRandomMode(randomMode) {
        this.randomMode = randomMode;
    }

    updateQueue(songs) {
        this.updateRandomQueue(songs);
        this.updateNormalQueue(songs);
    }

    updateCurrentQueue(songs) {
        if (this.randomMode) {
            this.updateRandomQueue(songs);
        } else {
            this.updateNormalQueue(songs);
        }
    }

    updateNormalQueue(songs) {
        this.normalQueue.queue = [];
        for (let song of songs) {
            this.normalQueue.enqueue(song);
        }
    }

    updateRandomQueue(songs) {
        this.randomQueue.queue = [];
        const randomSongs = this.shuffleSongs(songs);
        for (let song of randomSongs) {
            this.randomQueue.enqueue(song);
        }
    }

    get currentQueue() {
        return this.randomMode ? this.randomQueue : this.normalQueue;
    }

    get currentSongQueue() {
        return this.currentQueue.queue;
    }
}

class PlayerModel {
    constructor() {
        // this.player = document.getElementById('audioPlayer');
        this.player = new Audio();
        this.randomMode = false;
        this.showLyrics = false;
        this.userId = null;

        // All Playlists
        this.playlists = [];
        // Songs in current playlist
        this.songs = [];
        this.songsHistory = [];
        this.currentSong = null;
        this.playlist = null;
    }

    async init() {
        this.songs = [];
        this.songQueue = new SongQueue(this.songs);
        await this.updatePlaylists();
    }

    async getCurrentUser() {
        let user;
        await axiosInstance.get('user/current-user').then(response => user = response.data);

        return user;
    }

    changePlaylist(playlist) {
        this.playlist = playlist;
        this.songs = playlist.songs;
    }

    async likedSongsPlaylist() {
        let playlist = {
            title: 'Liked Songs',
            description: 'Your favorite songs ...',
            slug: 'liked-songs',
            thumbnail: LIKED_SONGS_THUMBNAIL_URL,
            songs: null,
        }
        const songs = await this.getLikedSongs();
        playlist.songs = songs;

        return playlist;
    }

    async getLikedSongs() {
        let songs;
        await axiosInstance.get('song/liked-songs').then(response => {
            if (response.statusText === 'OK') {
                songs = response.data;
            }
        })

        return songs;
    }

    async allSongsPlaylist() {
        let playlist = {
            title: 'All Songs',
            description: 'All songs of all users ...',
            slug: 'all-songs',
            thumbnail: ALL_SONGS_THUMBNAIL_URL,
            songs: [],
        }

        await axiosInstance.get('song/').then(response => {
            if (response.statusText === 'OK') {
                response.data.forEach(song => playlist.songs.push(song));
            }
        })

        return playlist;
    }

    async updatePlaylists() {
        this.playlists = [];
        this.playlists.push(await this.allSongsPlaylist());
        this.playlists.push(await this.likedSongsPlaylist());
        await axiosInstance.get('playlist/').then(response => {
            if (response.status === 200) {
                response.data.forEach(playlist => this.playlists.push(playlist));
            }
        });

        this.userPlaylists = await this.getUserPlaylists() || [];
    }

    sliceNormalQueue() {
        // Slice queue from current playing song to end
        this.songQueue.updateNormalQueue(this.songs);
        const index = this.songQueue.normalQueue.queue.indexOf(this.currentSong);
        for (let i = 0; i <= index; i++) {
            this.songQueue.normalQueue.dequeue();
        }
    }

    updateQueue() {
        this.songQueue.updateCurrentQueue(this.songs);
        this.sliceNormalQueue();
    }

    async getUserPlaylists() {
        let playlists;
        await axiosInstance.get(`playlist/my-playlists/`).then(response => {
           if (response.status === 200) {
                playlists = response.data;
           }
        }).catch(err => playlists = null);

        return playlists;
    }

    async getSongByPk(id) {
        let response = await axiosInstance.get(`song/${id}`)
                                    .then(response => response)
                                    .catch(err => err.response);
        if (response.status === 200) {
            return response.data;
        } else {
            return null;
        }
    }

    // Must be async func
    async updateCurrentSong(id) {
        this.currentSong = this.songs.find(song => song.id === id);
    }

    async getSongsFromPlaylist(playlistName) {
        let response = await axiosInstance.get(`playlist/${string_to_slug(playlistName)}/`).then(response => response.data.songs);
        return response;
    }

    async searchPlaylists(title) {
        let response = [];
        let userPlaylists = (await this.getPlaylists(getUsername())).playlists;
        userPlaylists = userPlaylists.filter(playlist => playlist.title !== 'All Songs' && playlist.title !== 'Liked Songs')
        userPlaylists.forEach(playlist => {
            if (playlist.title.toLowerCase().indexOf(title.toLowerCase()) !== -1) {
                response.push(playlist);
            }
        })
        return response;
    }

    async getLyrics() {
        if (this.currentSong !== undefined) {
            const URL = `song/${this.currentSong.id}/lyrics/`;
            const response = await axiosInstance.get(URL).then(res => res);
            return response;
        } else {
            return {'lyrics': 'NO SONG'};
        }

    }


    async playSong(id) {
        const song = this.songs.find(song => song.id === id);
        this.player.src = song.file;

        this.player.load();

        await this.updateCurrentSong(id);
        this.songQueue.currentSongPk = id;

        this.updateLyricsView();
        this.viewUpdater(this);


        this.player.play();
        this.songsHistory.push(song);
    }

    chooseSong(id) {
        this.playSong(id);
    }

    nextSong() {
        const song = this.songQueue.currentQueue.front();
        this.playSong(song.id);

        // Dequeue
        this.songQueue.currentQueue.dequeue();
    }

    prevSong() {
        if (this.player.currentTime < 10) {
            const currentSong = this.songsHistory.pop();
            const prevSong = this.songsHistory.pop();

            this.songQueue.currentSongQueue.unshift(currentSong);
            this.playSong(prevSong.id);
        } else {
            this.player.currentTime = 0;
        }
    }

    togglePlayPause() {
        this.player.paused ? this.player.play() : this.player.pause();
    }

    // DOMContentLoaded - Set button state according to view
    // TODO: Load from Local Storage
    setupButtonState(lyricsBtn) {
        this.showLyrics = lyricsBtn ? true : false;
    }

    // Setup button state
    setupBtn(lyricsBtn, randomModeBtn, loopModeBtn){
    }

    eventPauseSong(handler) {
        this.player.addEventListener('pause', e => {
            handler();
        })
    }

    eventPlaySong(handler) {
        this.player.addEventListener('playing', e => {
            handler();
        })
    }

    eventWaiting(handler) {
        this.player.addEventListener('waiting', e => {
            handler();
        })
    }

    // Toggle random mode
    toggleRandomMode() {
        this.randomMode = !this.randomMode;
        this.songQueue.setRandomMode(this.randomMode);
        this.updateModeBtnView();
    }

    // Toggle one song loop mode
    toggleLoopMode() {
        this.player.loop = !this.player.loop;
        this.updateModeBtnView();
    }

    toggleRepeatMode() {
        this.repeat = !this.repeat;
        this.updateModeBtnView();
    }

    // Toggle lyrics
    toggleLyrics(btnState) {
        this.showLyrics = btnState;
        if (this.currentSong !== null) {
            this.updateLyricsView();
        }
    }

    // After song is loaded, load duration of song to progressbar
    eventSongLoaded(handler) {
        this.player.addEventListener('canplay', e => {
            handler();
        })
    }

    // If loop mode is set - play next song, otherwise do nothing
    eventSongEnded(handler) {
        this.player.addEventListener('ended', e => {
            if (this.player.loop) {
                this.playSong(this.currentSong.id);
            } else {
                this.nextSong();
            }
        })
    }

    // Update view after changing song
    stateChange(handlerSongView, handlerModeView, handlerLyricsView) {
        this.viewUpdater = handlerSongView;
        this.updateModeBtnView = handlerModeView;
        this.updateLyricsView = handlerLyricsView;
    }

    // Display time, artist, title

    // Change progress bar while song is playing
    eventSongPlaying(handler) {
        this.player.addEventListener('timeupdate', e => {
            handler(this.player);
        })
    }

    // Update current time after seeking progress bar
    updateCurrentTime(value) {
        this.player.currentTime = value;
    }

    // Add song to favorite
    async toggleLikeSong(id) {
        let response;
        await axiosInstance.get(`song/${id}/toggle-like/`).then(res => response = res).catch(err => response = err.response);
        return response;
    }

    // Create new playlist in backend
    async createNewPlaylist(title, description, files, shared) {
        let res;
        const config = {headers: {Authorization: 'JWT ' + getCookie('access_token'), 'Content-Type': 'multipart/form-data'}}
        const URL = `${API_BASE_URL}/playlist/`

        let formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (files.length > 0) {
            formData.append('thumbnail', files[0]);
        }
        formData.append('shared', shared);
        await axios.post(URL, formData, config).then(response => {
            res = response;
        }).catch(err => res = err.response);

        return res;
    }

    checkSongInPlaylist(song, playlistPk) {
        const allSongs = this.playlists.filter(playlist => playlist.title === 'All Songs')[0].songs
        const playlist = this.playlists.find(playlist => playlist.id === playlistPk);
        const isAdded = playlist.songs.find(song);

        return isAdded;
    }

    async addSongToPlaylist(songPk, playlistPk) {
        let response;
        let data = {
            playlist_id: playlistPk
        }
        await axiosInstance.post(`song/${songPk}/add-to-playlist/`, data)
                        .then(res => response = res)
                        .catch(err => response = err.response);
        // this.viewUpdater(this);
        return response;
    }

    async updateCredentials(data) {
        setCookie('access_token', data.access);
        setCookie('refresh_token', data.refresh);
        axiosInstance.defaults.headers['Authorization'] = 'JWT ' + getCookie('access_token');
    }

    handleSuccessLogin(user) {
        this.userId = user.id;
    }
}

export default PlayerModel;