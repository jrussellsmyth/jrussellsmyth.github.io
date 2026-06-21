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

    playExplosion(volumeFactor = 1.0) {
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
        gain.gain.setValueAtTime(0.5 * volumeFactor, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noiseNode.start(now);
        noiseNode.stop(now + 1.6);
    }

    playSuccess(pitchFactor = 1.0) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq * pitchFactor, now + i * 0.15);
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
let levelTime = 0;
let hudTextGraphics;
let worldTextGraphics;

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
let landerTrail = [];

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
    this.nextLevelFuel = 1000;
    graphics = this.add.graphics();
    landerGraphics = this.add.graphics();
    landerGraphicsWrap = this.add.graphics();
    hudTextGraphics = this.add.graphics();
    worldTextGraphics = this.add.graphics();
    cursorKeys = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
    
    // Populate Vector Starfield
    for (let i = 0; i < 30; i++) {
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
    }).setScrollFactor(0).setAlpha(0);

    fuelText = this.add.text(220, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0).setAlpha(0);

    levelLivesText = this.add.text(420, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0).setAlpha(0);

    speedText = this.add.text(620, 20, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '10px',
        color: '#33ff33'
    }).setScrollFactor(0).setAlpha(0);

    // Title/Screen overlay texts
    screenTitleText = this.add.text(400, 160, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '28px',
        color: '#33ff33',
        align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    screenDetailText = this.add.text(400, 320, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        color: '#33ff33',
        align: 'center',
        lineSpacing: 12
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    screenPromptText = this.add.text(400, 480, '', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        color: '#33ff33',
        align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    // Create a transparent HUD camera locked at 1.0 zoom overlaying the main camera
    this.hudCamera = this.cameras.add(0, 0, 800, 600);
    this.hudCamera.setScroll(0, 0);

    // Main camera ignores HUD texts and hudTextGraphics
    this.cameras.main.ignore([scoreText, fuelText, levelLivesText, speedText, screenTitleText, screenDetailText, screenPromptText, hudTextGraphics]);

    // HUD camera ignores game world graphics objects and worldTextGraphics
    this.hudCamera.ignore([
        graphics,
        landerGraphics,
        landerGraphicsWrap,
        worldTextGraphics
    ]);

    generateNewLevel(this);
    resetLander();
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

    // Set up dual-gutter landscape button touch and mouse mappings
    let activeThrustButtons = new Set();
    let activeLeftButtons = new Set();
    let activeRightButtons = new Set();

    const bindButton = (btnId, activeSet, stateProp) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        
        const startPress = (e) => {
            e.preventDefault();
            audio.init();
            activeSet.add(btnId);
            window[stateProp] = true;
            btn.classList.add('active');
        };
        const stopPress = (e) => {
            e.preventDefault();
            activeSet.delete(btnId);
            if (activeSet.size === 0) {
                window[stateProp] = false;
            }
            btn.classList.remove('active');
        };
        btn.addEventListener('mousedown', startPress);
        btn.addEventListener('touchstart', startPress, { passive: false });
        btn.addEventListener('mouseup', stopPress);
        btn.addEventListener('touchend', stopPress);
        btn.addEventListener('touchcancel', stopPress);
        btn.addEventListener('mouseleave', stopPress);
    };

    bindButton('btn-thrust-left', activeThrustButtons, 'isThrustingButtonActive');
    bindButton('btn-thrust-right', activeThrustButtons, 'isThrustingButtonActive');
    bindButton('btn-left-left', activeLeftButtons, 'isLeftButtonActive');
    bindButton('btn-left-right', activeLeftButtons, 'isLeftButtonActive');
    bindButton('btn-right-left', activeRightButtons, 'isRightButtonActive');
    bindButton('btn-right-right', activeRightButtons, 'isRightButtonActive');

    // Suspend and resume the Web Audio context when the tab loses/gains focus
    this.game.events.on('blur', () => { if (audio.ctx) audio.ctx.suspend(); });
    this.game.events.on('focus', () => { if (audio.ctx) audio.ctx.resume(); });
}

function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    fuel = 1000;
    generateNewLevel(currentScene);
    resetLander();
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
        levelTime = 0;
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
    levelTime = 0;
    landerTrail = [];
    debris = [];
    
    const spawnLeft = Math.random() < 0.5;
    
    landerState = {
        x: spawnLeft ? 20 : 780,
        y: 80,
        vx: spawnLeft ? 75 : -75,
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
    levelTime = 0;
    const activeScene = scene || currentScene || this;
    if (activeScene) {
        fuel = activeScene.nextLevelFuel !== undefined ? activeScene.nextLevelFuel : 1000;
        activeScene.nextLevelFuel = 1000; // Reset for next touchdown
    }
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
            }).setOrigin(0.5).setAlpha(0);
            
            // Ignore pad multiplier labels on HUD camera so they scale with main camera zoom
            if (activeScene.hudCamera) {
                activeScene.hudCamera.ignore(txt);
            }
            
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
            ly2: dy / 2,
            history: []
        });
    });
}

function updateAndDrawDebris(g, dt) {
    const gravity = 25.0;
    
    debris.forEach(d => {
        // Track debris history (max 4 segments) before updating physics position
        if (!d.history) {
            d.history = [];
        }
        d.history.push({ x: d.x, y: d.y, angle: d.angle });
        if (d.history.length > 4) {
            d.history.shift();
        }

        // Draw historical segments with decaying alphas
        d.history.forEach((h, index) => {
            const alpha = ((index + 1) / (d.history.length + 1)) * 0.45;
            g.lineStyle(2, 0xffffff, alpha);

            const rad = (h.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const x1 = h.x + d.lx1 * cos - d.ly1 * sin;
            const y1 = h.y + d.lx1 * sin + d.ly1 * cos;
            const x2 = h.x + d.lx2 * cos - d.ly2 * sin;
            const y2 = h.y + d.lx2 * sin + d.ly2 * cos;

            g.lineBetween(x1, y1, x2, y2);

            // Double-draw debris if near horizontal wrapping borders
            if (h.x < 1600) {
                g.lineBetween(x1 + 4000, y1, x2 + 4000, y2);
            } else if (h.x > 2400) {
                g.lineBetween(x1 - 4000, y1, x2 - 4000, y2);
            }
        });

        // Update physics positions
        d.vy += gravity * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.angle += d.vAngle * dt;

        // Wrap debris horizontally at 4000
        d.x = (d.x % 4000 + 4000) % 4000;

        // Draw primary segment
        g.lineStyle(2, 0xffffff, 1.0);

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

function drawVectorLander(g, x, y, angle, thrust, alpha = 1.0) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const transformX = (px, py) => x + px * cos - py * sin;
    const transformY = (px, py) => y + px * sin + py * cos;

    // Neon Vector line style
    g.lineStyle(2, 0xffffff, alpha);

    // Lander Capsule body
    g.beginPath();
    g.moveTo(transformX(-10, -5), transformY(-10, -5));
    g.lineTo(transformX(10, -5), transformY(10, -5));
    g.lineTo(transformX(12, 5), transformY(12, 5));
    g.lineTo(transformX(-12, 5), transformY(-12, 5));
    g.closePath();
    g.strokePath();

    // Lander Legs
    g.lineBetween(transformX(-12, 5), transformY(-12, 5), transformX(-16, 15), transformY(-16, 15));
    g.lineBetween(transformX(12, 5), transformY(12, 5), transformX(16, 15), transformY(16, 15));
    
    // Lander Footpads
    g.lineBetween(transformX(-18, 15), transformY(-18, 15), transformX(-14, 15), transformY(-14, 15));
    g.lineBetween(transformX(14, 15), transformY(14, 15), transformX(18, 15), transformY(18, 15));

    // Thrust Thruster nozzle
    g.lineBetween(transformX(-4, 5), transformY(-4, 5), transformX(-2, 9), transformY(-2, 9));
    g.lineBetween(transformX(4, 5), transformY(4, 5), transformX(2, 9), transformY(2, 9));
    g.lineBetween(transformX(-2, 9), transformY(-2, 9), transformX(2, 9), transformY(2, 9));

    // Dynamic Flame vectors
    if (thrust > 0) {
        g.lineStyle(1.5, 0xffffff, alpha);
        g.beginPath();
        g.moveTo(transformX(-3, 9), transformY(-3, 9));
        const flameLen = 9 + thrust * 25 * (0.8 + Math.random() * 0.4);
        g.lineTo(transformX(0, flameLen), transformY(0, flameLen));
        g.lineTo(transformX(3, 9), transformY(3, 9));
        g.strokePath();
    }
}

function update(time, delta) {
    const dt = delta / 1000;

    // Track lander historical trail coordinates
    if (gameState === STATE_PLAYING || gameState === STATE_SUCCESS) {
        landerTrail.push({
            x: landerState.x,
            y: landerState.y,
            angle: landerState.angle,
            thrust: landerState.thrust
        });
        if (landerTrail.length > 4) {
            landerTrail.shift();
        }
    } else {
        landerTrail = [];
    }

    graphics.clear();

    // 1. Draw Starfield in a single batch with static alpha
    graphics.fillStyle(0xffffff, 0.4);
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
            graphics.lineStyle(2, 0xffffff, 1);
            graphics.beginPath();
            graphics.moveTo(terrain.points[0].x + offset, terrain.points[0].y);
            for (let i = 1; i < terrain.points.length; i++) {
                graphics.lineTo(terrain.points[i].x + offset, terrain.points[i].y);
            }
            graphics.strokePath();

            // Draw Landing Pads Multipliers
            terrain.landingPads.forEach(pad => {
                graphics.lineStyle(3, 0xffffff, 1);
                graphics.lineBetween(pad.x1 + offset, pad.y, pad.x2 + offset, pad.y);
            });
        });
    }

    // 3. Game Flight State Physics Update
    if (gameState === STATE_PLAYING) {
        levelTime += dt;
        // Check keyboard or mobile button input for thrust
        const isThrusting = (cursorKeys.up && cursorKeys.up.isDown) || 
                            (this.wasd && this.wasd.up && this.wasd.up.isDown) ||
                            window.isThrustingButtonActive;
        
        let desiredThrust = isThrusting ? 1.0 : 0.0;

        // Steer angle blending (Keyboard arrow / WASD or mobile buttons)
        if ((cursorKeys.left && cursorKeys.left.isDown) || 
            (this.wasd && this.wasd.left && this.wasd.left.isDown) ||
            window.isLeftButtonActive) {
            landerState.angle -= 90 * dt;
        } else if ((cursorKeys.right && cursorKeys.right.isDown) || 
                   (this.wasd && this.wasd.right && this.wasd.right.isDown) ||
                   window.isRightButtonActive) {
            landerState.angle += 90 * dt;
        }

        landerState.thrust = desiredThrust;
        landerState = window.LanderCore.updatePhysicsState(landerState, dt);

        // Calculate distance to the terrain directly below the lander
        const terrainY = window.LanderCore.getTerrainHeight(terrain, landerState.x);
        const altitude = terrainY - landerState.y;
        
        // Determine target zoom level
        const targetZoom = (altitude < 200) ? 1.0 : 0.5;
        
        // Exponential smoothing interpolation
        const cam = this.cameras.main;
        cam.zoom += (targetZoom - cam.zoom) * (1 - Math.exp(-8 * dt));

        // Adjust scroll margins dynamically based on current zoom scale
        const currentZoom = cam.zoom;
        const W_world = 800 / currentZoom;
        const M_world = 120 / currentZoom;
        
        // Find the left visible boundary in world space
        const leftVisibleEdge = cam.scrollX + (400 - 400 / currentZoom);
        
        let screenX_world = landerState.x - leftVisibleEdge;
        // Wrap screenX_world to [-2000, 2000] to handle the 4000px wrap boundary
        screenX_world = ((screenX_world + 2000) % 4000 + 4000) % 4000 - 2000;
        
        let targetLeftEdge = leftVisibleEdge;
        if (screenX_world > W_world - M_world) {
            targetLeftEdge = landerState.x - (W_world - M_world);
        } else if (screenX_world < M_world) {
            targetLeftEdge = landerState.x - M_world;
        }
        
        // Wrap camera scroll X at [0, 4000]
        let sX = targetLeftEdge % 4000;
        if (sX < 0) sX += 4000;
        
        // Focus camera scroll center on the lander craft
        // Phaser camera scroll matches scrollX, scrollY. Adjust so scroll is centered relative to zoom.
        cam.scrollX = sX - (400 - 400 / currentZoom);

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
                    
                    // Play tuned chimes based on touchdown quality
                    if (check.quality === "perfect") {
                        audio.playSuccess(1.5); // High pitch arpeggio
                    } else if (check.quality === "hard") {
                        audio.playSuccess(0.8); // Detuned arpeggio sweep
                        // Play a brief warning sound rumbles
                        audio.playExplosion(0.1); 
                    } else {
                        audio.playSuccess(1.0); // Standard pitch
                    }
                    
                    let landingPoints = Math.round(pad.multiplier * landerState.fuel);
                    
                    // Apply hard landing penalties
                    if (check.quality === "hard") {
                        landingPoints = Math.round(landingPoints * 0.75); // 25% score reduction
                        this.nextLevelFuel = 500; // Penalized starting fuel
                    } else if (check.quality === "perfect") {
                        landingPoints += check.scoreBonus; // 500 bonus points
                        this.nextLevelFuel = 1000;
                    } else {
                        this.nextLevelFuel = 1000;
                    }
                    
                    score += landingPoints;
                    if (score > highScore) {
                        highScore = score;
                    }
                    
                    setScreenState(STATE_SUCCESS);
                    screenDetailText.setText(
                        `${check.message}\n\n` +
                        `PAD MULTIPLIER: ${pad.multiplier}X\n` +
                        `REMAINING FUEL: ${Math.round(landerState.fuel)}\n` +
                        `POINTS AWARDED : ${landingPoints}`
                    );
                    
                    this.time.delayedCall(2000, () => {
                        level++;
                        generateNewLevel(currentScene);
                        resetLander();
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
              landerGraphicsWrap.clear();
              landerGraphics.setPosition(0, 0);
              landerGraphics.setAngle(0);
              landerGraphicsWrap.setPosition(0, 0);
              landerGraphicsWrap.setAngle(0);

              let hasWrap = false;
              // Draw historical frames
              landerTrail.forEach((t, i) => {
                  const alpha = 0.1 * (i + 1);
                  drawVectorLander(landerGraphics, t.x, t.y, t.angle, t.thrust, alpha);
                  if (t.x < 1600) {
                      drawVectorLander(landerGraphicsWrap, t.x + 4000, t.y, t.angle, t.thrust, alpha);
                      hasWrap = true;
                  } else if (t.x > 2400) {
                      drawVectorLander(landerGraphicsWrap, t.x - 4000, t.y, t.angle, t.thrust, alpha);
                      hasWrap = true;
                  }
              });

              // Draw primary lander
              drawVectorLander(landerGraphics, landerState.x, landerState.y, landerState.angle, landerState.thrust, 1.0);
              if (landerState.x < 1600) {
                  drawVectorLander(landerGraphicsWrap, landerState.x + 4000, landerState.y, landerState.angle, landerState.thrust, 1.0);
                  hasWrap = true;
              } else if (landerState.x > 2400) {
                  drawVectorLander(landerGraphicsWrap, landerState.x - 4000, landerState.y, landerState.angle, landerState.thrust, 1.0);
                  hasWrap = true;
              }
              landerGraphicsWrap.setVisible(hasWrap);
          }
      } else if (gameState === STATE_SUCCESS) {
          audio.setThrust(0);
          audio.stopWarningAlarm();
          // Keep ship drawn frozen at its landed spot
          landerGraphics.clear();
          landerGraphicsWrap.clear();
          landerGraphics.setPosition(0, 0);
          landerGraphics.setAngle(0);
          landerGraphicsWrap.setPosition(0, 0);
          landerGraphicsWrap.setAngle(0);

          let hasWrap = false;
          // Draw historical frames
          landerTrail.forEach((t, i) => {
              const alpha = 0.1 * (i + 1);
              drawVectorLander(landerGraphics, t.x, t.y, t.angle, t.thrust, alpha);
              if (t.x < 1600) {
                  drawVectorLander(landerGraphicsWrap, t.x + 4000, t.y, t.angle, t.thrust, alpha);
                  hasWrap = true;
              } else if (t.x > 2400) {
                  drawVectorLander(landerGraphicsWrap, t.x - 4000, t.y, t.angle, t.thrust, alpha);
                  hasWrap = true;
              }
          });

          // Draw primary lander
          drawVectorLander(landerGraphics, landerState.x, landerState.y, landerState.angle, 0, 1.0);
          if (landerState.x < 1600) {
              drawVectorLander(landerGraphicsWrap, landerState.x + 4000, landerState.y, landerState.angle, 0, 1.0);
              hasWrap = true;
          } else if (landerState.x > 2400) {
              drawVectorLander(landerGraphicsWrap, landerState.x - 4000, landerState.y, landerState.angle, 0, 1.0);
              hasWrap = true;
          }
          landerGraphicsWrap.setVisible(hasWrap);
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

    // Programmatic HUD stacks and Screen overlays rendering using VectorFont
    hudTextGraphics.clear();
    hudTextGraphics.lineStyle(1.5, 0xffffff, 1);

    // Left HUD Stack
    const scoreStr = `SCORE: ${String(score).padStart(6, '0')}`;
    const timeStr = `TIME : ${String(Math.floor(levelTime)).padStart(6, '0')}`;
    const fuelStr = `FUEL : ${String(landerState ? Math.max(0, Math.round(landerState.fuel)) : 0).padStart(6, '0')}`;

    window.VectorFont.drawText(hudTextGraphics, scoreStr, 20, 20, 10, 0xffffff, 1.5);
    window.VectorFont.drawText(hudTextGraphics, timeStr, 20, 36, 10, 0xffffff, 1.5);
    window.VectorFont.drawText(hudTextGraphics, fuelStr, 20, 52, 10, 0xffffff, 1.5);

    // Right HUD Stack
    let altVal = 0;
    let hSpeedVal = 0;
    let hArrow = ' ';
    let vSpeedVal = 0;
    let vArrow = ' ';

    if (terrain && landerState) {
        const terrainY = window.LanderCore.getTerrainHeight(terrain, landerState.x);
        altVal = Math.max(0, Math.round(terrainY - landerState.y));
        hSpeedVal = Math.round(Math.abs(landerState.vx));
        hArrow = landerState.vx < 0 ? '←' : (landerState.vx > 0 ? '→' : ' ');
        vSpeedVal = Math.round(Math.abs(landerState.vy));
        vArrow = landerState.vy < 0 ? '↑' : (landerState.vy > 0 ? '↓' : ' ');
    }

    const altStr = `ALTITUDE : ${String(altVal).padStart(6, '0')}`;
    const hSpeedStr = `HORIZONTAL SPEED: ${String(hSpeedVal).padStart(6, '0')} ${hArrow}`;
    const vSpeedStr = `VERTICAL SPEED: ${String(vSpeedVal).padStart(6, '0')} ${vArrow}`;

    window.VectorFont.drawText(hudTextGraphics, altStr, 480, 20, 10, 0xffffff, 1.5);
    window.VectorFont.drawText(hudTextGraphics, hSpeedStr, 480, 36, 10, 0xffffff, 1.5);
    window.VectorFont.drawText(hudTextGraphics, vSpeedStr, 480, 52, 10, 0xffffff, 1.5);

    // Screen Overlays
    if (gameState === STATE_INTRO) {
        const titleText = 'LUNAR LANDER';
        const titleWidth = window.VectorFont.getTextWidth(titleText, 28);
        window.VectorFont.drawText(hudTextGraphics, titleText, 400 - titleWidth / 2, 160, 28, 0xffffff, 1.5);

        const subtitleText = '1979 ARCADE VECTOR CABINET RECREATION';
        const subWidth = window.VectorFont.getTextWidth(subtitleText, 10);
        window.VectorFont.drawText(hudTextGraphics, subtitleText, 400 - subWidth / 2, 210, 10, 0xffffff, 1.5);

        if (screenDetailText && screenDetailText.text) {
            const lines = screenDetailText.text.split('\n');
            lines.forEach((line, index) => {
                const width = window.VectorFont.getTextWidth(line, 11);
                window.VectorFont.drawText(hudTextGraphics, line, 400 - width / 2, 280 + index * 18, 11, 0xffffff, 1.5);
            });
        }

        const promptText = 'PRESS SPACE OR CLICK TO START';
        const promptWidth = window.VectorFont.getTextWidth(promptText, 12);
        window.VectorFont.drawText(hudTextGraphics, promptText, 400 - promptWidth / 2, 480, 12, 0xffffff, 1.5);
    } else if (gameState === STATE_SUCCESS || gameState === STATE_CRASHED || gameState === STATE_GAMEOVER) {
        const titleText = screenTitleText.text;
        if (titleText) {
            const size = 28;
            const width = window.VectorFont.getTextWidth(titleText, size);
            window.VectorFont.drawText(hudTextGraphics, titleText, 400 - width / 2, 160, size, 0xffffff, 1.5);
        }

        if (screenDetailText && screenDetailText.text) {
            const lines = screenDetailText.text.split('\n');
            lines.forEach((line, index) => {
                const width = window.VectorFont.getTextWidth(line, 11);
                window.VectorFont.drawText(hudTextGraphics, line, 400 - width / 2, 280 + index * 18, 11, 0xffffff, 1.5);
            });
        }

        const promptText = screenPromptText.text;
        if (promptText) {
            const size = 12;
            const width = window.VectorFont.getTextWidth(promptText, size);
            window.VectorFont.drawText(hudTextGraphics, promptText, 400 - width / 2, 480, size, 0xffffff, 1.5);
        }
    }

    // World coordinate landing pad multiplier labels rendering using VectorFont
    worldTextGraphics.clear();
    worldTextGraphics.lineStyle(1.5, 0xffffff, 1);
    if (terrain && gameState === STATE_PLAYING) {
        const camX = this.cameras.main.scrollX;
        terrain.landingPads.forEach(pad => {
            const baseX = (pad.x1 + pad.x2) / 2;
            let relativeX = baseX - camX;
            relativeX = ((relativeX + 2000) % 4000 + 4000) % 4000 - 2000;
            const wrappedLabelX = camX + relativeX;

            const text = `${pad.multiplier}X`;
            const width = window.VectorFont.getTextWidth(text, 11);
            const x = wrappedLabelX - width / 2;
            const y = pad.y - 18;
            window.VectorFont.drawText(worldTextGraphics, text, x, y, 11, 0xffffff, 1.5);
        });
    }
}
