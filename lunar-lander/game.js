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
            this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const noiseNode = this.ctx.createBufferSource();
            noiseNode.buffer = this.noiseBuffer;
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
        
        // Use pre-created noise buffer or create one if not initialized
        let buffer = this.noiseBuffer;
        if (!buffer) {
            const bufferSize = this.ctx.sampleRate * 2;
            buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        // Filter sweep: starts high (1000Hz) and decays exponentially to 50Hz
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + 1.5);

        // Rapid gain decay envelope
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noiseNode.start(now);
        noiseNode.stop(now + 1.6);
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
let landerGraphics;
let landerGraphicsWrap;
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

// Mobile touch button state
window.isThrustingButtonActive = false;
window.isLeftButtonActive = false;
window.isRightButtonActive = false;

// Screen overlay texts
let screenTitleText;
let screenDetailText;
let screenPromptText;

// Game States
const STATE_INTRO = 'INTRO';
const STATE_PLAYING = 'PLAYING';
const STATE_SUCCESS = 'SUCCESS';
const STATE_CRASHED = 'CRASHED';
const STATE_GAMEOVER = 'GAMEOVER';

let gameState = STATE_INTRO;
let debris = [];

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
    landerGraphics = this.add.graphics();
    landerGraphicsWrap = this.add.graphics();
    cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
    
    // Populate Vector Starfield
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: Math.random() * 4000,
            y: Math.random() * 450,
            alpha: Math.random()
        });
    }

    // Create HUD texts
    scoreText = this.add.text(20, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0);

    fuelText = this.add.text(220, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0);

    levelLivesText = this.add.text(420, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0);

    speedText = this.add.text(620, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0);

    // Title/Screen overlay texts
    screenTitleText = this.add.text(400, 160, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '28px',
        color: '#33ff33',
        align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    screenDetailText = this.add.text(400, 320, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#33ff33',
        align: 'center',
        lineSpacing: 12
    }).setOrigin(0.5).setScrollFactor(0);

    screenPromptText = this.add.text(400, 480, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#33ff33',
        align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    resetLander();
    generateNewLevel(this);
    setScreenState(STATE_INTRO);

    // Keyboard space bar listener for screen transition
    this.input.keyboard.on('keydown-SPACE', () => {
        if (gameState === STATE_INTRO || gameState === STATE_GAMEOVER) {
            startGame();
        }
    });

    // Pointer click/tap listener for screen transition
    this.input.on('pointerdown', () => {
        if (gameState === STATE_INTRO || gameState === STATE_GAMEOVER) {
            startGame();
        }
    });

    // Initialize audio on first user interaction gesture to unlock browser AudioContext autoplay policy
    const initAudioOnInteraction = () => {
        audio.init();
        
        // Request fullscreen on mobile/touch devices to hide address bar
        try {
            const isMobile = window.matchMedia('(pointer: coarse)').matches;
            if (isMobile) {
                const fsEl = document.documentElement;
                if (fsEl.requestFullscreen) {
                    fsEl.requestFullscreen();
                } else if (fsEl.webkitRequestFullscreen) {
                    fsEl.webkitRequestFullscreen();
                }
            }
        } catch (e) {
            console.warn("Fullscreen request failed:", e);
        }

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

    // Mouse Wheel listener for Desktop
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
        if (gameState !== STATE_PLAYING) return;
        let currentThrust = landerState.thrust;
        if (deltaY < 0) {
            currentThrust = Math.min(1.0, currentThrust + 0.1);
        } else {
            currentThrust = Math.max(0.0, currentThrust - 0.1);
        }
        landerState.thrust = currentThrust;

        // Update virtual visual sliders if they are displayed
        const leftThrustSlider = document.getElementById('thrust-left');
        const rightThrustSlider = document.getElementById('thrust-right');
        if (leftThrustSlider) leftThrustSlider.value = currentThrust * 100;
        if (rightThrustSlider) rightThrustSlider.value = currentThrust * 100;
    });

    // Touch Screen bindings for Mobile Sliders (Mirrored logic)
    const leftThrustSlider = document.getElementById('thrust-left');
    const rightThrustSlider = document.getElementById('thrust-right');
    const leftSteerSlider = document.getElementById('steer-left');
    const rightSteerSlider = document.getElementById('steer-right');

    const syncThrust = (val) => {
        audio.init(); // Initialize audio context on first interactive gesture
        if (gameState !== STATE_PLAYING) return;
        const levelVal = val / 100;
        landerState.thrust = levelVal;
        if (leftThrustSlider) leftThrustSlider.value = val;
        if (rightThrustSlider) rightThrustSlider.value = val;
    };

    if (leftThrustSlider) leftThrustSlider.addEventListener('input', (e) => syncThrust(e.target.value));
    if (rightThrustSlider) rightThrustSlider.addEventListener('input', (e) => syncThrust(e.target.value));

    const syncSteer = (val) => {
        audio.init();
        if (gameState !== STATE_PLAYING) return;
        // Steer value mapping: slider value controls rotational rate
        landerState.targetSteerRate = parseFloat(val) * 2;
        landerState.targetSteerAngle = parseFloat(val); // Keep for compatibility/test
        if (leftSteerSlider) leftSteerSlider.value = val;
        if (rightSteerSlider) rightSteerSlider.value = val;
    };

    if (leftSteerSlider) leftSteerSlider.addEventListener('input', (e) => syncSteer(e.target.value));
    if (rightSteerSlider) rightSteerSlider.addEventListener('input', (e) => syncSteer(e.target.value));
    
    // Snap slider back to center when released
    const releaseSteer = () => {
        syncSteer(0);
    };
    if (leftSteerSlider) {
        leftSteerSlider.addEventListener('touchend', releaseSteer);
        leftSteerSlider.addEventListener('mouseup', releaseSteer);
    }
    if (rightSteerSlider) {
        rightSteerSlider.addEventListener('touchend', releaseSteer);
        rightSteerSlider.addEventListener('mouseup', releaseSteer);
    }

    // Touch Button bindings for Mobile Portrait Controls
    const btnThrust = document.getElementById('btn-thrust');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    if (btnThrust) {
        const startThrust = (e) => {
            e.preventDefault();
            audio.init();
            window.isThrustingButtonActive = true;
            btnThrust.classList.add('active');
        };
        const stopThrust = (e) => {
            e.preventDefault();
            window.isThrustingButtonActive = false;
            btnThrust.classList.remove('active');
            const leftThrustSlider = document.getElementById('thrust-left');
            const rightThrustSlider = document.getElementById('thrust-right');
            if (leftThrustSlider) leftThrustSlider.value = 0;
            if (rightThrustSlider) rightThrustSlider.value = 0;
        };
        btnThrust.addEventListener('mousedown', startThrust);
        btnThrust.addEventListener('touchstart', startThrust, { passive: false });
        btnThrust.addEventListener('mouseup', stopThrust);
        btnThrust.addEventListener('touchend', stopThrust);
        btnThrust.addEventListener('touchcancel', stopThrust);
        btnThrust.addEventListener('mouseleave', stopThrust);
    }

    if (btnLeft) {
        const startLeft = (e) => {
            e.preventDefault();
            audio.init();
            window.isLeftButtonActive = true;
            btnLeft.classList.add('active');
        };
        const stopLeft = (e) => {
            e.preventDefault();
            window.isLeftButtonActive = false;
            btnLeft.classList.remove('active');
        };
        btnLeft.addEventListener('mousedown', startLeft);
        btnLeft.addEventListener('touchstart', startLeft, { passive: false });
        btnLeft.addEventListener('mouseup', stopLeft);
        btnLeft.addEventListener('touchend', stopLeft);
        btnLeft.addEventListener('touchcancel', stopLeft);
        btnLeft.addEventListener('mouseleave', stopLeft);
    }

    if (btnRight) {
        const startRight = (e) => {
            e.preventDefault();
            audio.init();
            window.isRightButtonActive = true;
            btnRight.classList.add('active');
        };
        const stopRight = (e) => {
            e.preventDefault();
            window.isRightButtonActive = false;
            btnRight.classList.remove('active');
        };
        btnRight.addEventListener('mousedown', startRight);
        btnRight.addEventListener('touchstart', startRight, { passive: false });
        btnRight.addEventListener('mouseup', stopRight);
        btnRight.addEventListener('touchend', stopRight);
        btnRight.addEventListener('touchcancel', stopRight);
        btnRight.addEventListener('mouseleave', stopRight);
    }

    // Suspend and resume the Web Audio context when the tab loses/gains focus
    this.game.events.on('blur', () => { if (audio.ctx) audio.ctx.suspend(); });
    this.game.events.on('focus', () => { if (audio.ctx) audio.ctx.resume(); });
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    fuel = 1000;
    resetLander();
    generateNewLevel(currentScene);
    setScreenState(STATE_PLAYING);
    audio.init();

    // Request fullscreen on mobile/touch devices to hide address bar
    try {
        const isMobile = window.matchMedia('(pointer: coarse)').matches;
        if (isMobile) {
            const fsEl = document.documentElement;
            if (fsEl.requestFullscreen) {
                fsEl.requestFullscreen();
            } else if (fsEl.webkitRequestFullscreen) {
                fsEl.webkitRequestFullscreen();
            }
        }
    } catch (e) {
        console.warn("Fullscreen request failed:", e);
    }
}

function setScreenState(newState) {
    gameState = newState;
    
    screenTitleText.setText('');
    screenDetailText.setText('');
    screenPromptText.setText('');
    
    padTexts.forEach(txt => {
        if (gameState === STATE_PLAYING) {
            txt.setVisible(true);
        } else {
            txt.setVisible(false);
        }
    });

    if (gameState === STATE_INTRO) {
        screenTitleText.setText('LUNAR LANDER');
        screenDetailText.setText(
            'DESKTOP CONTROLS:\n' +
            'W / UP ARROW    - THRUST\n' +
            'A/D / L/R ARROW - STEER\n' +
            'MOUSE WHEEL     - FINE THRUST\n\n' +
            'MOBILE CONTROLS:\n' +
            'USE ON-SCREEN SLIDERS\n\n' +
            'MISSION:\n' +
            'LAND SAFELY ON FLAT PADS'
        );
        screenPromptText.setText('PRESS SPACE OR CLICK TO START');
        
        if (landerState) {
            landerState.thrust = 0;
        }
        audio.setThrust(0);
        audio.stopWarningAlarm();
    } else if (gameState === STATE_PLAYING) {
        // Active gameplay
    } else if (gameState === STATE_SUCCESS) {
        screenTitleText.setText('SAFE LANDING!');
        screenPromptText.setText('NEXT LEVEL STARTING...');
    } else if (gameState === STATE_CRASHED) {
        screenTitleText.setText('CRASHED!');
        screenPromptText.setText(lives > 0 ? 'RESETTING LANDER...' : '');
    } else if (gameState === STATE_GAMEOVER) {
        screenTitleText.setText('GAME OVER');
        screenDetailText.setText(`FINAL SCORE: ${score}\n\nLEVEL REACHED: ${level}`);
        screenPromptText.setText('PRESS SPACE OR CLICK TO REPLAY');
        
        if (score > highScore) {
            highScore = score;
            try {
                localStorage.setItem('lander_high_score', highScore.toString());
            } catch (e) {}
        }
    }
}

function syncSlidersToLander() {
    const leftThrustSlider = document.getElementById('thrust-left');
    const rightThrustSlider = document.getElementById('thrust-right');
    const leftSteerSlider = document.getElementById('steer-left');
    const rightSteerSlider = document.getElementById('steer-right');

    const thrustVal = landerState ? landerState.thrust * 100 : 0;
    if (leftThrustSlider) leftThrustSlider.value = thrustVal;
    if (rightThrustSlider) rightThrustSlider.value = thrustVal;
    if (leftSteerSlider) leftSteerSlider.value = 0;
    if (rightSteerSlider) rightSteerSlider.value = 0;
    if (landerState) {
        landerState.targetSteerRate = 0;
        landerState.targetSteerAngle = 0; // Keep targetSteerAngle for reference/test
    }
}

function resetLander() {
    landerState = {
        x: 400,
        y: 80,
        vx: Math.random() * 40 - 20,
        vy: 10,
        angle: 0,
        fuel: fuel,
        thrust: 0,
        targetSteerRate: 0,
        targetSteerAngle: 0
    };
    if (currentScene && currentScene.cameras && currentScene.cameras.main) {
        currentScene.cameras.main.scrollX = 0;
    }
    syncSlidersToLander();
}

function generateNewLevel(scene) {
    const activeScene = scene || currentScene || this;
    terrain = window.LanderCore.generateTerrain(4000, 600, 12, level);

    // Clear old pad texts to avoid duplicate game objects
    padTexts.forEach(txt => txt.destroy());
    padTexts = [];

    // Create landing pads text labels
    if (activeScene && activeScene.add) {
        terrain.landingPads.forEach(pad => {
            const baseX = (pad.x1 + pad.x2) / 2;
            const txt = activeScene.add.text(baseX, pad.y - 18, `${pad.multiplier}X`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: '#33ff33'
            }).setOrigin(0.5).setAlpha(0.7);
            txt.baseX = baseX;
            padTexts.push(txt);
            if (gameState !== STATE_PLAYING) {
                txt.setVisible(false);
            }
        });
    }
}

function triggerExplosion() {
    audio.playExplosion();
    debris = [];
    
    const rad = (landerState.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    // List of local segments relative to the lander's center
    const localSegments = [
        // Body Capsule
        { x1: -10, y1: -5, x2: 10, y2: -5 },
        { x1: 10, y1: -5, x2: 12, y2: 5 },
        { x1: 12, y1: 5, x2: -12, y2: 5 },
        { x1: -12, y1: 5, x2: -10, y2: -5 },
        // Legs
        { x1: -12, y1: 5, x2: -16, y2: 15 },
        { x1: 12, y1: 5, x2: 16, y2: 15 },
        // Footpads
        { x1: -18, y1: 15, x2: -14, y2: 15 },
        { x1: 14, y1: 15, x2: 18, y2: 15 },
        // Engine Nozzle
        { x1: -4, y1: 5, x2: -2, y2: 9 },
        { x1: 4, y1: 5, x2: 2, y2: 9 },
        { x1: -2, y1: 9, x2: 2, y2: 9 }
    ];

    localSegments.forEach(seg => {
        // Rotate local endpoints to world space (relative to lander center)
        const wx1 = seg.x1 * cos - seg.y1 * sin;
        const wy1 = seg.x1 * sin + seg.y1 * cos;
        const wx2 = seg.x2 * cos - seg.y2 * sin;
        const wy2 = seg.x2 * sin + seg.y2 * cos;

        // Calculate center of this segment in world space
        const cx = landerState.x + (wx1 + wx2) / 2;
        const cy = landerState.y + (wy1 + wy2) / 2;

        const dx = wx2 - wx1;
        const dy = wy2 - wy1;

        debris.push({
            x: cx,
            y: cy,
            vx: landerState.vx + (Math.random() - 0.5) * 60,
            vy: landerState.vy - Math.random() * 20 - 15,
            angle: landerState.angle,
            vAngle: (Math.random() - 0.5) * 360,
            lx1: -dx / 2,
            ly1: -dy / 2,
            lx2: dx / 2,
            ly2: dy / 2
        });
    });
}

function updateAndDrawDebris(g, dt) {
    g.lineStyle(2, 0x33ff33, 1);
    const gravity = 25.0;
    
    debris.forEach(d => {
        d.vy += gravity * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.angle += d.vAngle * dt;

        // Wrap debris horizontally at 4000
        d.x = (d.x % 4000 + 4000) % 4000;

        const rad = (d.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const x1 = d.x + d.lx1 * cos - d.ly1 * sin;
        const y1 = d.y + d.lx1 * sin + d.ly1 * cos;
        const x2 = d.x + d.lx2 * cos - d.ly2 * sin;
        const y2 = d.y + d.lx2 * sin + d.ly2 * cos;

        g.lineBetween(x1, y1, x2, y2);

        // Double-draw debris if near horizontal wrapping borders
        if (d.x < 1600) {
            g.lineBetween(x1 + 4000, y1, x2 + 4000, y2);
        } else if (d.x > 2400) {
            g.lineBetween(x1 - 4000, y1, x2 - 4000, y2);
        }
    });
}

function drawVectorLander(g, x, y, angle, thrust) {
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
}

function update(time, delta) {
    const dt = delta / 1000;
    graphics.clear();

    // 1. Draw Starfield in a single batch with static alpha
    graphics.fillStyle(0xffffff, 0.7);
    stars.forEach(s => {
        graphics.fillPoint(s.x, s.y, 1);
        if (s.x < 1600) {
            graphics.fillPoint(s.x + 4000, s.y, 1);
        } else if (s.x > 2400) {
            graphics.fillPoint(s.x - 4000, s.y, 1);
        }
    });

    // 2. Draw Vector Terrain
    if (terrain) {
        const offsets = [0, 4000, -4000];
        offsets.forEach(offset => {
            graphics.lineStyle(2, 0x33ff33, 1);
            graphics.beginPath();
            graphics.moveTo(terrain.points[0].x + offset, terrain.points[0].y);
            for (let i = 1; i < terrain.points.length; i++) {
                graphics.lineTo(terrain.points[i].x + offset, terrain.points[i].y);
            }
            graphics.strokePath();

            // Draw Landing Pads Multipliers
            terrain.landingPads.forEach(pad => {
                graphics.lineStyle(3, 0x33ff33, 1);
                graphics.lineBetween(pad.x1 + offset, pad.y, pad.x2 + offset, pad.y);
            });
        });
    }

    // 3. Game Flight State Physics Update
    if (gameState === STATE_PLAYING) {
        // Read desktop cursor inputs for testing vector logic
        let desiredThrust = landerState.thrust;

        // Check keyboard or mobile button input for thrust (Arrow Up, W, or mobile button)
        const isThrusting = (cursorKeys.up && cursorKeys.up.isDown) || 
                            (this.wasd && this.wasd.up && this.wasd.up.isDown) ||
                            window.isThrustingButtonActive;
        
        if (isThrusting) {
            desiredThrust = 1.0;
            // Also update the slider UI values to sync when keyboard/button is held
            const leftThrustSlider = document.getElementById('thrust-left');
            const rightThrustSlider = document.getElementById('thrust-right');
            if (leftThrustSlider) leftThrustSlider.value = 100;
            if (rightThrustSlider) rightThrustSlider.value = 100;
            this.wasKeyboardThrusting = true;
        } else if (this.wasKeyboardThrusting || window.isThrustingButtonActive === false) {
            // Read from slider if not active keyboard/button thrusting
            const leftThrustSlider = document.getElementById('thrust-left');
            desiredThrust = leftThrustSlider ? parseFloat(leftThrustSlider.value) / 100 : 0;
            this.wasKeyboardThrusting = false;
        }

        // Steer angle blending (Keyboard arrow / WASD or mobile buttons override touch steer slider)
        if ((cursorKeys.left && cursorKeys.left.isDown) || 
            (this.wasd && this.wasd.left && this.wasd.left.isDown) ||
            window.isLeftButtonActive) {
            landerState.angle -= 90 * dt;
        } else if ((cursorKeys.right && cursorKeys.right.isDown) || 
                   (this.wasd && this.wasd.right && this.wasd.right.isDown) ||
                   window.isRightButtonActive) {
            landerState.angle += 90 * dt;
        } else if (landerState.targetSteerRate !== undefined) {
            // Apply slider rotational velocity (for compatibility with tests)
            landerState.angle += landerState.targetSteerRate * dt;
        }

        landerState.thrust = desiredThrust;
        landerState = window.LanderCore.updatePhysicsState(landerState, dt);

        // Adjust scroll margins dynamically based on current zoom scale
        const currentZoom = this.cameras.main.zoom;
        const W_world = 800 / currentZoom;
        const M_world = 120 / currentZoom;
        
        let screenX_world = landerState.x - this.cameras.main.scrollX;
        // Wrap screenX_world to [-2000, 2000] to handle the 4000px wrap boundary
        screenX_world = ((screenX_world + 2000) % 4000 + 4000) % 4000 - 2000;
        
        if (screenX_world > W_world - M_world) {
            this.cameras.main.scrollX = landerState.x - (W_world - M_world);
        } else if (screenX_world < M_world) {
            this.cameras.main.scrollX = landerState.x - M_world;
        }
        
        // Wrap camera scroll X at [0, 4000]
        let sX = this.cameras.main.scrollX % 4000;
        if (sX < 0) sX += 4000;
        this.cameras.main.scrollX = sX;

        audio.setThrust(landerState.thrust);
        if (landerState.fuel < 200 && landerState.fuel > 0) {
            audio.startWarningAlarm();
        } else {
            audio.stopWarningAlarm();
        }

        // Check for collision
        const collision = window.LanderCore.checkCollision(landerState, terrain);
        if (collision.collided) {
            // Find matching landing pad
            const pad = terrain.landingPads.find(p => landerState.x >= p.x1 && landerState.x <= p.x2);
            if (pad) {
                const check = window.LanderCore.checkLandingCondition(landerState.vx, landerState.vy, landerState.angle);
                if (check.success) {
                    // Safe Landing
                    audio.setThrust(0);
                    audio.stopWarningAlarm();
                    audio.playSuccess();
                    
                    const landingScore = Math.round(pad.multiplier * landerState.fuel);
                    score += landingScore;
                    if (score > highScore) {
                        highScore = score;
                    }
                    
                    setScreenState(STATE_SUCCESS);
                    screenDetailText.setText(
                        `SAFE LANDING!\n\n` +
                        `PAD MULTIPLIER: ${pad.multiplier}X\n` +
                        `REMAINING FUEL: ${Math.round(landerState.fuel)}\n` +
                        `POINTS AWARDED : ${landingScore}`
                    );
                    
                    this.time.delayedCall(2000, () => {
                        level++;
                        fuel = 1000; // Replenish fuel
                        resetLander();
                        generateNewLevel(currentScene);
                        setScreenState(STATE_PLAYING);
                    });
                } else {
                    // Failed Landing Conditions on Pad
                    audio.setThrust(0);
                    audio.stopWarningAlarm();
                    triggerExplosion();
                    lives--;
                    
                    setScreenState(STATE_CRASHED);
                    let reasonText = 'CRASHED ON PAD!\n\n';
                    if (check.reason === 'speed') {
                        reasonText += `SPEED TOO HIGH!\n` +
                            `H.SPEED: ${landerState.vx.toFixed(1)} (MAX 15.0)\n` +
                            `V.SPEED: ${landerState.vy.toFixed(1)} (MAX 30.0)`;
                      } else if (check.reason === 'angle') {
                          reasonText += `ANGLE TOO CROOKED!\n` +
                              `ANGLE: ${Math.round(landerState.angle)} DEG (MAX 5)`;
                      }
                      screenDetailText.setText(reasonText);
                      
                      this.time.delayedCall(2000, () => {
                          if (lives > 0) {
                              fuel = 1000; // Reset/replenish fuel
                              resetLander();
                              setScreenState(STATE_PLAYING);
                          } else {
                              setScreenState(STATE_GAMEOVER);
                          }
                      });
                  }
              } else {
                  // Crashed on general terrain
                  audio.setThrust(0);
                  audio.stopWarningAlarm();
                  triggerExplosion();
                  lives--;
                  
                  setScreenState(STATE_CRASHED);
                  screenDetailText.setText('CRASHED ON TERRAIN!\n\nMUST LAND ON FLAT PADS.');
                  
                  this.time.delayedCall(2000, () => {
                      if (lives > 0) {
                          fuel = 1000; // Reset/replenish fuel
                          resetLander();
                          setScreenState(STATE_PLAYING);
                      } else {
                          setScreenState(STATE_GAMEOVER);
                      }
                  });
              }
          }
  
          if (gameState === STATE_PLAYING) {
              landerGraphics.clear();
              drawVectorLander(landerGraphics, 0, 0, 0, landerState.thrust);
              landerGraphics.setPosition(landerState.x, landerState.y);
              landerGraphics.setAngle(landerState.angle);

              // Render wrapping double-draw
              landerGraphicsWrap.clear();
              if (landerState.x < 1600) {
                  landerGraphicsWrap.setVisible(true);
                  drawVectorLander(landerGraphicsWrap, 0, 0, 0, landerState.thrust);
                  landerGraphicsWrap.setPosition(landerState.x + 4000, landerState.y);
                  landerGraphicsWrap.setAngle(landerState.angle);
              } else if (landerState.x > 2400) {
                  landerGraphicsWrap.setVisible(true);
                  drawVectorLander(landerGraphicsWrap, 0, 0, 0, landerState.thrust);
                  landerGraphicsWrap.setPosition(landerState.x - 4000, landerState.y);
                  landerGraphicsWrap.setAngle(landerState.angle);
              } else {
                  landerGraphicsWrap.setVisible(false);
              }
          }
      } else if (gameState === STATE_SUCCESS) {
          audio.setThrust(0);
          audio.stopWarningAlarm();
          // Keep ship drawn frozen at its landed spot
          landerGraphics.clear();
          drawVectorLander(landerGraphics, 0, 0, 0, 0);
          landerGraphics.setPosition(landerState.x, landerState.y);
          landerGraphics.setAngle(landerState.angle);
          landerGraphicsWrap.setVisible(false);
      } else if (gameState === STATE_CRASHED) {
          audio.setThrust(0);
          audio.stopWarningAlarm();
          landerGraphics.clear();
          landerGraphicsWrap.setVisible(false);
          updateAndDrawDebris(graphics, dt);
      } else {
          audio.setThrust(0);
          audio.stopWarningAlarm();
          landerGraphics.clear();
          landerGraphicsWrap.setVisible(false);
      }

    // Update landing pad text label positions to wrap seamlessly
    if (padTexts) {
        const camX = this.cameras.main.scrollX;
        padTexts.forEach(txt => {
            if (txt.baseX !== undefined) {
                let relativeX = txt.baseX - camX;
                relativeX = ((relativeX + 2000) % 4000 + 4000) % 4000 - 2000;
                txt.x = camX + relativeX;
            }
        });
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
