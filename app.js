/**
 * MUSICA | Final Production Code
 * Features: YouTube IFrame API, Auto-Trending, Library Folders, Glassmorphism UI
 */

const Musica = {
    ytPlayer: null,
    apiKey: "AIzaSyAIaF7sqNwjAUud3OBoK_5HnRA7gP-Fd1A", // Your Hard-coded Key
    currentSong: null,
    isPlaying: false,

    init() {
        // Initialize YouTube IFrame API
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
                    'onError': (e) => console.error("Playback Error:", e)
                }
            });
        };
        
        // Initial Loads
        this.loadTrending();
        Library.init();
    },

    // View Navigation Logic
    nav(viewId, element) {
        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');

        // Switch Sections
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
        // Show Glassmorphism Spinner
        resultsContainer.innerHTML = '<div class="spinner"></div>';
        
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoCategoryId=10&key=${this.apiKey}&maxResults=15`);
            const data = await res.json();
            
            if (data.error) throw new Error(data.error.message);

            const songs = data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                artist: item.snippet.channelTitle,
                thumb: item.snippet.thumbnails.high.url
            }));
            this.renderResults(songs, 'search-results');
        } catch (e) {
            resultsContainer.innerHTML = `<p style="padding:20px; color:rgba(255,255,255,0.5);">Search Error: ${e.message}</p>`;
        }
    },

    async loadTrending() {
        const trendingContainer = document.getElementById('trending-results');
        trendingContainer.innerHTML = '<div class="spinner"></div>';

        try {
            // Using a high-speed mirror for trending data to save API quota
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
            trendingContainer.innerHTML = "<p style='padding:20px; opacity:0.5;'>Trending temporarily unavailable.</p>";
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
        
        // Update Player UI
        document.getElementById('player-bar').classList.remove('hidden');
        document.getElementById('np-title').innerText = title;
        document.getElementById('np-artist').innerText = artist;
        document.getElementById('np-thumbnail').src = thumb;

        if (this.ytPlayer && this.ytPlayer.loadVideoById) {
            this.ytPlayer.loadVideoById(id);
            this.ytPlayer.playVideo();
        }
    },

    togglePlay() {
        if (!this.ytPlayer) return;
        const state = this.ytPlayer.getPlayerState();
        if (state === 1) { // 1 is Playing
            this.ytPlayer.pauseVideo();
        } else {
            this.ytPlayer.playVideo();
        }
    },

    onPlayerStateChange(event) {
        const icon = document.getElementById('play-pause-icon');
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            icon.innerText = "pause";
        } else {
            this.isPlaying = false;
            icon.innerText = "play_arrow";
        }
    }
};

const Library = {
    init() {
        this.renderLibrary();
    },

    saveToLiked() {
        if (!Musica.currentSong) return alert("Play a song first!");
        let liked = JSON.parse(localStorage.getItem('musica_liked')) || [];
        if (!liked.find(s => s.id === Musica.currentSong.id)) {
            liked.push(Musica.currentSong);
            localStorage.setItem('musica_liked', JSON.stringify(liked));
            alert("Added to Liked ❤️");
            this.renderLibrary();
        }
    },

    createPlaylist() {
        const name = prompt("Enter Playlist Name:");
        if (!name) return;
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        if (playlists[name]) return alert("Playlist already exists!");
        playlists[name] = [];
        localStorage.setItem('musica_playlists', JSON.stringify(playlists));
        this.renderLibrary();
    },

    addToPlaylist() {
        if (!Musica.currentSong) return alert("No song playing!");
        const name = prompt("Enter Playlist Name to add to:");
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        
        if (!playlists[name]) return alert("Playlist not found!");
        
        if (!playlists[name].find(s => s.id === Musica.currentSong.id)) {
            playlists[name].push(Musica.currentSong);
            localStorage.setItem('musica_playlists', JSON.stringify(playlists));
            alert(`Saved to ${name}`);
            this.renderLibrary();
        }
    },

    renderLibrary() {
        const likedContainer = document.getElementById('library-results');
        const playlistContainer = document.getElementById('playlists-grid');
        
        const liked = JSON.parse(localStorage.getItem('musica_liked')) || [];
        const playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};

        // Render Folder Grid
        playlistContainer.innerHTML = Object.keys(playlists).map(name => `
            <div class="video-card" onclick="Library.playPlaylist('${name}')">
                <div class="video-info">
                    <h4 style="color: var(--brand-secondary)">📂 ${name}</h4>
                    <p>${playlists[name].length} Songs</p>
                </div>
            </div>
        `).join('');

        // Render Liked Songs Grid
        likedContainer.innerHTML = liked.map(s => `
            <div class="video-card" onclick="Musica.play('${s.id}', '${s.title}', '${s.artist}', '${s.thumb}')">
                <img src="${s.thumb}" class="video-thumb">
                <div class="video-info">
                    <h4>${s.title}</h4>
                    <p>${s.artist}</p>
                </div>
            </div>
        `).join('');
        
        if(liked.length === 0 && Object.keys(playlists).length === 0) {
            likedContainer.innerHTML = "<p style='opacity:0.5; padding:20px;'>Your library is empty.</p>";
        }
    },

    playPlaylist(name) {
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        const list = playlists[name];
        if (list && list.length > 0) {
            const s = list[0];
            Musica.play(s.id, s.title, s.artist, s.thumb);
        } else {
            alert("Playlist is empty!");
        }
    }
};

// Initialize app on load
window.onload = () => Musica.init();
