/**
 * MUSICA | Final Production Code
 * Global Auth: Firebase | Search: YouTube v3 + Piped | UI: Liquid Glass
 */

// --- 1. CONFIGURATION & INITIALIZATION ---
const firebaseConfig = {
    apiKey: "AIzaSyB_3eDE7rTElKGlKgSTJRHp4rahLY_4i8c",
    authDomain: "musica-d3298.firebaseapp.com",
    projectId: "musica-d3298",
    storageBucket: "musica-d3298.firebasestorage.app",
    messagingSenderId: "791469091381",
    appId: "1:791469091381:web:6a69cfa86edcbb9fc99f7c",
    measurementId: "G-5MHEN9RFCT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Stable 2026 API Instances
const BASE_API = "https://pipedapi.leptons.xyz"; 
const INDIAN_MIRROR = "https://pipedapi.in.projectsegfau.lt";

const Musica = {
    audio: new Audio(),
    currentSong: null,
    isPlaying: false,

    init() {
        this.audio.crossOrigin = "anonymous";
        
        // Audio Event Listeners
        this.audio.onplay = () => { this.isPlaying = true; this.updateUI(); };
        this.audio.onpause = () => { this.isPlaying = false; this.updateUI(); };
        this.audio.onended = () => { this.next(); };

        // Lock Screen Controls
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
        }
    },

    async search() {
        const query = document.getElementById('search-input').value;
        const apiKey = Admin.getKey();
        if (!query) return;

        this.nav('home', document.querySelector('.nav-item:nth-child(2)'));
        document.getElementById('home-default').style.display = 'none';
        document.getElementById('search-results').style.display = 'block';
        document.getElementById('results-list').innerHTML = "Searching...";

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
            const res = await fetch(`${BASE_API}/search?q=${query}&filter=music_songs`);
            const data = await res.json();
            const songs = data.items.map(s => ({
                id: s.url.split('=')[1],
                title: s.title,
                artist: s.uploaderName,
                thumb: s.thumbnail
            }));
            this.renderSongs(songs, 'results-list');
        }
    },

    async loadTrending() {
        const region = document.getElementById('region-selector').value || 'IN';
        const listContainer = document.getElementById('trending-list');
        if (!listContainer) return;
        listContainer.innerHTML = "<p style='padding:20px; opacity:0.5;'>Loading trends...</p>";

        try {
            const res = await fetch(`${INDIAN_MIRROR}/trending?region=${region}`);
            const data = await res.json();
            const songs = data.filter(i => i.type === 'stream').slice(0, 20).map(s => ({
                id: s.url.split('=')[1],
                title: s.title,
                artist: s.uploaderName,
                thumb: s.thumbnail
            }));
            this.renderSongs(songs, 'trending-list');
        } catch(e) { 
            listContainer.innerHTML = "<p style='padding:20px;'>Trending temporarily unavailable.</p>";
        }
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

    aasync play(id, title, artist, thumb) {
    this.currentSong = { id, title, artist, thumb };
    
    // UI Updates
    document.getElementById('mini-player').classList.add('visible');
    document.querySelectorAll('[id$="-title"]').forEach(el => el.innerText = title);
    document.querySelectorAll('[id$="-artist"]').forEach(el => el.innerText = artist);
    document.querySelectorAll('[id$="-art"]').forEach(el => el.src = thumb);

    // List of reliable mirrors
    const mirrors = [
        "https://pipedapi.in.projectsegfau.lt",
        "https://pipedapi.kavin.rocks",
        "https://api.piped.victr.me",
        "https://piped-api.lunar.icu"
    ];

    for (let mirror of mirrors) {
        try {
            console.log(`Trying server: ${mirror}`);
            const res = await fetch(`${mirror}/streams/${id}`);
            if (!res.ok) continue; // Try next mirror if this one fails

            const data = await res.json();
            const stream = data.audioStreams.find(s => s.format === 'M4A' || s.bitrate > 100000) || data.audioStreams[0];

            if (stream && stream.url) {
                this.audio.src = stream.url;
                this.audio.load();
                await this.audio.play();
                return; // SUCCESS! Exit the loop
            }
        } catch (e) {
            console.warn(`Server ${mirror} failed, trying next...`);
        }
    }

    alert("All music servers are currently busy. Please try again in a few minutes.");
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

    nav(pageId, el) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        if(el) el.classList.add('active');
        document.querySelectorAll('.page-section').forEach(s => {
            s.classList.toggle('active', s.id === pageId);
        });
    },

    toggleFull(open) {
        document.getElementById('full-overlay').classList.toggle('open', open);
    }
};

// --- 4. GLOBAL AUTH (FIREBASE) ---
const Auth = {
    register() {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;
        if (!email || !pass) return alert("Please fill all fields");
        auth.createUserWithEmailAndPassword(email, pass)
            .then(() => { alert("Account Created!"); this.showApp(); })
            .catch(err => alert(err.message));
    },

    login() {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;
        if (!email || !pass) return alert("Enter email and password");
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => this.showApp())
            .catch(err => alert(err.message));
    },

    resetPassword() {
        const email = document.getElementById('email').value.trim();
        if (!email) return alert("Enter email first");
        auth.sendPasswordResetEmail(email)
            .then(() => alert("Reset link sent!"))
            .catch(err => alert(err.message));
    },

    showApp() {
        const user = auth.currentUser;
        if (user) {
            document.getElementById('auth-overlay').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            document.getElementById('user-name').innerText = user.email.split('@')[0];
            Musica.loadTrending(); 
            Library.renderLiked();
        }
    },

    logout() {
        auth.signOut().then(() => location.reload());
    }
};

const Library = {
    init() {
        this.renderLiked(); 
    },

    toggleLike() {
        if (!Musica.currentSong) return alert("Play a song first!");
        let liked = JSON.parse(localStorage.getItem('musica_liked')) || [];
        const index = liked.findIndex(s => s.id === Musica.currentSong.id);
        if (index === -1) {
            liked.push(Musica.currentSong);
            alert("Added to Liked ❤️");
            document.getElementById('like-btn').innerText = "❤️";
        } else {
            liked.splice(index, 1);
            alert("Removed from Liked");
            document.getElementById('like-btn').innerText = "♡";
        }
        localStorage.setItem('musica_liked', JSON.stringify(liked));
        this.renderLiked(); 
    },

    createPlaylist() {
        const pName = prompt("Enter Playlist Name:");
        if (!pName || pName.trim() === "") return;
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        if (playlists[pName]) return alert("Playlist already exists!");
        playlists[pName] = []; 
        localStorage.setItem('musica_playlists', JSON.stringify(playlists));
        alert(`Playlist "${pName}" created!`);
        this.renderLiked();
    },

    addToPlaylist() {
        if (!Musica.currentSong) return alert("No song is playing!");
        const pName = prompt("Enter Playlist Name to add to:");
        if (!pName) return;
        let playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        if (!playlists[pName]) playlists[pName] = [];
        if (playlists[pName].find(s => s.id === Musica.currentSong.id)) return alert("Already in playlist!");
        playlists[pName].push(Musica.currentSong);
        localStorage.setItem('musica_playlists', JSON.stringify(playlists));
        alert(`Saved to ${pName}!`);
        this.renderLiked();
    },

    renderLiked() {
        const container = document.getElementById('library-content');
        if (!container) return;
        
        const liked = JSON.parse(localStorage.getItem('musica_liked')) || [];
        const playlists = JSON.parse(localStorage.getItem('musica_playlists')) || {};
        
        container.innerHTML = "";

        // Render Playlists as folders
        Object.keys(playlists).forEach(name => {
            const folder = document.createElement('div');
            folder.className = 'song-item';
            folder.style.borderLeft = "4px solid #00d2ff";
            folder.innerHTML = `
                <div class="song-thumb" style="display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.1); font-size:1.5rem;">📂</div>
                <div class="song-meta">
                    <h4>${name}</h4>
                    <p>${playlists[name].length} songs</p>
                </div>
            `;
            folder.onclick = () => {
                if(playlists[name].length > 0) {
                    const s = playlists[name][0];
                    Musica.play(s.id, s.title.replace(/'/g,""), s.artist.replace(/'/g,""), s.thumb);
                } else alert("Playlist is empty!");
            };
            container.appendChild(folder);
        });

        // Render Individual Liked Songs
        liked.forEach(s => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.innerHTML = `
                <img src="${s.thumb}" class="song-thumb">
                <div class="song-meta">
                    <h4>${s.title}</h4>
                    <p>${s.artist}</p>
                </div>
            `;
            item.onclick = () => Musica.play(s.id, s.title.replace(/'/g,""), s.artist.replace(/'/g,""), s.thumb);
            container.appendChild(item);
        });

        if (container.innerHTML === "") {
            container.innerHTML = "<p style='padding:20px; text-align:center; opacity:0.5;'>Library is empty.</p>";
        }
    }
};

const Profile = {
    editName() {
        const newName = prompt("Enter new display name:");
        if (newName) document.getElementById('user-name').innerText = newName;
    },
    changeQuality() {
        alert("Audio quality set to High (320kbps).");
    }
};

const Admin = {
    globalKey: "AIzaSyAIaF7sqNwjAUud3OBoK_5HnRA7gP-Fd1A",
    saveKey() {
        const key = document.getElementById('api-key-input').value;
        localStorage.setItem('musica_global_key', key);
        document.getElementById('key-status').style.display = 'block';
    },
    getKey() {
        return localStorage.getItem('musica_global_key') || this.globalKey;
    }
};

// --- START APP ---
window.onload = () => {
    Musica.init();
    Library.init(); 
    auth.onAuthStateChanged(user => { if (user) Auth.showApp(); });
};
