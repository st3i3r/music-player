'use strict';

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

        // All Playlists
        this.playlists = [];
        // Songs in current playlist
        this.songs = [];
        this.songsHistory = [];
        this.currentSong = null;
        this.playlist = null;
    }

    async init() {
        await this.updatePlaylists();
        this.songs = [];
        this.songQueue = new SongQueue(this.songs);

        this.userPlaylists = getUsername() !== 'Guest' ? (await this.getPlaylists(getUsername())).playlists : [];
    }

    changePlaylist(playlist) {
        this.playlist = playlist;
        this.songs = playlist.songs;
    }

    async likedSongsPlaylist() {
        const playlist = {
            title: 'Liked Songs',
            slug: 'liked-songs',
            description: 'My favourite songs. Enjoy it !!!',
            songs: (await this.getSongsFromPlaylist('liked-songs')).songs
        }

        return playlist;
    }

    async allSongsPlaylist() {
        const playlist = {
            title: 'All Songs',
            slug: 'all-songs',
            description: 'All songs of all users.',
            songs: (await this.getSongsFromPlaylist('all-songs')).songs
        }

        return playlist;
    }

    async updatePlaylists() {
        this.playlists = [];
        this.playlists.push(await this.likedSongsPlaylist());
        this.playlists.push(await this.allSongsPlaylist());

        const playlists = (await this.getPlaylists('all')).playlists;
        playlists.forEach(playlist => {
            this.playlists.push({
                title: playlist.title,
                description: playlist.description,
                slug: playlist.slug,
                thumbnail: playlist.thumbnail,
                songs: playlist.songs
            })
        })
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

    async getPlaylists(username) {
        if (username === 'all') {
            username = null
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'api/playlists/', false);
        let response;
        xhr.onload = () => {
            if (xhr.status === 200) {
                response = JSON.parse(xhr.responseText);
            } else {
                response = {
                    info: 'Failed to fetch playlists !!!'
                }
            }
        }

        const csrf_token = this.getCookie('csrftoken');
        xhr.setRequestHeader('X-CSRFToken', csrf_token)

        const data = {
            username: username
        }
        xhr.send(JSON.stringify(data));

        return response;
    }

    async getSongByPk(pk) {
        const allSongs = (await this.getSongsFromPlaylist('All Songs')).songs;
        return allSongs.find(song => song.pk === pk);
    }

    // Must be async func
    async updateCurrentSong(pk) {
        this.currentSong = this.songs.filter(song => song.pk === pk)[0];
    }

    async getSongsFromPlaylist(playlistName) {
        let response;
        await fetch(`api/playlist/${string_to_slug(playlistName)}/`).then(res => res.json())
            .then(data => {
                if (data.success) {
                    response = data;
                }
                response = data;
                })
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
            const URL = `lyrics/${string_to_slug(artist)}/${string_to_slug(title)}/`;

            const response = await fetch(URL);
            return response.json();
        } else {
            return {'lyrics': 'NO SONG'};
        }

    }


    async playSong(pk) {
        const song = this.songs.find(song => song.pk === pk);
        this.player.src = song.url;
        this.player.load();

        await this.updateCurrentSong(pk);
        this.songQueue.currentSongPk = pk;

        this.updateLyricsView();
        this.viewUpdater(this);

        this.player.play();

        this.songsHistory.push(song);
    }

    chooseSong(pk) {
        this.playSong(pk);
    }

    nextSong() {
        const song = this.songQueue.currentQueue.front();
        console.log(this.songQueue.currentQueue)
        this.playSong(song.pk);

        // Dequeue
        this.songQueue.currentQueue.dequeue();
    }

    prevSong() {
        if (this.player.currentTime < 10) {
            const currentSong = this.songsHistory.pop();
            const prevSong = this.songsHistory.pop();

            this.songQueue.currentQueue.enqueue(currentSong);
            this.playSong(prevSong.pk);
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
    toggleLoveSong(pk) {
        const xhr = new XMLHttpRequest();

        let data;
        xhr.onload = () => {
            if (xhr.status === 200) {
                data = JSON.parse(xhr.responseText);
            } else {
                console.log('Love failed');
            }
        }

        xhr.open('GET', `api/like/${pk}/`, false);
        xhr.send();

        return data
    }

    // Update love state in JS Model
    updateLoveState(pk) {
        // Change loved state in Model
        const song = this.getSongByPk(pk);
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
    createNewPlaylist(form, URL) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', URL, false);

        let response;
        xhr.onload = () => {
            if (xhr.status === 200) {
                response = JSON.parse(xhr.responseText);
            } else {
                response = {
                    'success': false,
                    'info': 'Request failed.'
                }
            }
        }
        const formData = new FormData(form);
        const csrf_token = this.getCookie('csrftoken');

        xhr.setRequestHeader('X-CSRFToken', csrf_token);
        xhr.send(formData)

        return response;
    }

    checkSongInPlaylist(song, playlistTitle) {
        const allSongs = this.playlists.filter(playlist => playlist.title === 'All Songs')[0].songs
        const playlist = this.playlists.find(playlist => playlist.title === playlistTitle);
        const isAdded = playlist.songs.find(song);

        return isAdded;
    }

    addSongToPlaylist(songPk, playlistTitle) {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'api/playlist/add-song/', false)

        let response;
        xhr.onload = () => {
            if (xhr.status === 200) {
                response = JSON.parse(xhr.responseText);
            } else {
                console.log('Failed to add song to playlist');
            }
        }

        const data = {
            song_pk: songPk,
            playlist_title: playlistTitle
        }

        const csrf_token = this.getCookie('csrftoken');
        xhr.setRequestHeader('X-CSRFToken', csrf_token)
        xhr.send(JSON.stringify(data))

        this.viewUpdater(this);

        return response;
    }
}



///////////////////
class RootView {
    constructor() {
        this.state = null;
        this.setupVars();

        this.messageQueue = {
            messages: [],
            currentMessage: null
        }
    }

    addMessage(info) {
        if (info.primary) {
            const found = this.messageQueue.messages.find(info => info.primary === true);
            if (found !== undefined) {
                this.removeMessage(info);
            }
        }
        this.messageQueue.messages.push(info);
        this.infoUpdater(info);
    }

    removeMessage(info) {
        const index = this.messageQueue.messages.indexOf(info);
        this.messageQueue.messages.splice(index, 1);
    }

    eventAddMessage(updater) {
        this.infoUpdater = updater;
    }

    changeState(state) {
        this.state = state;
        this.updater();
    }

    eventStateChange(updater) {
       this.updater = updater;
    }

    setupVars() {
        this.navBar = document.getElementById('navBar');
        this.playlistBtns = document.getElementsByClassName('btn-playlist');
        this.uploadLinkBtn = document.getElementById('uploadLinkBtn');
        this.uploadFileBtn = document.getElementById('uploadFileBtn');
        this.newPlaylistBtn = document.getElementById('newPlaylistBtn');
        this.lyricsBtn = document.getElementById('lyricsCheckbox');
        this.displayPlaylistBtn = document.getElementById('playlists');

        this.loginForm = document.getElementById('loginForm');

    }

    hideLoadingState() {
        document.getElementById('loading').style.display = 'none';
    }

    showLoadingState() {
        document.getElementById('loading').style.display = 'block';
    }

    showInfo(msg, timeout) {
        // Show info
        const info = document.getElementById('info');
        info.textContent = msg;

        if (timeout !== -1) {
            setTimeout(() => info.textContent = '', timeout)
        }
    }

    // Events
    eventDOMContentLoaded(handler) {
        window.addEventListener('DOMContentLoaded', (e) => {
            handler();
        })
    }

    eventUploadLocalFile(handler) {
        this.uploadFileBtn.addEventListener('click', e => {
            $('#uploadFileModal').modal('hide');
            e.preventDefault();
            this.showLoadingState();

            const uploadURL = this.uploadFileBtn.getAttribute("data-upload-url");
            const form = document.getElementById('uploadFile');

            handler(form, uploadURL);
            this.hideLoadingState();
        })
    }

    eventUploadSong(handler) {
        this.uploadLinkBtn.addEventListener('click', e => {
            $('#uploadFormModal').modal('hide');
            e.preventDefault();
            document.getElementById('loading').style.display = 'block';

            const uploadURL = this.uploadLinkBtn.getAttribute("data-upload-url");

            const displayTitle = document.getElementById('formDisplayTitle').value;
            const title = document.getElementById('formTitle').value;
            const artist = document.getElementById('formArtist').value;
            const url = document.getElementById('formUrl').value;

            document.getElementById('uploadLink').reset();

            const songInfo = {
                'display_title': displayTitle,
                'title': title,
                'artist': artist,
                'url': url
            }
            handler(songInfo, uploadURL);
        })
    }

    eventBrowsePlaylists(handler) {
        this.displayPlaylistBtn.addEventListener('click', e => {
            handler();
        })
    }

    eventLogin(handler) {
            document.getElementById('loginBtn').addEventListener('click', e => {
                $("loginModal").modal('hide');
                e.preventDefault();
                const loginURL = document.getElementById('loginBtn').getAttribute('data-url');
                const form = document.getElementById('loginForm');
                handler(form, loginURL);
            })
    }

    eventToggleLyrics(handler) {
        this.lyricsBtn.addEventListener('change', e => {
            let isChecked = this.lyricsBtn.checked;
            handler(isChecked);
        })
    }

    eventNewPlaylist(handler) {
        this.newPlaylistBtn.addEventListener('click', e => {
            $('#newPlaylistModal').modal('hide');
            e.preventDefault();
            this.showLoadingState();

            const URL = this.newPlaylistBtn.getAttribute('data-url');
            const form = document.getElementById('newPlaylistForm');
            handler(form, URL);
            this.hideLoadingState();
        })
    }

    eventChoosePlaylist(handler) {
        Array.from(this.playlistBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                const playlist = e.target.value;
                handler(playlist);
            })
        })
    }
}


class PlayerState {
    constructor() {
        this.initUI();
        this.setupVars();
    }

    changeState(state) {
        this.state = state;

        // Bind events after change
        if (state.stateName === 'browse') {
            this.browseStateUpdater();
        } else {
            this.playlistStateUpdater();
        }
    }

    eventPlaylistStateChange(updater) {
        this.playlistStateUpdater = updater;
    }

    eventBrowseStateChange(updater) {
        this.browseStateUpdater = updater;
    }

    initUI() {
        const container = document.getElementById('playerWrapper')
        container.innerHTML =  `
                <!-- Space -->
                <div id="lyricsContainer" class="d-block m-5 overflow-auto text-center" style="height: 75%;"></div>

                <!-- Audio controller wrapper -->
                <div id="control-bar" class="w-100 mb-md-5 d-flex flex-column justify-content-center position-relative">
                     <div class="mb-md-3 d-flex flex-row justify-content-center align-items-center" id="progress-bar-wrapper">
                         <span id="startTime" class="ml-md-5 mr-2"></span>
                         <input type="range" min="0" max="" id="progressBar" class="w-75">
                         <span id="endTime" class="mr-md-5 ml-2"></span>
                     </div>
                     <div class="mb-md-4 mb-md-4 mx-5 text-center" id="display-container" style="min-height:5.5rem;">
                         <div class="font-weight-bold mb-2" id="displayTitle"></div>
                         <div class="text-muted h5" id="displayArtist"></div>
                     </div>
                     <div class="d-flex flex-row justify-content-around align-items-center" id="buttonContainer">
                         <i id="randomModeBtn" class="fas fa-random"></i>
                         <div class="d-flex flex-row justify-content-center align-items-center" role="group" style="cursor:pointer">
                             <i class="fas fa-chevron-circle-left mx-3" id="prevBtn"></i>
                             <i class="fas fa-play-circle mx-3" id="playPauseBtn"></i>
                             <i class="fas fa-chevron-circle-right mx-3" id="nextBtn"></i>
                         </div>
                         <i id="loopModeBtn" class="fas fa-recycle"></i>
                     </div>
                </div>
            `;
        document.getElementById('progressBar').value = 0;
    }

    setupVars() {
        this.progressBar = document.getElementById('progressBar')
        this.startTime = document.getElementById('startTime');
        this.endTime = document.getElementById('endTime');

        this.lyricsContainer = document.getElementById('lyricsContainer');
        this.displayTitle = document.getElementById('displayTitle');
        this.displayArtist = document.getElementById('displayArtist');

        this.nextBtn = document.getElementById('nextBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');

        this.randomModeBtn = document.getElementById('randomModeBtn');
        this.loopModeBtn = document.getElementById('loopModeBtn');

        this.wrapperUI = document.getElementById('wrapper');
    }


    updateModeBtnView(randomMode, loopMode, repeatMode) {
        // Change randomModeBtn to its state
        if (randomMode) {
            this.randomModeBtn.classList.add('active');
        } else {
            this.randomModeBtn.classList.remove('active');
        }

        // Change loopBtn to its state
        if (loopMode) {
            this.loopModeBtn.classList.add('active');
        } else {
            this.loopModeBtn.classList.remove('active');
        }

        if (repeatMode) {
        }
    }

    pauseState() {
        this.playPauseBtn.classList.remove('fa-pause-circle');
        this.playPauseBtn.classList.add('fa-play-circle');
    }

    playState() {
        this.playPauseBtn.classList.remove('fa-play-circle');
        this.playPauseBtn.classList.add('fa-pause-circle');
    }

    // Remove active class after song ended itself
    endedState() {
        this.songs.forEach(song => song.classList.remove('active'));
    }

    songLoaded(playerModel) {
        this.progressBar.max = playerModel.player.duration;
        this.endTime.textContent = formatTime(playerModel.player.duration);

        this.displayTitle.textContent = playerModel.currentSong.display_title.toUpperCase();
        this.displayArtist.textContent = playerModel.currentSong.artist;
    }

    updateProgressBar(player) {
        this.startTime.textContent = formatTime(player.currentTime);
        this.progressBar.value = player.currentTime;
    }

    eventNextSong(handler) {
        this.nextBtn.addEventListener('click', e => {
            handler();
        })
    }

    eventPrevSong(handler) {
        this.prevBtn.addEventListener('click', e => {
            handler();
        })
    }

    eventTogglePlayPause(handler) {
        this.playPauseBtn.addEventListener('click', e => {
            handler();
        })
    }

    eventSeekProgressBar(handler) {
        this.progressBar.addEventListener('change', e => {
            handler(this.progressBar.value);
        })
    }

    eventToggleRandomMode(handler) {
        this.randomModeBtn.addEventListener('click', e => {
            handler();
        })
    }

    eventToggleLoopMode(handler) {
        this.loopModeBtn.addEventListener('click', e => {
            e.target.classList.add('active');
            handler();
        })
    }

    showLyricsMsg(msg) {
        this.lyricsContainer.innerHTML = msg;
    }

    showLyrics(lyrics) {
        this.lyricsContainer.innerText = lyrics;
    }
}


class PlaylistState {
    constructor(playlist) {
        this.playlist = playlist;
        this.stateName = playlist.title;

        // Initiate interface
        this.initUI();

        // Setup UI vars
        this.setupVars();

        // Setup default action state
        this.playlistActionState();
    }

    playlistActionState() {
        Array.from(this.addToQueueBtns).forEach(btn => {
            btn.style.display = 'block';
        })
        Array.from(this.removeFromQueueBtns).forEach(btn => {
            btn.style.display = 'none';
        })
    }

    queueActionState() {
        Array.from(this.addToQueueBtns).forEach(btn => {
            btn.style.display = 'none';
        })
        Array.from(this.removeFromQueueBtns).forEach(btn => {
            btn.style.display = 'block';
        })
    }

    changeState(playlist) {
        this.playlist = playlist;
        this.initUI();
    }

    initUI() {
        const container = document.getElementById('container');
        container.innerHTML = '';
        container.appendChild(this.headerDiv);
        container.appendChild(this.songTable());
        this.setSongs(this.playlist.songs);
    }

    setupVars() {
        this.songListUI = document.getElementsByClassName('song');
        this.containerUI = document.getElementById('container');
        this.wrapperUI = document.getElementById('wrapper');

        this.playlistSearchFormsUI = document.getElementsByClassName('playlist-search-form');
        this.filterBarUI = document.getElementById('filterBar');
        this.displayQueueBtnUI = document.getElementById('displayQueue');
        this.displayPlaylistBtn = document.getElementById('backIcon');

        this.addToQueueBtns = document.getElementsByClassName('btn-add-to-queue');
        this.removeFromQueueBtns = document.getElementsByClassName('btn-remove-from-queue');

        this.shuffleBtnUI = document.getElementById('shuffleBtn');
    }


    actionDropdownHTML(pk) {
        const dropdownBtn = `<i class="fas fa-plus-circle" id="dropdownMenuButton${pk}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></i>
                              <div class="dropdown-menu" aria-labelledby="dropdownMenuButton${pk}">
                                    <a class="dropdown-item py-2" data-toggle="modal" data-target="#playlistsModal${pk}" href="#">Add To Playlist</a>
                                    <a class="dropdown-item py-2 btn-add-to-queue" href="#" data-pk=${pk}>Add To Play Queue</a>
                                    <a class="dropdown-item py-2 btn-remove-from-queue" href="#" data-pk=${pk}>Remove From Play Queue</a>
                                    <a class="dropdown-item py-2" href="#">Something else</a>
                              </div>

                                <div class="modal" id="playlistsModal${pk}" tabindex='-1' role="dialog" aria-labelledby="playlistModalLabel${pk}" aria-hidden="true">
                                    <div class="modal-dialog modal-dialog-centered" role="document">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title" id="playlistModalLabel${pk}">Add To Playlist</h5>
                                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                    <span aria-hidden="true">&times;</span>
                                                </button>
                                            </div>
                                            <div class="modal-body">
                                                <form id="playlistsSearchForm${pk}" class='playlist-search-form mb-4' data-song-pk='${pk}' enctype="text/plain">
                                                    <input type="text" class="form-control w-100" placeholder='Search for playlist ...'/>
                                                </form>
                                                <div class="d-flex flex-column w-100 playlist-container-modal" id="playlistContainerModal${pk}">
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                              `;
        return dropdownBtn;
    }

    filterBar() {
        const form = document.createElement('form');
        form.className = 'form-inline justify-content-center align-items-center my-2 w-100';

        const inputGroupDiv = document.createElement('div');
        inputGroupDiv.className = 'input-group text-center';

        const input = document.createElement('input');
        input.className = 'form-control bg-white border-right-0 w-100';
        input.id = 'filterBar';
        input.type = 'text';
        input.onkeypress = 'if (event.keyCode == 13) return false;'
        input.placeholder = 'Filter songs' ;

        inputGroupDiv.appendChild(input);
        form.appendChild(inputGroupDiv);

        return form;
    }

    shuffleButton(playlistName) {
        // Crreate Shuffle Btn
        const shuffleBtn = document.createElement('input')
        shuffleBtn.type = 'button'
        shuffleBtn.className = 'btn btn-green p-2 my-2 w-100';
        shuffleBtn.id = 'shuffleBtn';
        shuffleBtn.value = 'SHUFFLE PLAY';
        shuffleBtn.playlistName = playlistName;

        return shuffleBtn;
    }

    displayQueueButton() {
        const displayQueue = document.createElement('div');
        displayQueue.className = 'custom-control custom-switch';

        displayQueue.innerHTML = `
                              <input type="checkbox" class="custom-control-input mr-2" id="displayQueue" />
                              <label for="displayQueue" class="custom-control-label">Play Queue</label>
                                `;
        return displayQueue;
    }

    get headerDiv() {
        const header = document.createElement('div');
        header.className = 'd-flex flex-md-row justify-content-between align-items-end';

        const leftItems = document.createElement('div');
        leftItems.className = 'd-flex flex-md-column justify-content-center align-items-start w-25';

        const middleItems = document.createElement('div');
        middleItems.className = 'd-flex flex-md-column justify-content-between align-items-center overflow-hidden';
        middleItems.style.width = "40%";

        const rightItems = document.createElement('div');
        rightItems.className = 'd-flex flex-md-column justify-content-between align-items-center w-25';

        const playlistDiv = document.createElement('div');
        playlistDiv.className = 'd-flex w-100 flex-row align-items-end mb-2 w-50';

        // Icon
        const img = document.createElement('img');
        img.src = 'https://django-blog-910-prod.s3.eu-central-1.amazonaws.com/media/img/music.webp'
        img.style.width = '10rem';
        img.id = 'backIcon';
        img.style.cursor = 'pointer';

        // Playlist card
        const playlistThumbnail = document.createElement('img')
        playlistThumbnail.className = 'card-img-top mx-2';
        playlistThumbnail.style.width = '5rem';
        playlistThumbnail.style.height = '5rem';
        playlistThumbnail.style.objectFit = 'cover';
        if (this.playlist.thumbnail) {
            playlistThumbnail.setAttribute('src', this.playlist.thumbnail);
        } else {
            playlistThumbnail.setAttribute('src', "https://www.wallpaperup.com/uploads/wallpapers/2013/08/13/133513/307948ed064a3ebb40f16da3fffa2200.jpg");
        }

        const playlistInfo = document.createElement('div');
        playlistInfo.className = 'mx-2 d-flex flex-column align-items-start overflow-hidden'

        const playlistTitle = document.createElement('div');
        playlistTitle.className = 'font-weight-bold h4 mb-1';
        playlistTitle.textContent = this.playlist.title.toUpperCase();

        const playlistDescription = document.createElement('div');
        playlistDescription.className = 'h6 mb-0 text-gray text-left';
        playlistDescription.textContent = this.playlist.description;

        playlistInfo.appendChild(playlistTitle);
        playlistInfo.appendChild(playlistDescription);

        playlistDiv.appendChild(playlistThumbnail);
        playlistDiv.appendChild(playlistInfo);

        leftItems.appendChild(img);


        rightItems.appendChild(this.displayQueueButton());
        rightItems.appendChild(this.filterBar());

        middleItems.appendChild(playlistDiv);
        middleItems.appendChild(this.shuffleButton());

        header.appendChild(leftItems);
        header.appendChild(middleItems);
        header.appendChild(rightItems);

        return header;
    }

    songTable() {
        const table = document.createElement('table');
        table.className = 'table table-borderless';

        const thead = document.createElement('thead');

        const thIcon = document.createElement('th');

        const thTitle = document.createElement('th');
        thTitle.textContent = 'Title';

        const thArtist = document.createElement('th');
        thArtist.textContent = 'Artist';

        const thDuration = document.createElement('th');
        thDuration.textContent = 'Duration';

        const thAction = document.createElement('th');
        thAction.className = 'text-center';
        thAction.innerHTML = 'Action';

        const tbody = document.createElement('tbody');
        tbody.id = 'songList';

        thead.appendChild(thIcon);
        thead.appendChild(thTitle);
        thead.appendChild(thArtist);
        thead.appendChild(thDuration);
        thead.appendChild(thAction);

        table.appendChild(thead);
        table.appendChild(tbody);

        return table;
    }

    songList() {
        const table = document.createElement('table');
        table.className = 'table table-borderless';

        const thead = document.createElement('thead');

        const thIcon = document.createElement('th');

        const thTitle = document.createElement('th');
        thTitle.textContent = 'Title';

        const thArtist = document.createElement('th');
        thArtist.textContent = 'Artist';

        const thDuration = document.createElement('th');
        thDuration.textContent = 'Duration';

        const thAction = document.createElement('th');
        thAction.className = 'text-center';
        thAction.innerHTML = 'Action';

        const tbody = document.createElement('tbody');
        tbody.className = 'fade-in is-paused';
        tbody.id = 'songList';

        thead.appendChild(thIcon);
        thead.appendChild(thTitle);
        thead.appendChild(thArtist);
        thead.appendChild(thDuration);
        thead.appendChild(thAction);

        table.appendChild(thead);
        table.appendChild(tbody);

        return table;
    }

    setSongs(songs) {
        document.getElementById('songList').innerHTML = '';
        songs.forEach(song => this.addSongToTable(song));
    }

    addSongToTable(song, reverse=false) {
        const row = document.createElement('tr');
        row.className = 'song';
        row.style.opacity = 0;
        row.id = song.pk;
        row.setAttribute('data-pk', song.pk)

        const th = document.createElement('th');
        th.scope = 'row';
        th.className = 'text-center align-middle';

        // Check loved song
        if (song.liked) {
            th.innerHTML = '<i class="fas fa-heartbeat active"></i>';
        } else {
            th.innerHTML = '<i class="fas fa-heartbeat"></i>';
        }

        const tdTitle = document.createElement('td');
        tdTitle.className = 'align-middle';

        // Check if displayTitle
        if (song.display_title === undefined || song.display_title === '') {
            tdTitle.innerHTML = song.title;
        } else {
            tdTitle.innerHTML = song.display_title;
        }

        const tdArtist = document.createElement('td');
        tdArtist.className = 'align-middle';
        tdArtist.innerHTML = song.artist;

        const tdDuration = document.createElement('td');
        tdDuration.className = 'align-middle';
        tdDuration.innerHTML = song.duration;

        const tdAction = document.createElement('td');
        tdAction.className = 'align-middle d-flex justify-content-center';
        tdAction.innerHTML = this.actionDropdownHTML(song.pk);

        row.appendChild(th);
        row.appendChild(tdTitle);
        row.appendChild(tdArtist);
        row.appendChild(tdDuration);
        row.appendChild(tdAction);

        const songList = document.getElementById('songList');
        if (reverse === true) {
            songList.insertAdjacentElement('afterbegin', row);
        } else {
            songList.insertAdjacentElement('beforeend', row);
        }

        fadeIn(row);
    }

    clearSongs() {
        document.getElementById('songList').innerHTML = '';
    }

    updateView(playerModel) {
        // Display info bar
        const songCount = playerModel.songs.length;
        var totalDuration = 0;

        playerModel.songs.forEach(song => {
            var min = parseInt(song.duration.split(':')[0]);
            var sec = parseInt(song.duration.split(':')[1]);
            totalDuration += min*60 + sec;
        })

        info = `${songCount} songs, total ${formatTime(totalDuration)}`;
    }


    highlightSong(currentSong) {
        if (currentSong === null) {
            return false;
        }
        // Remove class .active
        Array.from(this.songListUI).forEach(song => {
            song.classList.remove('active');
        })

        // Add class .active
        const song = Array.from(this.songListUI).filter(song => parseInt(song.id) === currentSong.pk)[0];
        song.classList.add('active');
    }

    clearPlaylistsFilterModal(songPk) {
        const filteredPlaylistContainer = document.getElementById(`playlistContainerModal${songPk}`);
        if (filteredPlaylistContainer !== null) {
            filteredPlaylistContainer.innerHTML = '';
        }
    }

    async addPlaylistToModal(playlist, song, isAdded) {
        const filteredPlaylistContainer = document.getElementById(`playlistContainerModal${song.pk}`);
        // Playlist card
        const playlistDiv = document.createElement('div');
        playlistDiv.className = 'd-flex w-100 flex-row align-items-center mb-2 w-50 playlist-card';
        playlistDiv.style.opacity = 0;

        const playlistThumbnail = document.createElement('img')
        playlistThumbnail.className = 'card-img-top mx-2';
        playlistThumbnail.style.width = '5rem';
        playlistThumbnail.style.height = '5rem';
        playlistThumbnail.style.objectFit = 'cover';
        if (playlist.thumbnail) {
            playlistThumbnail.setAttribute('src', playlist.thumbnail);
        } else {
            playlistThumbnail.setAttribute('src', "https://www.wallpaperup.com/uploads/wallpapers/2013/08/13/133513/307948ed064a3ebb40f16da3fffa2200.jpg");
        }

        const playlistInfo = document.createElement('div');
        playlistInfo.className = 'mx-2 d-flex flex-column align-items-start'

        const playlistTitle = document.createElement('div');
        playlistTitle.className = 'font-weight-bold h5';
        playlistTitle.textContent = playlist.title.toUpperCase();

        const playlistDescription = document.createElement('div');
        playlistDescription.className = 'h6 mb-0 text-gray';
        playlistDescription.textContent = 'This is a description of a playlist. All songs of all users.'

        const addBtn = document.createElement('input');
        addBtn.type = 'button';
        addBtn.setAttribute('data-song-pk', song.pk)
        addBtn.setAttribute('data-playlist-title', playlist.title);
        addBtn.className = `btn btn-green px-4 btn-add-to-playlist-${song.pk}`;
        addBtn.value = 'Add';
        addBtn.style.minWidth = '5rem';

        if (isAdded) {
            addBtn.setAttribute('disabled', true);
            addBtn.value = 'Added';
            addBtn.classList.remove('btn-green');
            addBtn.classList.add('btn-light');
        }

        playlistInfo.appendChild(playlistTitle);
        playlistInfo.appendChild(playlistDescription);

        playlistDiv.appendChild(playlistThumbnail);
        playlistDiv.appendChild(playlistInfo);
        playlistDiv.appendChild(addBtn);

        filteredPlaylistContainer.appendChild(playlistDiv);
        fadeIn(playlistDiv);
    }

    updateLoveIcon(pk, liked) {
        const songs = Array.from(this.songListUI);
        const song = songs.filter(song => parseInt(song.id) === pk )[0];
        if (liked) {
            song.firstElementChild.firstElementChild.classList.add('active');
        } else {
            song.firstElementChild.firstElementChild.classList.remove('active');
            if (this.stateName === 'Liked Songs') {
                fadeOut(song);
            }
        }
    }


    // Events
    eventChooseSong(handler) {
        this.wrapperUI.addEventListener('click', (e) => {
            if (e.target.parentElement.className === 'song' && e.target.tagName === 'TD') {
                const song = e.target.parentElement;
                const pk = parseInt(song.id);
                handler(pk);
            }
        })
    }

    eventToggleLoveSong(handler) {
        this.wrapperUI.addEventListener('click', e => {
            if (e.target.classList.contains('fa-heartbeat')) {
                const song = e.target.parentElement.parentElement;
                const pk = parseInt(song.id);
                fadeIn(e.target);
                handler(pk);
            }
        })
    }

    eventAddToQueue(handler) {
        Array.from(this.addToQueueBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                const pk = parseInt(e.target.getAttribute('data-pk'));
                handler(pk);
            })
        })
    }

    eventRemoveFromQueue(handler) {
        Array.from(this.removeFromQueueBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                const pk = parseInt(e.target.getAttribute('data-pk'));
                console.log(pk);
                handler(pk);
            })
        })
    }

    eventBrowsePlaylists(handler) {
        this.displayPlaylistBtn.addEventListener('click', e => {
            handler();
        })
    }

    eventFilterSongs(handler) {
        this.filterBarUI.addEventListener('keyup', e => {
            const value = this.filterBarUI.value.toLowerCase();
            handler(value);
        })
    }

}


class BrowseState {
    constructor(playlists) {
        this.playlists = playlists;
        this.stateName = 'browse';

        this.initUI();
        this.setupVars();
    }

    initUI() {
        const container = document.getElementById('container')
        container.innerHTML = '';
        const playlistContainer = this.playlistContainer;
        this.playlists.forEach(playlist => {
            // With opacity = 0;
            const playlistCard = this.createPlaylistCard(playlist);
            playlistContainer.insertAdjacentElement('beforeend', playlistCard);
            fadeIn(playlistCard);
        })
        container.appendChild(playlistContainer);
    }

    setupVars() {
        this.playlistBtns = document.querySelectorAll('.btn.btn-playlist');
    }

    get playlistContainer() {
        const plContainer = document.createElement('div');
        plContainer.className = 'playlist-container p-3';
        plContainer.id = 'playlistContainer';

        return plContainer;
    }

    createPlaylistCard(playlist) {
        const playlistCard = document.createElement('div');
        playlistCard.className = 'card';
        playlistCard.opacity = 0;

        const cardImg = document.createElement('img')
        cardImg.className = 'card-img-top';

        if (playlist.thumbnail) {
            cardImg.setAttribute('src', playlist.thumbnail);
        } else {
            cardImg.setAttribute('src', "https://www.wallpaperup.com/uploads/wallpapers/2013/08/13/133513/307948ed064a3ebb40f16da3fffa2200.jpg");
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body d-flex flex-column justify-content-end';

        const cardTitle = document.createElement('h6');
        cardTitle.className = 'card-title font-weight-bold';
        cardTitle.textContent = playlist.title;

        const cardText = document.createElement('p');
        cardText.className = 'card-text text-gray';
        cardText.textContent = playlist.description;

        const playBtn = document.createElement('input');
        playBtn.type = 'button';
        playBtn.className = 'btn btn-playlist btn-green';
        playBtn.value = playlist.title;
        playBtn.id = playlist.id;

        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(playBtn);

        playlistCard.appendChild(cardImg);
        playlistCard.appendChild(cardBody);

        return playlistCard;
    }

    eventChoosePlaylist(handler) {
        Array.from(this.playlistBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                const playlist = e.target.value;
                handler(playlist);
            })
        })
    }
}

class PlayerController {
    constructor(model, rootView) {
        this.playerModel = model;
        this.rootView = rootView;
        this.handlerInitRootView();
        this.rootView.changeState(new PlayerState);
        this.playerState = this.rootView.state;


        this.rootView.eventDOMContentLoaded(this.handlerDOMContentLoaded);
        this.playerModel.stateChange(this.handlerSongChange, this.handlerModeBtnChange, this.handlerLyricsChange);
        // Update view when there is change in model
        this.playerModel.eventSongLoaded(this.handlerSongLoaded);
        // Update progress bar while song is playing
        this.playerModel.eventSongPlaying(this.handlerSongPlaying);
        // Event play song
        this.playerModel.eventPlaySong(this.handlerPlayState);
        // Event paused song
        this.playerModel.eventPauseSong(this.handlerPauseState);
        // Event ended song
        this.playerModel.eventSongEnded(this.handlerEndedState);
        // Event song loading
        this.playerModel.eventWaiting(this.handlerWaiting);
        /*



        // Event ajax upload song using youtube-url
        this.rootView.eventUploadSong(this.handlerUploadSong);
        // Get all loved songs and display
        // Search playlist in modal




        // Events for playlist cards

        // TODO: Check if modal is focused or filterBar is focused
        document.getElementById('player-container').onkeypress = e => {
            if (e.keyCode === 32) {
                e.preventDefault();
                this.playerModel.togglePlayPause();
            }
        }
        */
    }

    handlerDOMContentLoaded = async () => {
        await this.playerModel.init();
        this.playerState.changeState(new BrowseState(this.playerModel.playlists));
    }

    handlerInitRootView = async () => {
        this.rootView.eventStateChange(this.handlerInitPlayerState);
        this.rootView.eventAddMessage(this.handlerShowMessage);
        // Login
        this.rootView.eventLogin(this.handlerLogin);
        this.rootView.eventChoosePlaylist(this.handlerChoosePlaylist)
        // Upload local song
        this.rootView.eventUploadLocalFile(this.handlerUploadLocalFile);
        // Event toggle lyrics checkbox
        this.rootView.eventToggleLyrics(this.handlerToggleLyrics);
        // Create new playlist
        this.rootView.eventNewPlaylist(this.handlerNewPlaylist);
        // Browse playlist
        this.rootView.eventBrowsePlaylists(this.handlerBrowsePlaylist);
    }

    sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    handlerShowMessage = async (info) => {
        if (this.rootView.messageQueue.currentMessage === null || this.rootView.messageQueue.currentMessage.primary === true) {
            if (info.primary) {
                await this.handlerPrimaryInfo(info);
            } else {
                await this.handlerSecondaryInfo(info);

                const primaryInfo = this.rootView.messageQueue.messages.find(info => info.primary === true);
                if (primaryInfo !== undefined) {
                    await this.handlerPrimaryInfo(primaryInfo);
                }
            }
        } else {
            // If current message is not primary, delete it
            while (this.rootView.messageQueue.currentMessage !== null && this.rootView.messageQueue.currentMessage.primary === false) {
                await this.sleep(1000);
            }
            if (!info.primary) {
                await this.handlerSecondaryInfo(info);
            } else {
                await this.handlerPrimaryInfo(info);
            }
        }
    }

    handlerPrimaryInfo = async (info) => {
        this.rootView.messageQueue.currentMessage = info;
        this.rootView.showInfo(info.message, -1);
    }

    handlerSecondaryInfo = async (info) => {
        // Otherwise display immediately and then display primary message
        this.rootView.messageQueue.currentMessage = info;
        this.rootView.showInfo(info.message, info.timeout);
        await this.sleep(info.timeout);

        this.rootView.removeMessage(info);
        this.rootView.messageQueue.currentMessage = null;
    }

    handlerInitPlayerState = () => {
        this.playerState = this.rootView.state;

        this.playerState.eventPlaylistStateChange(this.handlerInitPlaylistState);
        this.playerState.eventBrowseStateChange(this.handlerInitBrowseState);
        // Toggle Play Pause
        this.playerState.eventTogglePlayPause(this.handlerTogglePlayPause);
        // Display time and title-artist after song is loaded
        this.playerState.eventNextSong(this.handlerNextSong);
        this.playerState.eventPrevSong(this.handlerPrevSong);
        // Toggle Random
        this.playerState.eventToggleRandomMode(this.handlerToggleRandomMode);
        this.playerState.eventToggleLoopMode(this.handlerToggleLoopMode);
        // Update song when seeking progress bar
        this.playerState.eventSeekProgressBar(this.handlerSeekProgressBar);
    }

    handlerInitPlaylistState = (state) => {
        this.playlistState = this.playerState.state;
        this.playlistState.eventChooseSong(this.handlerChooseSong);

        // Event toggle display queue
        this.playlistState.displayQueueBtnUI.addEventListener('click', e => {
            this.handlerDisplayQueue();
        })

        // Event Shuffle
        this.playlistState.shuffleBtnUI.onclick = this.handlerShufflePlaylist;

        // Event love song
        this.playlistState.eventToggleLoveSong(this.handlerToggleLoveSong);
        this.initAddToPlaylistModal(this.playlistState.playlist.songs);

        // Filter songs
        this.playlistState.eventFilterSongs(this.handlerFilterSongs);

        // Add/remove song to/from queue
        this.playlistState.eventAddToQueue(this.handlerAddToQueue);

        // Back
        this.playlistState.eventBrowsePlaylists(this.handlerBrowsePlaylist);
    }

    handlerShufflePlaylist = () => {
        this.playerModel.songs = this.playlistState.playlist.songs;
        this.playerModel.playlist = this.playlistState.playlist;
        this.playerModel.songQueue.updateQueue(this.playerModel.songs);
        this.playerModel.nextSong();
        if (this.playlistState.displayQueueBtnUI.checked) {
            this.handlerDisplayQueue();
        }
        this.rootView.addMessage({message: 'Initializing new play queue ...',
                                  timeout: 1000,
                                  primary: false})
    }

    handlerBrowsePlaylist = () => {
        this.playerState.changeState(new BrowseState(this.playerModel.playlists));
    }

    handlerInitBrowseState = async () => {
        this.browseState = this.playerState.state;
        this.browseState.eventChoosePlaylist(this.handlerChoosePlaylist);
    }

    handlerLogin = async (form, url) => {
        const xhr = new XMLHttpRequest();
        let response;
        xhr.onload = function() {
            if(xhr.status === 200) {
                response = JSON.parse(xhr.responseText);
            } else {
                response = 'BACKEND ERROR !!!';
            }
        }

        xhr.open('POST', url, false);
        const csrf_token = this.playerModel.getCookie('csrftoken');
        xhr.setRequestHeader('X-CSRFToken', csrf_token);
        const formData = new FormData(form);
        xhr.send(formData);


        if (response.success) {
            await this.playerModel.updatePlaylists();
            const playlist = this.playerModel.playlists.find(playlist => playlist.title === this.playlistState.stateName);
            this.playerState.state = new PlaylistState(playlist);
            this.playlistState = this.playerState.state;

            // Highlight Song
            this.playlistState.highlightSong(this.playerModel.currentSong);
            // Change block account
        }
        // Post login handler
        this.rootView.addMessage({message: response.info, timeout: 5000, primary: false});
    }

    handlerChooseSong = async (id) => {
        // Update song if playlist is changed
        if (this.playerModel.playlist !== this.playlistState.playlist) {
            this.playerModel.playlist = this.playlistState.playlist;
            this.playerModel.songs = this.playerModel.playlist.songs;
            this.handlerShufflePlaylist();
        }
        await this.playerModel.chooseSong(id);
    }

    handlerNextSong = () => {
        if (this.playerModel.songQueue.currentQueue.isEmpty()) {
            this.rootView.addMessage({message: 'Empty Play Queue !!!', timeout: 3000, primary: false});
        } else {
            this.playerModel.nextSong();
        }
    }

    handlerPrevSong = () => {
        if (this.playerModel.songsHistory.length === 0) {
            this.rootView.addMessage({message: 'Empty History List !!!', timeout: 3000, primary: false});
            return false;
        }
        this.playerModel.prevSong();
    }

    handlerTogglePlayPause = () => {
        this.playerModel.togglePlayPause();
    }

    handlerAddToQueue = async (pk) => {
        const song = await this.playerModel.getSongByPk(pk);
        this.playerModel.songQueue.currentQueue.enqueue(song);
        this.handlerDisplayQueue();
    }

    handlerRemoveFromQueue = async (pk) => {
        const found = this.playerModel.songQueue.currentSongQueue.find(song => song.pk === pk);

        const index = this.playerModel.songQueue.currentSongQueue.indexOf(found);
        this.playerModel.songQueue.currentSongQueue.splice(index, 1);

        // Remove song from queue view
        const rowUI = Array.from(this.playlistState.songListUI).find(song => parseInt(song.getAttribute('data-pk')) === found.pk);
        fadeOut(rowUI);
    }

    handlerSongChange = player => {
        this.playerModel.sliceNormalQueue();
        this.playlistState.updateView(player);

        // If repeat mode, init a new queue, otherwise display an empty queue message
        if (this.playerModel.songQueue.currentQueue.isEmpty()) {
            if (this.playerModel.repeat === true) {
                this.playerModel.songQueue.updateCurrentQueue(this.playerModel.songs);
            }
        }

        if (!this.playlistState.displayQueueBtnUI.checked) {
            this.playlistState.highlightSong(this.playerModel.currentSong);
        } else {
            // Remove song from queue view (if current song not in song queue) instead of displaying a new queue
            const rowUI = Array.from(this.playlistState.songListUI).forEach(row => {
                const queuePks = this.playerModel.songQueue.currentSongQueue.map(song => song.pk);
                if (queuePks.indexOf(parseInt(row.id)) === -1 || parseInt(row.id) === this.playerModel.currentSong.pk) {
                   fadeOut(row);
                }
            })
        }
    }

    handlerModeBtnChange = () => {
        const randomMode = this.playerModel.randomMode;
        const loopMode = this.playerModel.player.loop;
        const repeatMode = this.playerModel.repeat;
        this.playerState.updateModeBtnView(randomMode, loopMode, repeatMode);
    }

    handlerLyricsChange = async () => {
        if (this.playerModel.showLyrics) {
            this.playerState.showLyricsMsg('GETTING LYRICS ...');
            const response = await this.playerModel.getLyrics();
            this.playerState.showLyrics(response.lyrics);
        } else {
            // Hide lyrics
            this.playerState.showLyricsMsg('');
        }
    }

    // Load song title, artist, duration into left view
    handlerSongLoaded = async () => {
        await this.playerState.songLoaded(this.playerModel);
        const msg = `Now playing: ${this.playerModel.currentSong.title} - ${this.playerModel.currentSong.artist} / ${this.playerModel.playlist.title}`;
        const timeout = -1;
        this.rootView.addMessage({message: msg, timeout: -1, primary: true})
    }

    handlerSongPlaying = currentTime => {
        this.playerState.updateProgressBar(currentTime);
    }

    handlerSeekProgressBar = value => {
        if (this.playerModel.player.paused) {
            this.playerModel.player.play();
        }
        this.playerModel.updateCurrentTime(value);
    }

    handlerPauseState = () => {
        this.playerState.pauseState();
    }

    handlerPlayState = () => {
        this.playerState.playState();
    }

    // Auto play next song
    handlerEndedState = () => {
        this.playerView.endedState();
    }

    handlerDurationChange = currentSongId => {
        this.playerView.changeSongState(currentSongId);
    }

    handlerWaiting = () => {
        this.rootView.addMessage({message: 'Loading song ...', timeout: 1000, primary: false});
    }

    // Create new playlist
    handlerNewPlaylist = async (form, URL) => {
        const response = await this.playerModel.createNewPlaylist(form, URL);
        if (response.success) {
            this.playerModel.playlists.push(response.playlist);
            this.initAddToPlaylistModal(response.playlist.songs);
        }
        this.rootView.addMessage({message: response.info, timeout: 3000, primary: false})
    }

    initAddToPlaylistModal = async (songs) => {
        // Add playlist to modal (add song to playlist)
        // Get songPks for current displaying playlist
        const currentSongs = this.playerModel.playlists.find(playlist => playlist.title === this.playlistState.stateName).songs;

        // Clear old playlists and add new playlists to modal
        this.playlistState.clearPlaylistsFilterModal();

        songs.forEach(song => {
            if (this.playerModel.userPlaylists.length === 0) {
                document.getElementById(`playlistContainerModal${song.pk}`).innerHTML = "<h5>YOU HAVE NO PLAYLIST !!!</h5>";
            } else {
                this.playerModel.userPlaylists.forEach(playlist => {
                    const songPks = playlist.songs.map(song => song.pk);
                    const isAdded = songPks.includes(song.pk);
                    this.handlerAddPlaylistToModal(playlist, song, isAdded);
                })
            }
        })

    }

    handlerAddPlaylistToModal = async (playlist, song, isAdded) => {
        this.playlistState.addPlaylistToModal(playlist, song, isAdded);
        this.handlerBtnAddToPlaylist(song);
        // Add event for searching playlist for adding song to playlist
        Array.from(this.playlistState.playlistSearchFormsUI).forEach(form => {
            form.onkeyup = async (e) => {
                const songPk = parseInt(form.getAttribute('data-song-pk'));
                const playlistContainer = document.getElementById(`playlistContainerModal${songPk}`);
                const value = form.firstElementChild.value;

                // Clear old results
                this.playlistState.clearPlaylistsFilterModal(songPk);

                let filteredPlaylists = [];
                this.playerModel.userPlaylists.forEach(playlist => {
                    if (playlist.title.toLowerCase().indexOf(value.toLowerCase()) !== -1) {
                        filteredPlaylists.push(playlist);
                    }
                })
                filteredPlaylists.forEach(playlist => {
                    const songPks = playlist.songs.map(song => song.pk);
                    const song = this.playerModel.songs.find(song => song.pk === songPk)
                    const isAdded = songPks.includes(song.pk);
                    this.playlistState.addPlaylistToModal(playlist, song, isAdded);
                    this.handlerBtnAddToPlaylist(song);
                })
            }
        })
    }

    handlerBtnAddToPlaylist = async (song) => {
        const buttonsUI = document.getElementsByClassName(`btn-add-to-playlist-${song.pk}`)
        Array.from(buttonsUI).forEach(btn => {
            btn.onclick = async (e) => {
                const songPk = parseInt(btn.getAttribute('data-song-pk'));
                const playlistTitle = btn.getAttribute('data-playlist-title');
                const response = await this.playerModel.addSongToPlaylist(songPk, playlistTitle);
                if (response.success) {
                    btn.setAttribute('disabled', true);
                    btn.value = 'Added';
                    btn.classList.remove('btn-green');
                    btn.classList.add('btn-light');

                    // Make change in model
                    const song = await this.playerModel.getSongByPk(songPk);
                    const playlist = this.playerModel.playlists.find(playlist => playlist.title === playlistTitle);
                    playlist.songs = [song, ...playlist.songs]
                }
            }
        })
    }

    // Upload local file
    handlerUploadLocalFile = async (form, uploadURL) => {
        const response = await this.playerModel.uploadLocalFile(form, uploadURL);
        if (response.success) {
            const allSongsPlaylist = this.playerModel.playlists.find(playlist => playlist.title === 'All Songs')
            allSongsPlaylist.songs.push(response.song);
            if (this.playlistState.stateName === 'All Songs') {
                this.playlistState.addSongToTable(response.song, true);
            }
        }
        this.rootView.addMessage({message: response.info, timeout: 5000, primary: false});
    }

    // Upload song to AWS S3 (Model)
    handlerUploadSong = async (songInfo, uploadURL) => {
    }

    handlerToggleRandomMode = () => {
        this.playerModel.toggleRandomMode();
        if (this.playlistState.displayQueueBtnUI.checked) {
            this.handlerDisplayQueue();
        }
    }

    handlerDisplayQueue = () => {
        const checked = this.playlistState.displayQueueBtnUI.checked;
        let songs;
        if (checked) {
            songs = this.playerModel.songQueue.currentSongQueue;
            this.playlistState.setSongs(songs);

            // Queue state: Change state for action dropdown
            this.playlistState.queueActionState();
            this.playlistState.eventRemoveFromQueue(this.handlerRemoveFromQueue);
        } else {
            songs = this.playlistState.playlist.songs;
            this.playlistState.setSongs(songs);
            this.playlistState.highlightSong(this.playerModel.currentSong);

            // Change state for action dropdown
            this.playlistState.playlistActionState();
        }

        // Add to playlist Modal
        this.initAddToPlaylistModal(songs);
    }

    handlerToggleLoopMode = () => {
        this.playerModel.toggleLoopMode();
    }

    handlerToggleLoveSong = async (pk) => {
        pk = parseInt(pk);
        const response = await this.playerModel.toggleLoveSong(pk);
        if (response.success) {
            this.playerModel.updateLoveState(pk);
            this.playlistState.updateLoveIcon(pk, response.liked);
        }
        this.rootView.addMessage({message: response.info, timeout: 1000, primary: false});
    }

    handlerToggleLyrics = btnState => {
        this.playerModel.toggleLyrics(btnState);
    }

    handlerChoosePlaylist = async (playlistTitle) => {
        const playlist = this.playerModel.playlists.find(playlist => playlist.title === playlistTitle);
        this.playerState.changeState(new PlaylistState(playlist));
    }

    handlerFilterSongs = async (value) => {
        this.playlistState.clearSongs();
        this.playlistState.playlist.songs.forEach(song => {
            if (value === '') {
                /*
                song.style.display = 'table-row';
                fadeIn(song);
                */
                this.playlistState.addSongToTable(song);
            } else if (song.title.toLowerCase().indexOf(value) !== -1) {
                this.playlistState.addSongToTable(song);
            }
        })
    }

    // Playlist Cards
    //
    handlerBrowseState = async () => {
        this.playerState.changeState(new BrowseState(this.playerModel.playlists));
        this.browseState = this.playerState.state;

        // Add event listener for btn
        this.browseState.eventChoosePlaylist(this.handlerChoosePlaylist);
    }
}

function getUsername() {
    const username = document.getElementById('username').textContent.trim();
    return username;
}

function formatTime(time) {
    let hour = parseInt(time / 3600) || 0;
    let min = parseInt((time % 3600)/60) || 0;
    let sec = parseInt(time % 3600 % 60);

    if (min < 10) {
        min = `0${min}`;
    }

    if (sec < 10) {
        sec = `0${sec}`;
    }

    if (hour === 0) {
        return `${min}:${sec}`;
    }

    return `${hour}:${min}:${sec}`;
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

function fadeOut(el) {
    el.style.opacity = 1;
    (function fade() {
        if ((el.style.opacity -= .05) <= 0) {
            el.style.display = "none";
        } else {
            requestAnimationFrame(fade);
        }
    })();
};

function fadeIn(el) {
    el.style.opacity = 0;
    (function fade() {
        var val = parseFloat(el.style.opacity);
        if (!((val += .05) > 1)) {
            el.style.opacity = val;
            requestAnimationFrame(fade);
        }
    })();
};


const app = new PlayerController(new PlayerModel, new RootView);
