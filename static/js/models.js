import axiosInstance from './axios.js';


function getUsername() {
    const username = document.getElementById('username').textContent.trim();
    return username;
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

function string_to_slug (str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes
    return str;
};


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
        await axiosInstance.get('account/current-user').then(response => user = response.data);

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
            songs: [],
        }

        await axiosInstance.get('song/?liked=True').then(response => {
            if (response.statusText === 'OK') {
                response.data.forEach(song => playlist.songs.push(song));
            }
        })

        return playlist;
    }

    async allSongsPlaylist() {
        let playlist = {
            title: 'All Songs',
            description: 'All songs of all users ...',
            slug: 'all-songs',
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
        this.playlists.push(await this.likedSongsPlaylist());
        this.playlists.push(await this.allSongsPlaylist());
        await axiosInstance.get('playlist/').then(response => {
            response.data.forEach(playlist => this.playlists.push(playlist)) ;
        })

        this.userPlaylists = await this.getUserPlaylists() || [];
    }

    sliceNormalQueue() {
        // Slice queue from current playing song to end
        this.songQueue.updateNormalQueue(this.songQueue.normalQueue.queue);
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
        await axiosInstance.get(`playlist?username=${getUsername()}`).then(response => {
           if (response.statusText === 'OK') {
                playlists = response.data;
           }
        });

        return playlists;
    }

    async getSongByPk(id) {
        const allSongs = await axiosInstance('song/').then(response => response.data);
        return allSongs.find(song => song.id === id);
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
            const artist = this.currentSong.artist;
            const title = this.currentSong.title;
            const URL = `song/lyrics/?artist=${string_to_slug(artist)}&title=${string_to_slug(title)}/`;

            const response = await axiosInstance.get(URL).then(res => res);
            console.log(response)
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
        console.log(this.songsHistory)
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
        this.updateLyricsView();
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
        await axiosInstance.put(`song/${id}/like/`).then(res => response = res);

        return response;
    }

    // Update love state in JS Model
    updateLoveState(id) {
        // Change loved state in Model
        const song = this.getSongByPk(id);
        song.liked = !song.liked;
    }

    // Get cookie
    getCookie(name) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue
    }

    // Upload local file
    uploadLocalFile(form, uploadURL) {
        const xhr = new XMLHttpRequest();

        let data;
        xhr.onload = () => {
            if (xhr.status === 200) {
                data = JSON.parse(xhr.responseText);
            } else {
                data = {
                    'response': null,
                    'success': false,
                    'info': 'UPLOAD FAILED !!!'
                }
            }
        }

        xhr.open('POST', uploadURL, false);

        const csrf_token = this.getCookie('csrftoken');
        xhr.setRequestHeader('X-CSRFToken', csrf_token)
        const formData = new FormData(form)
        xhr.send(formData);

        return data;
    }

    // Send ajax request to upload song
    uploadSong(song, uploadURL) {
        const xhr = new XMLHttpRequest();

        let data;
        xhr.onload = () => {
            if (xhr.status === 200) {
                data = JSON.parse(xhr.responseText);
            } else {
                data = {
                    'response': null,
                    'success': false,
                    'info': 'UPLOAD FAILED !!!'
                }
                console.log('Upload failed');
            }
        }

        xhr.open('POST', uploadURL, false);

        const csrf_token = this.getCookie('csrftoken');
        xhr.setRequestHeader('X-CSRFToken', csrf_token)
        xhr.send(JSON.stringify(song));

        return data;
    }

    // Create new playlist in backend
    async createNewPlaylist(title, description, files) {
        let res;
        const config = {headers: {Authorization: 'JWT ' + localStorage.getItem('access_token'), 'Content-Type': 'multipart/form-data'}}
        const URL = 'http://127.0.0.1:8000/api/playlist/'

        let formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('file', files[0]);
        await axios.post(URL, formData, config).then(response => {
            console.log(response)
            if (response.statusText === 'Created') {
                console.log(response)
                res = response;
            }
        })

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
        await axiosInstance.put(`song/add/${songPk}/${playlistPk}/`).then(res => response=res);
        // this.viewUpdater(this);
        return response;
    }
}

export default PlayerModel;