import {axiosInstance, setCookie, getCookie, deleteCookie} from './axios.js';
import {API_BASE_URL} from './env.js';
import PlayerModel from './models.js';
import {RootView, PlayerState, PlaylistState, BrowseState, AccountState, fadeOut, fadeIn} from './views.js';



///////////////////
class PlayerController {
    constructor(model, rootView) {
        this.playerModel = model;
        this.rootView = rootView;
        this.handlerInitRootView();
        this.rootView.changeState(new PlayerState);
        this.playerState = this.rootView.state;

        this.playerModel.player.onerror = () => {
            this.rootView.addMessage({message: 'Error loading song !!!', timeout: -1, primary: true});
        }


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


        //  Get logged in account
        const user = await axiosInstance.get('account/current-user/').then(response => response.data);
        await this.rootView.changeAccountState(new AccountState(user));
        this.rootView.userId = this.rootView.accountState.user.id;
        if (user.username !== '') {
            this.rootView.accountState.eventLogout(this.handlerLogout);
        }
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
                await this.sleep(100);
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
        this.playlistState.eventToggleLikeSong(this.handlerToggleLikeSong);
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
        // this.playerModel.nextSong();
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

    handlerLogout = () => {
        axiosInstance.post('account/logout/', {refresh_token: getCookie('refresh_token')}).then(async response => {
            if (response.statusText === 'OK') {
                axiosInstance.defaults.headers['Authorization'] = null;
                deleteCookie('access_token');
                deleteCookie('refresh_token');

                const guest = await axiosInstance.get('account/current-user/').then(res => res.data);
                this.rootView.changeAccountState(new AccountState(guest))
                if (this.playerState.state.stateName !== 'queue' && this.playerState.state.stateName !== 'browse') {
                    const currentPlaylist = this.playlistState.playlist;
                    this.playerState.changeState(new PlaylistState(currentPlaylist, guest));
                    this.rootView.addMessage({message: 'Logout successfully !', timeout: 3000, primary: false});
                }
            }
        })
    }

    handlerLogin = async (username, password) => {
        axiosInstance.post('account/token/', {
            username: username,
            password: password
        }).then(async response => {
            if (response.statusText === 'OK') {
                setCookie('access_token', response.data.access);
                setCookie('refresh_token', response.data.refresh);

                axiosInstance.defaults.headers['Authorization'] = 'JWT ' + getCookie('access_token');

                const user = await this.playerModel.getCurrentUser();
                this.rootView.changeAccountState(new AccountState(user));
                this.rootView.accountState.eventLogout(this.handlerLogout);

                await this.playerModel.updatePlaylists();

                if (this.playerState.state.stateName !== 'browse' && this.playerState.state.stateName !== 'queue') {
                    const currentPlaylist = this.playlistState.playlist;
                    this.playerState.changeState(new PlaylistState(currentPlaylist, this.rootView.userId));
                    this.playlistState = this.playerState.state;

                    // Highlight Song
                    this.playlistState.highlightSong(this.playerModel.currentSong);

                }
                this.rootView.addMessage({message: "Logged in successfully !", timeout: 5000, primary: false});
            } else if (response.statusText === 'Unauthorized') {
                this.rootView.addMessage({message: "Wrong credentials !!!", timeout: 5000, primary: false});
            }
        }).catch(err => this.rootView.addMessage({message: 'Unknown error !!!', timeout: 3000, primary: false}));
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
        if (this.playerModel.songsHistory.length === 1) {
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

    handlerRemoveFromQueue = async (id) => {
        const found = this.playerModel.songQueue.currentSongQueue.find(song => song.id === id);

        const index = this.playerModel.songQueue.currentSongQueue.indexOf(found);
        this.playerModel.songQueue.currentSongQueue.splice(index, 1);

        // Remove song from queue view
        const rowUI = Array.from(this.playlistState.songListUI).find(song => parseInt(song.getAttribute('id')) === found.id);
        fadeOut(rowUI);
    }

    handlerSongChange = player => {
        this.playerModel.sliceNormalQueue();

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
                const queuePks = this.playerModel.songQueue.currentSongQueue.map(song => song.id);
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
            if (response.statusText === 'OK') {
                this.playerState.showLyrics(response.data.lyrics);
            }
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
    handlerNewPlaylist = async (title, description, files) => {
        const response = await this.playerModel.createNewPlaylist(title, description, files);
        if (response.statusText === 'Created') {
            this.playerModel.playlists.push(response.data);

            if (this.playerState.state.stateName !== 'browse') {
                this.initAddToPlaylistModal(response.data.songs);
            } else {
                this.playerState.changeState(new BrowseState(this.playerModel.playlists));
                this.handlerInitBrowseState();
            }
        }
        this.rootView.addMessage({message: response.info, timeout: 3000, primary: false})
    }

    initAddToPlaylistModal = async (songs) => {
        // Add playlist to modal (add song to playlist)
        // Get songPks for current displaying playlist
        const currentSongs = this.playerModel.playlists.find(playlist => playlist.title === this.playlistState.stateName).songs;

        // Clear old playlists and add new playlists to modal
        this.playlistState.clearPlaylistsFilterModal();
        currentSongs.forEach(song => {
            if (this.playerModel.userPlaylists.length === 0) {
                document.getElementById(`playlistContainerModal${song.id}`).innerHTML = "<h5>YOU HAVE NO PLAYLIST !!!</h5>";
            } else {
                this.playerModel.userPlaylists.forEach(playlist => {
                    const songPks = playlist.songs.map(song => song.id);
                    const isAdded = songPks.includes(song.id);
                    this.handlerAddPlaylistToModal(playlist, song, isAdded);
                })
            }
        })

        this.handlerFilterPlaylists();
    }

    handlerFilterPlaylists = () => {
        // Add event for searching playlist for adding song to playlist
        if (this.playlistState.playlistSearchFormsUI.length !== 0) {
            Array.from(this.playlistState.playlistSearchFormsUI).forEach(form => {
                form.onkeyup = async (e) => {
                    const songPk = parseInt(form.getAttribute('data-song-pk'));
                    const allSongs = this.playerModel.playlists.find(playlist => playlist.title === 'All Songs').songs;
                    const song = allSongs.find(song => song.id = songPk);

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
                        const songPks = playlist.songs.map(song => song.id);

                        const isAdded = songPks.includes(song.id);
                        this.playlistState.addPlaylistToModal(playlist, song, isAdded);
                        this.handlerBtnAddToPlaylist(song);
                    })
                }
            })
        }
    }


    handlerAddPlaylistToModal = async (playlist, song, isAdded) => {
        this.playlistState.addPlaylistToModal(playlist, song, isAdded);
        Array.from(this.playlistState.removeFromPlaylistBtns).forEach(btn => {
            btn.onclick = () => {
                this.rootView.addMessage({message: 'Not implemented yet !!!', timeout: 3000, primary: false});
            }
        })

        this.handlerBtnAddToPlaylist(song);
    }

    handlerBtnAddToPlaylist = async (song) => {
        const buttonsUI = document.getElementsByClassName(`btn-add-to-playlist-${song.id}`)
        Array.from(buttonsUI).forEach(btn => {
            btn.onclick = async (e) => {
                const songPk = parseInt(btn.getAttribute('data-song-pk'));
                const playlistPk = parseInt(btn.getAttribute('data-playlist-pk'));
                const response = await this.playerModel.addSongToPlaylist(songPk, playlistPk);
                if (response.statusText === 'OK') {
                    btn.setAttribute('disabled', true);
                    btn.value = 'Added';
                    btn.classList.remove('btn-green');
                    btn.classList.add('btn-light');

                    // Make change in model
                    const song = await this.playerModel.getSongByPk(songPk);
                    const playlist = this.playerModel.playlists.find(playlist => playlist.id === playlistPk);
                    playlist.songs = [song, ...playlist.songs]
                }
            }
        })
    }

    // Upload local file
    handlerUploadLocalFile = async (displayTitle, title, artist, files) => {
        const config = { timeout: 600000,
                         headers: {'Content-Type': 'multipart/form-data',
                                    Authorization: 'JWT ' + getCookie('access_token')} };
        const URL = `${API_BASE_URL}/song/`;
        let formData = new FormData();
        formData.append('display_title', displayTitle);
        formData.append('title', title);
        formData.append('artist', artist);
        formData.append('file', files[0]);

        await axios.post(URL, formData, config).then(response => {
            if (response.statusText === 'Created') {
                const allSongsPlaylist = this.playerModel.playlists.find(playlist => playlist.title === 'All Songs')
                allSongsPlaylist.songs.unshift(response.data);
                if (this.playerState.stateName !== 'browse' && this.playerState.stateName !== 'queue') {
                    const currentPlaylist = this.playlistState.playlist;
                    this.playerState.changeState(new PlaylistState(currentPlaylist, this.rootView.userId));
                    this.playlistState = this.playerState.state;
                }
                this.rootView.addMessage({message: 'Song uploaded successfully !', timeout: 5000, primary: false});
            }
        }).catch(err => {
            if (err.response.statusText === 'Unauthorized' && err.response.status === 401) {
                this.rootView.addMessage({message: 'Login required !!!', timeout: 5000, primary: false});
            }
        });
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

    handlerToggleLikeSong = async (id) => {
        id = parseInt(id);
        const response = await this.playerModel.toggleLikeSong(id);
        let info;
        if (response.statusText === 'OK') {
            this.playlistState.updateLoveIcon(id, liked);
            const liked = response.data.liked_by.includes(this.rootView.accountState.user.id);
            info = liked ? 'Song added to favorite !' : 'Song removed from favorite !';

            // Update playlist
            this.playerModel.updatePlaylists();
        } else if (response.statusText === 'Unauthorized') {
            info = 'Login required !!!';
        }

        this.rootView.addMessage({message: info, timeout: 1000, primary: false});
    }

    handlerToggleLyrics = btnState => {
        this.playerModel.toggleLyrics(btnState);
    }

    handlerChoosePlaylist = async (playlistTitle) => {
        const playlist = this.playerModel.playlists.find(playlist => playlist.title === playlistTitle);
        this.playerState.changeState(new PlaylistState(playlist, this.rootView.userId));
        this.playlistState.highlightSong(this.playerModel.currentSong);
    }

    handlerFilterSongs = async (value) => {
        this.playlistState.clearSongs();
        this.playlistState.playlist.songs.forEach(song => {
            if (value === '') {
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

const app = new PlayerController(new PlayerModel, new RootView);
