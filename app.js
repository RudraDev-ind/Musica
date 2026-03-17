/**
 * MUSICA - Full Application Logic
 * Features: Ad-free Streaming, Liquid Visualizer, Background Play
 */

const Musica = {
    audio: new Audio(),
    isPlaying: false,
    visualizerInitialized: false,

    init() {
        this.audio.crossOrigin = "anonymous";
        this.audio.preload = "auto";
        
        this.setupEventListeners();
        this.setupMediaSession();
        
        // Handle audio ending
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updateUI();
        });

        console.log("Musica Engine Initialized");
    },

    // 1. Navigation Logic
    nav(pageId, el) {
        // Update Navigation UI
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        el.classList.add('active');

        // Smooth Section Transition
        const pages = document.querySelectorAll('.page-section');
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === pageId) {
                // Short timeout to allow CSS transition to trigger
                setTimeout(() => page.classList.add('active'), 50);
            }
        });
    },

    // 2. Player UI Logic
    toggleFull(open) {
        const overlay = document.getElementById('full-overlay');
        overlay.classList.toggle('open', open);
    },

    // 3. Streaming & Playback Logic
    async play(id, title, artist) {
        // Update UI immediately for responsiveness
        const mini = document.getElementById('mini-player');
        mini.classList.add('visible');
        
        document.getElementById('m-title').innerText = title;
        document.getElementById('m-artist').innerText = artist;
        document.getElementById('f-title').innerText = title;
        document.getElementById('f-artist').innerText = artist;

        try {
            // Using Piped API for ad-free stream extraction
            const res = await fetch(`https://pipedapi.kavin.rocks/streams/${id}`);
            const data = await res.json();
            
            // Prioritize high quality m4a audio
            const stream = data.audioStreams.find(s => s.format === 'M4A') || data.audioStreams[0];
            
            if (stream) {
                this.audio.src = stream.url;
                this.audio.play();
                this.isPlaying = true;
                this.updateUI();
                this.updateMediaMetadata(title, artist);
                
                // Initialize visualizer on first actual play
                if (!this.visualizerInitialized) {
                    Visualizer.init(this.audio);
                    this.visualizerInitialized = true;
                }
            }
        } catch (e) {
            console.error("Playback error:", e);
            alert("Stream unavailable. Try another song.");
        }
    },

    togglePlay() {
        if (this.audio.src) {
            if (this.audio.paused) {
                this.audio.play();
                this.isPlaying = true;
            } else {
                this.audio.pause();
                this.isPlaying = false;
            }
            this.updateUI();
        }
    },

    updateUI() {
        const miniBtn = document.querySelector('.mini-player button');
        const bigBtn = document.querySelector('.play-big');
        
        const icon = this.isPlaying ? '⏸' : '▶';
        if (miniBtn) miniBtn.innerText = icon;
        if (bigBtn) bigBtn.innerText = icon;
        
        document.getElementById('mini-player').classList.toggle('playing', this.isPlaying);
    },

    // 4. Android Background Controls (Media Session)
    setupMediaSession() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
            navigator.mediaSession.setActionHandler('previoustrack', () => console.log("Prev"));
            navigator.mediaSession.setActionHandler('nexttrack', () => console.log("Next"));
        }
    },

    updateMediaMetadata(title, artist) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title,
                artist: artist,
                artwork: [
                    { src: 'https://via.placeholder.com/512x512/3a0088/ffffff?text=Musica', sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    },

    setupEventListeners() {
        // Ensures visualizer starts after user interaction
        document.body.addEventListener('click', () => {
            if (this.audio.paused && this.isPlaying) this.audio.play();
        }, { once: true });
    }
};

/**
 * LIQUID VISUALIZER ENGINE
 */
const Visualizer = {
    ctx: null,
    analyser: null,
    dataArray: [],

    init(audioElement) {
        const canvas = document.getElementById('visualizer');
        if (!canvas) return;
        this.ctx = canvas.getContext('2d');
        
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaElementSource(audioElement);
        
        source.connect(this.analyser);
        this.analyser.connect(audioCtx.destination);
        
        this.analyser.fftSize = 64; 
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        this.animate();
    },

    animate() {
        const canvas = document.getElementById('visualizer');
        if (!canvas) return;
        
        const WIDTH = canvas.width = window.innerWidth;
        const HEIGHT = canvas.height = window.innerHeight;

        requestAnimationFrame(() => this.animate());

        this.analyser.getByteFrequencyData(this.dataArray);
        this.ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const barWidth = (WIDTH / this.dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * HEIGHT * 0.4;
            
            // Liquid Gradient Style
            const gradient = this.ctx.createLinearGradient(0, HEIGHT, 0, HEIGHT - barHeight);
            gradient.addColorStop(0, 'rgba(0, 210, 255, 0.1)');
            gradient.addColorStop(1, 'rgba(58, 0, 136, 0.7)');

            this.ctx.fillStyle = gradient;
            // Draw rounded bars for liquid feel
            this.ctx.fillRect(x, HEIGHT - barHeight, barWidth - 4, barHeight);

            x += barWidth;
        }
    }
};

// Start the Application
window.onload = () => Musica.init();

