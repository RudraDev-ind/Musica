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

const Musica = {
    audio: new Audio(),
    currentSong: null,
    isPlaying: false,

    init() {
        this.audio.crossOrigin = "anonymous";
        this.loadTrending();
        
        // Audio Event Listeners
        this.audio.onplay = () => { this.isPlaying = true; this.updateUI(); };
        this.audio.onpause = () => { this.isPlaying = false; this.updateUI(); };
        this.audio.onended = () => { this.next(); };

        // Media Session (Lock Screen Controls)
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
        }
    },

    // --- 2. SEARCH & TRENDING ENGINE ---
    async search() {
        const query = document.getElementById('search-input').value;
        const apiKey = Admin.getKey();
        if (!query) return;

        // Switch to Search View
        this.nav('home', document.querySelector('.nav-item:nth-child(2)'));
        document.getElementById('home-default').style.display = 'none';
        document.getElementById('search-results').style.display = 'block';
        document.getElementById('results-list').innerHTML = "Searching...";

        try {
            // Priority: YouTube Official API
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
            // Fallback: Piped API
            const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${query}&filter=music_songs`);
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
        try {
            const res = await fetch(`https://pipedapi.kavin.rocks/trending?region=${region}`);
            const data = await res.json();
            const songs = data.filter(i => i.type === 'stream').slice(0, 15).map(s => ({
                id: s.url.split('=')[1],
                title: s.title,
                artist: s.uploaderName,
                thumb: s.thumbnail
            }));
            this.renderSongs(songs, 'trending-list');
        } catch(e) { console.error("Trending failed", e); }
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

    // --- 3. PLAYBACK CONTROL ---
    async play(id, title, artist, thumb) {
        this.currentSong = { id, title, artist, thumb };
        
        // UI Sync
        document.getElementById('mini-player').classList.add('visible');
        document.querySelectorAll('[id$="-title"]').forEach(el => el.innerText = title);
        document.querySelectorAll('[id$="-artist"]').forEach(el => el.innerText = artist);
        document.querySelectorAll('[id$="-art"]').forEach(el => el.src = thumb);

        // Fetch Audio Stream
        const res = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
        const data = await res.json();
        const stream = data.audioStreams.find(s => s.format === 'M4A' || s.bitrate > 120000);
        
        this.audio.src = stream.url;
        this.audio.play();
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
        el.classList.add('active');
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
    // 1. REGISTER NEW ACCOUNT
    register() {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;

        if (!email || !pass) {
            alert("Please fill in both email and password fields.");
            return;
        }

        if (pass.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        auth.createUserWithEmailAndPassword(email, pass)
            .then(() => {
                alert("Account Created Successfully!");
                this.showApp();
            })
            .catch((error) => alert(error.message));
    },

    // 2. LOGIN TO EXISTING ACCOUNT
    login() {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;

        if (!email || !pass) {
            alert("Please enter your email and password.");
            return;
        }

        auth.signInWithEmailAndPassword(email, pass)
            .then(() => {
                this.showApp();
            })
            .catch((error) => alert("Login Failed: " + error.message));
    },

    // 3. FORGOT PASSWORD (RESET)
    resetPassword() {
        const email = document.getElementById('email').value.trim();

        if (!email) {
            alert("Please enter your email address first to receive a reset link.");
            return;
        }

        auth.sendPasswordResetEmail(email)
            .then(() => {
                alert("Password reset link sent! Check your inbox (and spam folder).");
            })
            .catch((error) => alert("Error: " + error.message));
    },

    // 4. TRANSITION UI TO APP
    showApp() {
        const user = auth.currentUser;
        if (user) {
            document.getElementById('auth-overlay').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            // Sets name from email (e.g., rudra@gmail.com -> rudra)
            const userName = user.email.split('@')[0];
            document.getElementById('user-name').innerText = userName;
        }
    },

    // 5. LOGOUT
    logout() {
        auth.signOut().then(() => {
            location.reload();
        });
    }
};


    login() {
        const email = document.getElementById('email').value.trim();
        const pass = document.getElementById('password').value;

        if (!email || !pass) {
            alert("Please enter your email and password to login.");
            return;
        }

        auth.signInWithEmailAndPassword(email, pass)
            .then(() => this.showApp())
            .catch(err => alert(err.message));
    },
    // ... keep showApp() and logout() as they are


    login() {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        auth.signInWithEmailAndPassword(email, pass)
            .then(() => this.showApp())
            .catch(err => alert(err.message));
    },

    showApp() {
        const user = auth.currentUser;
        if (user) {
            document.getElementById('auth-overlay').style.display = 'none';
            document.getElementById('main-app').style.display = 'flex';
            document.getElementById('user-name').innerText = user.email.split('@')[0];
        }
    },

    logout() {
        auth.signOut().then(() => location.reload());
    }
};

// --- 5. ADMIN & KEYS ---
const Admin = {
    globalKey: "AIzaSyAIaF7sqNwjAUud3OBoK_5HnRA7gP-Fd1A", // Update this if you hardcode it

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
    auth.onAuthStateChanged(user => { if (user) Auth.showApp(); });
};
