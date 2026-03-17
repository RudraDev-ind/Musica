/**
 * MUSICA | Premium Music Engine
 * Handles: Auth, Search (YT/Piped), Playback, & Persistent Library
 */

const Musica = {
    audio: new Audio(),
    currentSong: null,
    isPlaying: false,
    queue: [],

    init() {
        this.audio.crossOrigin = "anonymous";
        this.setupMediaSession();
        this.loadTrending();
        
        // Auto-login check
        if (localStorage.getItem('musica_user')) {
            Auth.showApp();
        }

        // Handle Audio Events
        this.audio.onplay = () => { this.isPlaying = true; this.updateUI(); };
        this.audio.onpause = () => { this.isPlaying = false; this.updateUI(); };
        this.audio.onended = () => { this.next(); };
    },

    // --- 1. CORE SEARCH & TRENDING ---
    async search() {
        const query = document.getElementById('search-input').value;
        const apiKey = Admin.getKey();
        if (!query) return;

        this.nav('home', document.querySelector('.nav-item:nth-child(2)'));
        document.getElementById('home-default').style.display = 'none';
        document.getElementById('search-results').style.display = 'block';
        document.getElementById('results-list').innerHTML = "<div class='loader'>Searching...</div>";

        if (apiKey && apiKey !== "") {
            try {
                const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&videoCategoryId=10&key=${apiKey}&maxResults=15`);
                const data = await res.json();
                const songs = data.items.map(item => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    artist: item.snippet.channelTitle,
                    thumb: item.snippet.thumbnails.high.url
                }));
                this.renderSongs(songs, 'results-list');
            } catch (e) {
                this.fallbackSearch(query);
            }
        } else {
            this.fallbackSearch(query);
        }
    },

    async fallbackSearch(query) {
        const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${query}&filter=music_songs`);
        const data = await res.json();
        const songs = data.items.map(s => ({
            id: s.url.split('=')[1],
            title: s.title,
            artist: s.uploaderName,
            thumb: s.thumbnail
        }));
        this.renderSongs(songs, 'results-list');
    },

    async loadTrending() {
        const region = document.getElementById('region-selector').value || 'IN';
        const res = await fetch(`https://pipedapi.kavin.rocks/trending?region=${region}`);
        const data = await res.json();
        const songs = data.filter(i => i.type === 'stream').map(s => ({
            id: s.url.split('=')[1],
            title: s.title,
            artist: s.uploaderName,
            thumb: s.thumbnail
        }));
        this.renderSongs(songs, 'trending-list');
    },

    renderSongs(songs, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = songs.map(s => `
            <div class="song-item" onclick="Musica.play('${s.id}', '${s.title.replace(/'/g, "")}', '${s.artist.replace(/'/g, "")}', '${s.thumb}')">
                <img src="${s.thumb}" class="song-thumb">
                <div class="song-meta">
                    <h4>${s.title}</h4>
                    <p>${s.artist}</p>
                </div>
            </div>
        `).join('');
    },

    // --- 2. PLAYBACK ENGINE ---
    async play(id, title, artist, thumb) {
        this.currentSong = { id, title, artist, thumb };
        
        // UI Updates
        document.getElementById('mini-player').classList.add('visible');
        document.getElementById('m-title').innerText = title;
        document.getElementById('m-artist').innerText = artist;
        document.getElementById('m-art').src = thumb;
        document.getElementById('f-title').innerText = title;
        document.getElementById('f-artist').innerText = artist;
        document.getElementById('f-art').src = thumb;

        // Fetch Stream
        const res = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
        const data = await res.json();
        const stream = data.audioStreams.find(s => s.format === 'M4A' || s.bitrate > 100000);
        
        this.audio.src = stream.url;
        this.audio.play();
        this.updateMediaSession();
    },

    togglePlay() {
        if (this.audio.paused) this.audio.play();
        else this.audio.pause();
    },

    updateUI() {
        const icon = this.isPlaying ? '⏸' : '▶';
        document.getElementById('m-play-btn').innerText = icon;
        document.getElementById('f-play-btn').innerText = icon;
    },

    // --- 3. NAVIGATION & UI ---
    nav(pageId, el) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => {
            s.classList.remove('active');
            if (s.id === pageId) s.classList.add('active');
        });
    },

    toggleFull(open) {
        document.getElementById('full-overlay').classList.toggle('open', open);
    },

    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },

    updateMediaSession() {
        if ('mediaSession' in navigator && this.currentSong) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: this.currentSong.title,
                artist: this.currentSong.artist,
                artwork: [{ src: this.currentSong.thumb, sizes: '512x512', type: 'image/png' }]
            });
        }
    }
};

// --- 4. LIBRARY & STORAGE ---
const Library = {
    liked: JSON.parse(localStorage.getItem('musica_liked')) || [],
    playlists: JSON.parse(localStorage.getItem('musica_lists')) || {},

    toggleLike() {
        if (!Musica.currentSong) return;
        const idx = this.liked.findIndex(s => s.id === Musica.currentSong.id);
        if (idx === -1) {
            this.liked.push(Musica.currentSong);
            document.getElementById('like-btn').innerText = '❤️';
        } else {
            this.liked.splice(idx, 1);
            document.getElementById('like-btn').innerText = '♡';
        }
        localStorage.setItem('musica_liked', JSON.stringify(this.liked));
    },

    renderLiked() {
        Musica.renderSongs(this.liked, 'library-content');
    },

    createPlaylist() {
        const name = prompt("Playlist Name:");
        if (name) {
            this.playlists[name] = [];
            localStorage.setItem('musica_lists', JSON.stringify(this.playlists));
            alert("Playlist Created!");
        }
    },

    addToPlaylist() {
        document.getElementById('playlist-modal').style.display = 'flex';
        const list = document.getElementById('modal-list');
        list.innerHTML = Object.keys(this.playlists).map(name => `
            <div class="menu-item" onclick="Library.saveTo('${name}')">${name}</div>
        `).join('') || "No playlists created.";
    },

    saveTo(name) {
        this.playlists[name].push(Musica.currentSong);
        localStorage.setItem('musica_lists', JSON.stringify(this.playlists));
        this.closeModal();
    },

    closeModal() { document.getElementById('playlist-modal').style.display = 'none'; }
};

// --- 5. AUTH & ADMIN ---
const Auth = {
    login() {
        const email = document.getElementById('email').value;
        if (email.includes('@')) {
            localStorage.setItem('musica_user', email);
            this.showApp();
        }
    },
    showApp() {
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('user-name').innerText = localStorage.getItem('musica_user').split('@')[0];
    },
    logout() {
        localStorage.clear();
        location.reload();
    }
};

const Admin = {
    globalKey: "AIzaSyAIaF7sqNwjAUud3OBoK_5HnRA7gP-Fd1A"
    saveKey() {
        const key = document.getElementById('api-key-input').value;
        localStorage.setItem('musica_global_key', key);
        document.getElementById('key-status').style.display = 'block';
    },
    getKey() {
        return localStorage.getItem('musica_global_key');
    }
};

// Start the App
window.onload = () => Musica.init();
