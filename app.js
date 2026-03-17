ed.splice(index, 1);
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
