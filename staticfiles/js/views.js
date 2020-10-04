class RootView {
    constructor() {
        this.state = null;
        this.accountState = null;

        this.setupVars();

        this.messageQueue = {
            messages: [],
            currentMessage: null
        }
    }

    changeAccountState(accountState) {
        this.accountState = accountState;
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
        this.uploadFileBtn.addEventListener('click', async e => {
            $('#uploadFileModal').modal('hide');
            e.preventDefault();
            this.showLoadingState();
            const form = document.getElementById('uploadFile');
            const title = form.children[0].value;
            const displayTitle = form.children[1].value;
            const artist = form.children[2].value;
            const file = form.children[3].files;
            await handler(displayTitle, title, artist, file);
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
            $("#loginModal").modal('hide');
            e.preventDefault();
            const form = document.getElementById('loginForm');
            const username = form.children[0].value;
            const password = form.children[1].value;
            handler(username, password);
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

            const form = document.getElementById('newPlaylistForm');
            const title = form.children[0].value;
            const description = form.children[1].value;
            const files = form.children[2].files;

            handler(title, description, files);
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

        this.displayTitle.textContent = playerModel.currentSong.title.toUpperCase();
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
    constructor(playlist, userId) {
        this.playlist = playlist;
        this.stateName = playlist.title;
        this.userId = userId;

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
        this.likeBtns = document.getElementsByClassName('fa-heartbeat');

        this.shuffleBtnUI = document.getElementById('shuffleBtn');
    }


    actionDropdownHTML(id) {
        const dropdownBtn = `<i class="fas fa-plus-circle" id="dropdownMenuButton${id}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></i>
                              <div class="dropdown-menu" aria-labelledby="dropdownMenuButton${id}" style="line-height:1.3">
                                    <a class="dropdown-item py-2" data-toggle="modal" data-target="#playlistsModal${id}" href="#">Add To Playlist</a>
                                    <a class="dropdown-item py-2 btn-add-to-queue" href="#" data-pk=${id}>Add To Play Queue</a>
                                    <a class="dropdown-item py-2 btn-remove-from-queue" href="#" data-pk=${id}>Remove From Play Queue</a>
                                    <a class="dropdown-item py-2" href="#">Something else</a>
                              </div>

                                <div class="modal" id="playlistsModal${id}" tabindex='-1' role="dialog" aria-labelledby="playlistModalLabel${id}" aria-hidden="true">
                                    <div class="modal-dialog modal-dialog-centered" role="document">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title" id="playlistModalLabel${id}">Add To Playlist</h5>
                                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                    <span aria-hidden="true">&times;</span>
                                                </button>
                                            </div>
                                            <div class="modal-body">
                                                <form id="playlistsSearchForm${id}" class='playlist-search-form mb-4' data-song-pk='${id}' enctype="text/plain">
                                                    <input type="text" class="form-control w-100" placeholder='Search for playlist ...'/>
                                                </form>
                                                <div class="d-flex flex-column w-100 playlist-container-modal" id="playlistContainerModal${id}">
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
        const table = document.createElement('div');
        table.className = 'd-flex flex-column my-2';

        const thead = document.createElement('div');
        thead.id = 'songListHeader';
        thead.className = 'row w-100 py-2';

        const thIcon = document.createElement('div');
        thIcon.className = 'col-1';

        const thTitle = document.createElement('div');
        thTitle.className = 'col-4';
        thTitle.textContent = 'Title';

        const thArtist = document.createElement('div');
        thArtist.className = 'col-4';
        thArtist.textContent = 'Artist';

        const thDuration = document.createElement('div');
        thDuration.className = 'col-2';
        thDuration.textContent = 'Duration';

        const thAction = document.createElement('div');
        thAction.className = 'col-1 text-center';
        thAction.innerHTML = 'Action';

        const tbody = document.createElement('div');
        tbody.className = 'd-flex flex-column';
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
        const row = document.createElement('div');
        row.className = 'row song w-100';
        row.style.opacity = 0;
        row.id = song.id;
        row.setAttribute('data-pk', song.id)

        const likeIcon = document.createElement('div');
        likeIcon.scope = 'row';
        likeIcon.className = 'col-1 text-center align-middle';

        // Check loved song
        console.log(this.userId);
        if (song.liked_by.includes(this.userId)) {
            likeIcon.innerHTML = '<i class="fas fa-heartbeat active"></i>';
        } else {
            likeIcon.innerHTML = '<i class="fas fa-heartbeat"></i>';
        }

        const tdTitle = document.createElement('div');
        tdTitle.className = 'col-4 align-middle song-title';

        // Check if displayTitle
        if (song.display_title === undefined || song.display_title === '') {
            tdTitle.innerHTML = song.title;
        } else {
            tdTitle.innerHTML = song.display_title;
        }

        const tdArtist = document.createElement('div');
        tdArtist.className = 'col-4 align-middle';
        tdArtist.innerHTML = song.artist;

        const tdDuration = document.createElement('div');
        tdDuration.className = 'col-2 align-middle';
        tdDuration.innerHTML = 'Duration';

        const tdAction = document.createElement('div');
        tdAction.className = 'col-1 align-items-center d-flex justify-content-center';
        tdAction.innerHTML = this.actionDropdownHTML(song.id);

        row.appendChild(likeIcon);
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

        /*
        playerModel.songs.forEach(song => {
            var min = parseInt(song.duration.split(':')[0]);
            var sec = parseInt(song.duration.split(':')[1]);
            totalDuration += min*60 + sec;
        })

        info = `${songCount} songs, total ${formatTime(totalDuration)}`;
        */
    }


    highlightSong(currentSong) {
        const songRows = Array.from(this.songListUI);
        if (currentSong === null || songRows.length === 0) {
            return false;
        }
        // Remove class .active
        songRows.forEach(song => {
            song.classList.remove('active');
        })

        // Add class .active
        const song = Array.from(this.songListUI).find(song => parseInt(song.id) === currentSong.id);
        song.classList.add('active');
    }

    clearPlaylistsFilterModal(songPk) {
        const filteredPlaylistContainer = document.getElementById(`playlistContainerModal${songPk}`);
        if (filteredPlaylistContainer !== null) {
            filteredPlaylistContainer.innerHTML = '';
        }
    }

    async addPlaylistToModal(playlist, song, isAdded) {
        const filteredPlaylistContainer = document.getElementById(`playlistContainerModal${song.id}`);
        if (filteredPlaylistContainer === null) {
            return false;
        }
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
        addBtn.setAttribute('data-song-pk', song.id)
        addBtn.setAttribute('data-playlist-pk', playlist.id);
        addBtn.className = `btn btn-green px-4 btn-add-to-playlist-${song.id}`;
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

    updateLoveIcon(id, liked) {
        const songs = Array.from(this.songListUI);
        const song = songs.filter(song => parseInt(song.id) === id )[0];
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
        const songRows = document.querySelectorAll(".song-title");
        Array.from(songRows).forEach(row => {
            row.addEventListener('click', e => {
                const song = e.target.parentElement;
                const id = parseInt(song.id);
                handler(id);
            })
        })
    }

    eventToggleLikeSong(handler) {
        Array.from(this.likeBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                if (e.target.classList.contains('fa-heartbeat')) {
                    const song = e.target.parentElement.parentElement;
                    const id = parseInt(song.id);
                    fadeIn(e.target);
                    handler(id);
                }
            })
        })
    }

    eventAddToQueue(handler) {
        Array.from(this.addToQueueBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.getAttribute('data-pk'));
                handler(id);
            })
        })
    }

    eventRemoveFromQueue(handler) {
        Array.from(this.removeFromQueueBtns).forEach(btn => {
            btn.addEventListener('click', e => {
                const id = parseInt(e.target.getAttribute('data-pk'));
                handler(id);
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
        cardImg.style.maxHeight = '12rem';

        if (playlist.thumbnail) {
            cardImg.setAttribute('src', playlist.thumbnail);
        } else {
            cardImg.setAttribute('src', "https://www.wallpaperup.com/uploads/wallpapers/2013/08/13/133513/307948ed064a3ebb40f16da3fffa2200.jpg");
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body d-flex flex-column justify-content-end';

        const cardText = document.createElement('p');
        cardText.className = 'card-text text-gray';
        cardText.textContent = playlist.description;

        const playBtn = document.createElement('input');
        playBtn.type = 'button';
        playBtn.className = 'btn btn-playlist btn-green';
        playBtn.value = playlist.title;
        playBtn.id = playlist.id;

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


class AccountState {
    constructor(user) {
        this.user = user;

        this.initUI();
    }

    initUI() {
        const container = document.getElementById('accountContainer');
        container.innerHTML = '';

        const profile = document.createElement('img');
        profile.className = 'bg-dark profile-icon profile-icon-sm';
        profile.src = this.user.profile_picture ? this.user.profile_picture : "https://image.shutterstock.com/z/stock-vector-default-avatar-profile-icon-grey-photo-placeholder-518740753.jpg"

        const usernameDiv = document.createElement('div');
        usernameDiv.className = "nav-link d-flex align-items-center active m-0 px-3";
        usernameDiv.setAttribute("role", "button");
        usernameDiv.setAttribute('data-toggle', 'dropdown');
        const username = this.user.username ? this.user.username : 'Guest';
        usernameDiv.innerHTML = `
              <span class="text-white dropdown-toggle align-middle p-0" id="username">
                    ${username}
              </span>
            `;

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu dropdown-menu-right';
        dropdown.setAttribute('aria-labelledby', "accountDropdown");
        if (this.user.username === '') {
            dropdown.innerHTML = `<a type="button" class="dropdown-item" data-toggle="modal" data-target="#loginModal">Login</a>`;
        } else {
            dropdown.innerHTML = `
                          <a class="dropdown-item" href="#">Account</a>
                          <a href="" class="dropdown-item">Change password</a>
                          <a class="dropdown-item" href="#">Settings</a>
                          <div class="dropdown-divider"></div>
                          <a id='logout' class="dropdown-item" href="#">Logout</a>
                `;
        }
        container.insertAdjacentElement("beforeend", profile);
        container.insertAdjacentElement("beforeend", usernameDiv);
        container.insertAdjacentElement("beforeend", dropdown);

    }

    eventLogout(handler) {
        document.getElementById('logout').addEventListener('click', e => {
            e.preventDefault();
            handler();
        })
    }
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


export {RootView, PlayerState, PlaylistState, BrowseState, AccountState, fadeOut, fadeIn};