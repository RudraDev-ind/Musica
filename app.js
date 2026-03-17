 this.isPlaying ? '⏸' : '▶';
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
    init() { this.renderLiked(); },

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
        if (!playlists[pName]) return alert("Playlist not found. Create it first!");
        
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

        // 1. Folders
        Object.keys(playlists).forEach(name => {
            const folder = document.createElement('div');
            folder.className = 'song-item';
            folder.style.background = "rgba(0, 210, 255, 0.05)";
            folder.style.borderLeft = "4px solid #00d2ff";
            folder.innerHTML = `
                <div class="song-thumb" style="display:flex; align-items:center; justify-content:center; font-size:1.5rem;">📂</div>
                <div class="song-meta"><h4>${name}</h4><p>${playlists[name].length} songs</p></div>
            `;
            folder.onclick = () => {
                if(playlists[name].length > 0) {
                    const s = playlists[name][0];
                    Musica.play(s.id, s.title.replace(/'/g,""), s.artist.replace(/'/g,""), s.thumb);
                } else alert("Playlist is empty!");
            };
            container.appendChild(folder);
        });

        // 2. Individual Songs
        liked.forEach(s => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.innerHTML = `<img src="${s.thumb}" class="song-thumb"><div class="song-meta"><h4>${s.title}</h4><p>${s.artist}</p></div>`;
            item.onclick = () => Musica.play(s.id, s.title.replace(/'/g,""), s.artist.replace(/'/g,""), s.thumb);
            container.appendChild(item);
        });

        if (container.innerHTML === "") container.innerHTML = "<p style='padding:20px; text-align:center; opacity:0.5;'>Library is empty.</p>";
    }
};

const Admin = {
    globalKey: "AIzaSyAIaF7sqNwjAUud3OBoK_5HnRA7gP-Fd1A",
    saveKey() {
        const key = document.getElementById('api-key-input').value;
        localStorage.setItem('musica_global_key', key);
        document.getElementById('key-status').style.display = 'block';
    },
    getKey() { return localStorage.getItem('musica_global_key') || this.globalKey; }
};

// --- START APP ---
window.onload = () => {
    Musica.init();
    Library.init(); 
    auth.onAuthStateChanged(user => { if (user) Auth.showApp(); });
};
