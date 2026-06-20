// lunar-lander/game.js
class SynthEngine {
    constructor() {
        this.ctx = null;
        this.thrustGain = null;
        this.thrustOsc = null;
        this.alarmInterval = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
        if (!AudioContext) return;
        try {
            this.ctx = new AudioContext();

            // Thrust node chain: Noise/Triangle mix
            this.thrustGain = this.ctx.createGain();
            this.thrustGain.gain.value = 0;
            this.thrustGain.connect(this.ctx.destination);

            // Triangle low engine hum
            this.thrustOsc = this.ctx.createOscillator();
            this.thrustOsc.type = 'triangle';
            this.thrustOsc.frequency.value = 45;
            
            // Noise Generator for rumble
            const bufferSize = this.ctx.sampleRate * 2;
            const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = noiseBuffer;
            noiseNode.loop = true;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.value = 150;

            noiseNode.connect(noiseFilter);
            noiseFilter.connect(this.thrustGain);
            this.thrustOsc.connect(this.thrustGain);

            noiseNode.start(0);
            this.thrustOsc.start(0);
        } catch (e) {
            console.warn("Failed to initialize AudioContext:", e);
        }
    }

    setThrust(level) {
        if (!this.ctx) return;
        // Ramp gain values smoothly to avoid digital pops
        const targetGain = level * 0.15;
        this.thrustGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
        this.thrustOsc.frequency.setTargetAtTime(45 + level * 50, this.ctx.currentTime, 0.1);
    }

    playThrust(intensity) {
        this.setThrust(intensity);
    }

    playLowFuelAlarm() {
        this.startWarningAlarm();
    }

    playExplosion() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 1.5);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 1.6);
    }

    playSuccess() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);
            gain.gain.setValueAtTime(0, now + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.1, now + i * 0.15 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.5);
        });
    }

    startWarningAlarm() {
        if (this.alarmInterval) return;
        this.alarmInterval = setInterval(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }, 400);
    }

    stopWarningAlarm() {
        if (this.alarmInterval) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
    }
}

const audio = new SynthEngine();

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 800,
    height: 600,
    transparent: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let graphics;
let terrain;
let landerState;
let cursorKeys;
let stars = [];
let padTexts = [];
let currentScene;
let scoreText;
let fuelText;
let levelLivesText;
let speedText;

// Safe parameters
let score = 0;
let highScore = 0;
try {
    highScore = parseInt(localStorage.getItem('lander_high_score') || '0');
} catch (e) {
    // Fail-safe for non-browser or disabled localStorage environments
}
let lives = 3;
let fuel = 1000;
let level = 1;

function preload() {
    // Phaser doesn't need external graphics assets for vector mode!
}

function create() {
    currentScene = this;
    graphics = this.add.graphics();
    cursorKeys = this.input.keyboard.createCursorKeys();
    
    // Populate Vector Starfield
    for (let i = 0; i < 40; i++) {
        stars.push({
            x: Math.random() * 800,
            y: Math.random() * 450,
            alpha: Math.random()
        });
    }

    // Create HUD texts
    scoreText = this.add.text(20, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    });

    fuelText = this.add.text(220, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    });

    levelLivesText = this.add.text(420, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    });

    speedText = this.add.text(620, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    });

    resetLander();
    generateNewLevel(this);

    // Initialize audio on first user interaction gesture to unlock browser AudioContext autoplay policy
    const initAudioOnInteraction = () => {
        audio.init();
        window.removeEventListener('keydown', initAudioOnInteraction);
        window.removeEventListener('pointerdown', initAudioOnInteraction);
        window.removeEventListener('mousedown', initAudioOnInteraction);
        window.removeEventListener('touchstart', initAudioOnInteraction);
        window.removeEventListener('click', initAudioOnInteraction);
        window.removeEventListener('wheel', initAudioOnInteraction);
    };
    window.addEventListener('keydown', initAudioOnInteraction);
    window.addEventListener('pointerdown', initAudioOnInteraction);
    window.addEventListener('mousedown', initAudioOnInteraction);
    window.addEventListener('touchstart', initAudioOnInteraction);
    window.addEventListener('click', initAudioOnInteraction);
    window.addEventListener('wheel', initAudioOnInteraction);
}

function resetLander() {
    landerState = {
        x: 400,
        y: 80,
        vx: Math.random() * 40 - 20,
        vy: 10,
        angle: 0,
        fuel: fuel,
        thrust: 0
    };
}

function generateNewLevel(scene) {
    const activeScene = scene || currentScene || this;
    terrain = window.LanderCore.generateTerrain(800, 600, level);

    // Clear old pad texts to avoid duplicate game objects
    padTexts.forEach(txt => txt.destroy());
    padTexts = [];

    // Create landing pads text labels
    if (activeScene && activeScene.add) {
        terrain.landingPads.forEach(pad => {
            const txt = activeScene.add.text((pad.x1 + pad.x2) / 2, pad.y - 18, `${pad.multiplier}X`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: '#33ff33'
            }).setOrigin(0.5).setAlpha(0.7);
            padTexts.push(txt);
        });
    }
}

function drawVectorLander(g, x, y, angle, thrust) {
    g.save();
    g.translateCanvas(x, y);
    g.rotateCanvas((angle * Math.PI) / 180);

    // Neon Vector line style
    g.lineStyle(2, 0x33ff33, 1);

    // Lander Capsule body
    g.beginPath();
    g.moveTo(-10, -5);
    g.lineTo(10, -5);
    g.lineTo(12, 5);
    g.lineTo(-12, 5);
    g.closePath();
    g.strokePath();

    // Lander Legs
    g.lineBetween(-12, 5, -16, 15);
    g.lineBetween(12, 5, 16, 15);
    
    // Lander Footpads
    g.lineBetween(-18, 15, -14, 15);
    g.lineBetween(14, 15, 18, 15);

    // Thrust Thruster nozzle
    g.lineBetween(-4, 5, -2, 9);
    g.lineBetween(4, 5, 2, 9);
    g.lineBetween(-2, 9, 2, 9);

    // Dynamic Flame vectors
    if (thrust > 0) {
        g.lineStyle(1.5, 0xffaa00, 1);
        g.beginPath();
        g.moveTo(-3, 9);
        g.lineTo(0, 9 + thrust * 25 * (0.8 + Math.random() * 0.4));
        g.lineTo(3, 9);
        g.strokePath();
    }

    g.restore();
}

function update(time, delta) {
    const dt = delta / 1000;
    graphics.clear();

    // 1. Draw Starfield
    stars.forEach(s => {
        graphics.lineStyle(1, 0xffffff, s.alpha);
        graphics.strokePoint(s.x, s.y);
    });

    // 2. Draw Vector Terrain
    graphics.lineStyle(2, 0x33ff33, 1);
    graphics.beginPath();
    graphics.moveTo(terrain.points[0].x, terrain.points[0].y);
    for (let i = 1; i < terrain.points.length; i++) {
        graphics.lineTo(terrain.points[i].x, terrain.points[i].y);
    }
    graphics.strokePath();

    // Draw Landing Pads Multipliers
    terrain.landingPads.forEach(pad => {
        graphics.lineStyle(3, 0x33ff33, 1);
        graphics.lineBetween(pad.x1, pad.y, pad.x2, pad.y);
    });

    // 3. Game Flight State Physics Update
    if (lives > 0) {
        // Read desktop cursor inputs for testing vector logic
        let desiredThrust = landerState.thrust;
        if (cursorKeys.up.isDown) {
            desiredThrust = 1.0;
        } else {
            desiredThrust = 0;
        }

        if (cursorKeys.left.isDown) {
            landerState.angle -= 90 * dt;
        } else if (cursorKeys.right.isDown) {
            landerState.angle += 90 * dt;
        }

        landerState.thrust = desiredThrust;
        landerState = window.LanderCore.updatePhysicsState(landerState, dt);

        audio.setThrust(landerState.thrust);
        if (landerState.fuel < 200 && landerState.fuel > 0) {
            audio.startWarningAlarm();
        } else {
            audio.stopWarningAlarm();
        }

        // Render ship
        drawVectorLander(graphics, landerState.x, landerState.y, landerState.angle, landerState.thrust);
    } else {
        audio.setThrust(0);
        audio.stopWarningAlarm();
    }

    // Update HUD Stats
    if (scoreText) scoreText.setText(`SCORE: ${score}\nHIGH SCORE: ${highScore}`);
    if (fuelText) fuelText.setText(`FUEL: ${landerState ? Math.round(landerState.fuel) : 0}`);
    if (levelLivesText) levelLivesText.setText(`LEVEL: ${level}\nLIVES: ${lives}`);
    if (speedText) {
        if (landerState) {
            const vx = landerState.vx;
            const vy = landerState.vy;
            const angle = landerState.angle;
            speedText.setText(`H.SPEED: ${vx.toFixed(1)}\nV.SPEED: ${vy.toFixed(1)}\nANGLE: ${Math.round(angle)}`);
        } else {
            speedText.setText(`H.SPEED: 0.0\nV.SPEED: 0.0\nANGLE: 0`);
        }
    }
}
