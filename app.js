/**
 * MUSICA | Final Production Code
 * Features: YouTube API, Media Session (Lock Screen Controls), 
 * Background Play Support, Library Folders & Progress Bar.
 */

const Musica = {
    ytPlayer: null,
    apiKey: "AIzaSyAIaF7sqNwjAUud3OBoK_5HnRA7gP-Fd1A", 
    currentSong: null,
    isPlaying: false,
    progressTimer: null,

    init() {
        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('youtube-player', {
                height: '0',
                width: '0',
                playerVars: {
                    'autoplay': 0,
                    'controls': 0,
                    'disablekb': 1,
                    'modestbranding': 1,
                    'rel': 0
                },
                events: {
                    'onReady': () => console.log("Musica Engine Ready"),
                    'onStateChange': (e) => this.onPlayerStateChange(e),
                }
            });
        };
        
        this.loadTrending();
        Library.init();
        this.setupProgressBar();
    },

    // View Navigation
    nav(viewId, element) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('active');
        });
        const activeSection = document.getElementById(viewId);
        activeSection.classList.remove('hidden');
        activeSection.classList.add('active');
    },

    async search() {
        const query = document.getElementById('search-input').value;
        if (!query) return;
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div class="spinner"></div>';
        
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoCategoryId=10&key=${this.apiKey}&maxResults=15`);
            const data = await res.json();
            const songs = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                thumb: item.snippet.thumbnails.high.url
            }));
            this.renderResults(songs, 'search-results');
        } catch (e) {
            resultsContainer.innerHTML = `<p style='opacity:0.5;'>Search failed. Check connection.</p>`;
        }
    },

    async loadTrending() {
        const trendingContainer = document.getElementById('trending-results');
        trendingContainer.innerHTML = '<div class="spinner"></div>';
        try {
            const res = await fetch(`https://pipedapi.kavin.rocks/trending?region=IN`);
            const data = await res.json();
            const songs = data.filter(i => i.type === 'stream').slice(0, 15).map(s => ({
                id: s.url.split('=')[1],
                title: s.title,
                artist: s.uploaderName,
                thumb: s.thumbnail
            }));
            this.renderResults(songs, 'trending-results');
        } catch(e) { 
            trendingContainer.innerHTML = "<p style='opacity:0.5;'>Trending unavailable.</p>";
        }
    },

    renderResults(songs, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = songs.map(s => `
            <div class="video-card" onclick="Musica.play('${s.id}', '${s.title.replace(/'/g, "")}', '${s.artist.replace(/'/g, "")}', '${s.thumb}')">
                <img src="${s.thumb}" class="video-thumb">
                <div class="video-info">
                    <h4 class="video-title">${s.title}</h4>
                    <p class="video-channel">${s.artist}</p>
                </div>
            </div>
        `).join('');
    },

    play(id, title, artist, thumb) {
        this.currentSong = { id, title, artist, thumb };
        document.getElementById('player-bar').classList.remove('hidden');
        document.getElementById('np-title').innerText = title;
        document.getElementById('np-artist').innerText = artist;
        document.getElementById('np-thumbnail').src = thumb;

        if (this.ytPlayer && this.ytPlayer.loadVideoById) {
            this.ytPlayer.loadVideoById(id);
            this.ytPlayer.playVideo();
            this.updateMediaSession(); // Enable Lock Screen Controls
        }
    },

    togglePlay() {
        if (!this.ytPlayer) return;
        const state = this.ytPlayer.getPlayerState();
        state === 1 ? this.ytPlayer.pauseVideo() : this.ytPlayer.playVideo();
    },

    onPlayerStateChange(event) {
        const icon = document.getElementById('play-pause-icon');
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            icon.innerText = "pause";
            this.startProgressUpdate();
        } else {
            this.isPlaying = false;
            icon.innerText = "play_arrow";
            clearInterval(this.progressTimer);
        }
    },

    /* --- MEDIA SESSION API (Lock Screen Controls) --- */
    updateMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this.currentSong.title,
                artist: this.currentSong.artist,
                artwork: [{ src: this.currentSong.thumb, sizes: '512x512', type: 'image/png' }]
            });

            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('stop', () => this.ytPlayer.stopVideo());
        }
    },

    /* --- PROGRESS BAR LOGIC --- */
    setupProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        progressBar.addEventListener('input', (e) => {
            const newTime = (this.ytPlayer.getDuration() * e.target.value) / 100;
            this.ytPlayer.seekTo(newTime);
        });
    },

    startProgressUpdate() {
        clearInterval(this.progressTimer);
        this.progressTimer = setInterval(() => {
            if (this.ytPlayer && this.isPlaying) {
                const current = this.ytPlayer.getCurrentTime();
                const total = this.ytPlayer.getDuration();
                const pct = (current / total) * 100;
                
                document.getElementById('progress-bar').value = pct;
                document.getElementById('time-current').innerText = this.formatTime(current);
                document.getElementById('time-total').innerText = this.formatTime(total);
            }
        }, 1000);
    },

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
};

const Library = {
    init() { this.renderLibrary(); },
    saveToLiked() {
        if (!Musica.currentSong) return;
        let liked = JSON.parse(localStorage.getItem('musica_liked')) || [];
        if (!liked.find(s => s.id === Musica.currentSong.id)) {
            liked.push(Musica.currentSong);
            localStorage.setItem('musica_liked', JSON.stringify(liked));
            this.renderLibrary();
        }
    },
    createPlaylist() {
        const name = prompt("Playlist Name:");
        if (!name) return;
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        playlists[name] = [];
        localStorage.setItem('musica_playlists', JSON.stringify(playlists));
        this.renderLibrary();
    },
    renderLibrary() {
        const likedContainer = document.getElementById('library-results');
        const playlistContainer = document.getElementById('playlists-grid');
        const liked = JSON.parse(localStorage.getItem('musica_liked')) || [];
        const playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};

        playlistContainer.innerHTML = Object.keys(playlists).map(name => `
            <div class="video-card" onclick="Library.playPlaylist('${name}')">
                <div class="video-info"><h4 style="color:var(--brand-secondary)">📂 ${name}</h4></div>
            </div>`).join('');

        likedContainer.innerHTML = liked.map(s => `
            <div class="video-card" onclick="Musica.play('${s.id}', '${s.title}', '${s.artist}', '${s.thumb}')">
                <img src="${s.thumb}" class="video-thumb">
                <div class="video-info"><h4>${s.title}</h4><p>${s.artist}</p></div>
            </div>`).join('');
    },
    playPlaylist(name) {
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        if (playlists[name]?.length > 0) {
            const s = playlists[name][0];
            Musica.play(s.id, s.title, s.artist, s.thumb);
        }
    }
};

window.onload = () => Musica.init();
