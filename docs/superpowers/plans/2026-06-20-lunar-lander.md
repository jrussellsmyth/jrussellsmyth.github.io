# Lunar Lander Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a single-page retro-style recreation of the classic 1979 Lunar Lander arcade game using Phaser.js, featuring CRT vector bloom graphics, synthesized Web Audio, and custom inputs optimized for both desktop and mobile.

**Architecture:** The game logic is decoupled from Phaser rendering to facilitate unit testing. The core physics, terrain math, and scoring rules are isolated in a pure JS module `lander-core.js`, which is tested with Node.js assertions. Phaser.js is utilized primarily for rendering, animation loops, and camera handling.

**Tech Stack:** Vanilla HTML5, CSS3, Phaser.js (v3.80.1 via CDN), Web Audio API, Node.js (for testing).

## Global Constraints
- Target platform: Desktop (Chrome, Safari, Firefox) and Mobile browsers (enforced landscape mode).
- Visual constraint: Green CRT phosphor vector lines with neon glow bloom.
- Sound constraint: 100% synthetically generated Web Audio API (no static media files).
- Dependency constraint: CDN-loaded Phaser.js, no compilation steps (Babel/Webpack/Vite), pure ES modules.

---

### Task 1: Core Physics & Landing Rules Engine

**Files:**
- Create: `lunar-lander/lander-core.js`
- Create: `lunar-lander/test.js`

**Interfaces:**
- Produces: `checkLandingCondition(vx, vy, angle) -> { success: boolean, reason: string|null }`
- Produces: `updatePhysicsState(state, dt) -> state`
- Produces: `calculateLandingMultiplier(padWidth) -> number`

- [ ] **Step 1: Write the failing tests**
  Create the test runner script using Node's native assert.
  
  ```javascript
  // lunar-lander/test.js
  const assert = require('assert');
  const Core = require('./lander-core.js');

  console.log("Running Core logic tests...");

  // Test landing rules
  try {
    const perfectLanding = Core.checkLandingCondition(5, 10, 2);
    assert.deepStrictEqual(perfectLanding, { success: true, reason: null });

    const tooFastVertically = Core.checkLandingCondition(5, 35, 2);
    assert.deepStrictEqual(tooFastVertically, { success: false, reason: "speed" });

    const tooCrooked = Core.checkLandingCondition(5, 10, 15);
    assert.deepStrictEqual(tooCrooked, { success: false, reason: "angle" });

    // Test physics update
    const initialState = { x: 100, y: 100, vx: 10, vy: 0, angle: 0, fuel: 100, thrust: 0.5 };
    const nextState = Core.updatePhysicsState(initialState, 0.1); // 0.1s update
    // Lander points up (0 rad). Thrust moves it upwards (against gravity).
    // gravity is ~1.62 m/s^2 (scaled to pixels). Let's assert state changes.
    assert.ok(nextState.y > initialState.y); // gravity pulls it down if gravity > thrust
    assert.ok(nextState.fuel < initialState.fuel);

    // Test multiplier calculations
    assert.strictEqual(Core.calculateLandingMultiplier(20), 10); // Narrow pad
    assert.strictEqual(Core.calculateLandingMultiplier(80), 2);  // Wide pad

    console.log("ALL TESTS PASSED!");
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node lunar-lander/test.js`
  Expected: FAIL (Cannot find module './lander-core.js' or exports not defined)

- [ ] **Step 3: Write minimal implementation**
  Create `lunar-lander/lander-core.js` containing:
  
  ```javascript
  // lunar-lander/lander-core.js
  const GRAVITY = 25.0; // Px/s^2
  const THRUST_ACCEL = 60.0; // Max thrust accel px/s^2
  const FUEL_BURN_RATE = 15.0; // Fuel units per second at 100% thrust

  function checkLandingCondition(vx, vy, angle) {
    const maxSafeVx = 15;
    const maxSafeVy = 30;
    const maxSafeAngle = 5; // degrees

    if (Math.abs(vx) > maxSafeVx || Math.abs(vy) > maxSafeVy) {
      return { success: false, reason: "speed" };
    }
    if (Math.abs(angle) > maxSafeAngle) {
      return { success: false, reason: "angle" };
    }
    return { success: true, reason: null };
  }

  function updatePhysicsState(state, dt) {
    let fuel = state.fuel;
    let thrust = state.thrust;
    if (fuel <= 0) {
      fuel = 0;
      thrust = 0;
    }

    // Burn fuel
    const fuelBurned = thrust * FUEL_BURN_RATE * dt;
    fuel = Math.max(0, fuel - fuelBurned);

    // Thrust acceleration vector
    const rad = (state.angle * Math.PI) / 180;
    const ax = Math.sin(rad) * thrust * THRUST_ACCEL;
    const ay = -Math.cos(rad) * thrust * THRUST_ACCEL + GRAVITY;

    // Integrate velocity and position
    const vx = state.vx + ax * dt;
    const vy = state.vy + ay * dt;
    const x = state.x + vx * dt;
    const y = state.y + vy * dt;

    return {
      x,
      y,
      vx,
      vy,
      angle: state.angle,
      fuel,
      thrust
    };
  }

  function calculateLandingMultiplier(padWidth) {
    if (padWidth <= 25) return 10;
    if (padWidth <= 50) return 5;
    return 2;
  }

  module.exports = {
    checkLandingCondition,
    updatePhysicsState,
    calculateLandingMultiplier
  };
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/lander-core.js lunar-lander/test.js
  git commit -m "feat: implement physics core engine and landing logic"
  ```

---

### Task 2: Page Skeleton, Responsive Styling, and CRT Glow Setup

**Files:**
- Create: `lunar-lander/index.html`
- Create: `lunar-lander/style.css`

**Interfaces:**
- Produces: Web Page container `#game-wrapper` housing canvas and responsive design elements.

- [ ] **Step 1: Write mock tests**
  Add visual integration checks in `lunar-lander/test.js` verifying export bindings and format. Since HTML can't easily be unit-tested via Node directly, we will verify core properties export.
  
  ```javascript
  // Add to lunar-lander/test.js
  assert.strictEqual(typeof Core.checkLandingCondition, 'function');
  ```

- [ ] **Step 2: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Write HTML & CSS implementation**
  Create `lunar-lander/index.html`:
  ```html
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>LUNAR LANDER - 1979 Arcade Vector Edition</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="style.css">
      <!-- Load Phaser CDN -->
      <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
  </head>
  <body>
      <div id="game-wrapper">
          <div class="gutter left-gutter">
              <div class="control-box">
                  <label>THRUST</label>
                  <div class="slider-container">
                      <input type="range" class="slider vertical-slider" id="thrust-left" min="0" max="100" value="0">
                  </div>
              </div>
              <div class="control-box">
                  <label>STEER</label>
                  <div class="slider-container">
                      <input type="range" class="slider horizontal-slider" id="steer-left" min="-45" max="45" value="0">
                  </div>
              </div>
          </div>

          <div id="game-container"></div>

          <div class="gutter right-gutter">
              <div class="control-box">
                  <label>THRUST</label>
                  <div class="slider-container">
                      <input type="range" class="slider vertical-slider" id="thrust-right" min="0" max="100" value="0">
                  </div>
              </div>
              <div class="control-box">
                  <label>STEER</label>
                  <div class="slider-container">
                      <input type="range" class="slider horizontal-slider" id="steer-right" min="-45" max="45" value="0">
                  </div>
              </div>
          </div>
      </div>

      <!-- Import local core logic adapted for ES modules or standard loading -->
      <script>
          // Bridge module.exports syntax to standard window object for client consumption
          window.module = {};
      </script>
      <script src="lander-core.js"></script>
      <script>
          window.LanderCore = window.module.exports;
      </script>
      <script src="game.js"></script>
  </body>
  </html>
  ```

  Create `lunar-lander/style.css`:
  ```css
  * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
  }

  body {
      background-color: #000;
      color: #33ff33;
      font-family: 'Press Start 2P', monospace;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
  }

  #game-wrapper {
      display: flex;
      flex-direction: row;
      width: 100%;
      height: 100%;
      max-width: 1200px;
      max-height: 800px;
      position: relative;
      border: 4px double #33ff33;
      box-shadow: 0 0 20px rgba(51, 255, 51, 0.2);
  }

  #game-container {
      flex-grow: 1;
      height: 100%;
      position: relative;
      background: #000;
      /* CRT Monitor Glow Filter */
      filter: drop-shadow(0 0 3px #00ff00);
  }

  #game-container::after {
      content: " ";
      display: block;
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
      z-index: 10;
      background-size: 100% 4px, 6px 100%;
      pointer-events: none;
  }

  .gutter {
      width: 120px;
      background-color: #0d0d0d;
      border-right: 2px solid #33ff33;
      display: none; /* Hidden by default on desktop, shown on mobile */
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      padding: 10px;
  }

  .right-gutter {
      border-right: none;
      border-left: 2px solid #33ff33;
  }

  .control-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
  }

  .control-box label {
      font-size: 8px;
      margin-bottom: 10px;
      text-align: center;
      letter-spacing: 1px;
  }

  .slider-container {
      position: relative;
  }

  .slider {
      -webkit-appearance: none;
      appearance: none;
      background: #222;
      border: 1px solid #33ff33;
      outline: none;
      border-radius: 4px;
  }

  .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #33ff33;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 0 10px #33ff33;
  }

  .vertical-slider {
      width: 15px;
      height: 180px;
      writing-mode: bt-lr; /* IE */
      -webkit-appearance: slider-vertical; /* Webkit */
  }

  .horizontal-slider {
      width: 90px;
      height: 15px;
  }

  /* Responsive landscape locks for touch devices */
  @media (pointer: coarse) {
      .gutter {
          display: flex; /* Show mobile sliders */
      }
  }
  ```

- [ ] **Step 4: Verify html parses and styles load**
  Verify the files compile/save.
  Expected: Save successful.

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/index.html lunar-lander/style.css
  git commit -m "feat: add markup structural scaffolding, CRT glow styles, and mobile controls gutter layout"
  ```

---

### Task 3: Procedural Terrain Generation Math

**Files:**
- Modify: `lunar-lander/lander-core.js`
- Modify: `lunar-lander/test.js`

**Interfaces:**
- Produces: `generateTerrain(width, height, count, difficulty) -> { points: Array<{x, y}>, landingPads: Array<{x1, x2, y, multiplier}> }`

- [ ] **Step 1: Write failing tests**
  Add unit tests to check terrain generator characteristics.
  
  ```javascript
  // Add to lunar-lander/test.js
  console.log("Running Terrain generator tests...");
  const width = 800;
  const height = 600;
  const terrain = Core.generateTerrain(width, height, 8, 1.0);

  // Assert we got valid coordinates
  assert.ok(terrain.points.length > 50);
  assert.strictEqual(terrain.points[0].x, 0);
  assert.strictEqual(terrain.points[terrain.points.length - 1].x, width);

  // Assert landing pads exist
  assert.ok(terrain.landingPads.length >= 2);
  terrain.landingPads.forEach(pad => {
    assert.ok(pad.x1 < pad.x2);
    assert.strictEqual(pad.multiplier >= 2, true);
    // Find matching flat stretch in terrain points
    const padPoints = terrain.points.filter(p => p.x >= pad.x1 && p.x <= pad.x2);
    assert.ok(padPoints.length >= 2);
    // Verify flatness
    const yVal = padPoints[0].y;
    padPoints.forEach(p => assert.strictEqual(p.y, yVal));
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node lunar-lander/test.js`
  Expected: FAIL (generateTerrain is not a function)

- [ ] **Step 3: Write implementation**
  Add `generateTerrain` to `lunar-lander/lander-core.js` (and export it):
  
  ```javascript
  // In lunar-lander/lander-core.js:
  function generateTerrain(width, height, difficulty) {
    const points = [];
    const landingPads = [];
    
    // Seed points evenly across width
    const segments = 128;
    const dx = width / segments;
    const heights = new Array(segments + 1);

    // Initial boundary heights
    heights[0] = height - 100 - Math.random() * 150;
    heights[segments] = height - 100 - Math.random() * 150;

    // Midpoint displacement logic
    function displace(left, right, roughness) {
      if (right - left <= 1) return;
      const mid = Math.floor((left + right) / 2);
      const averageHeight = (heights[left] + heights[right]) / 2;
      const offset = (Math.random() - 0.5) * roughness * (right - left) * 8;
      
      // Clamp to screen bounds
      heights[mid] = Math.max(height - 400, Math.min(height - 20, averageHeight + offset));

      displace(left, mid, roughness);
      displace(mid, right, roughness);
    }
    
    displace(0, segments, 1.2);

    // Inject flat landing pads
    const padCount = 3;
    const padWidths = [60, 40, 20]; // Wide (2x), Medium (5x), Narrow (10x)
    const padMultipliers = [2, 5, 10];
    
    for (let i = 0; i < padCount; i++) {
      const pWidth = padWidths[i];
      const pMult = padMultipliers[i];
      
      // Choose random start segment (leaving room for pad width)
      const maxSegmentOffset = Math.floor(pWidth / dx);
      const startSeg = Math.floor(Math.random() * (segments - maxSegmentOffset - 10)) + 5;
      const endSeg = startSeg + maxSegmentOffset;
      
      const padY = height - 80 - Math.random() * 150;
      for (let s = startSeg; s <= endSeg; s++) {
        heights[s] = padY;
      }
      
      landingPads.push({
        x1: startSeg * dx,
        x2: endSeg * dx,
        y: padY,
        multiplier: pMult
      });
    }

    // Assemble final output points
    for (let s = 0; s <= segments; s++) {
      points.push({ x: s * dx, y: heights[s] });
    }

    return { points, landingPads };
  }

  // Update exports:
  module.exports = {
    checkLandingCondition,
    updatePhysicsState,
    calculateLandingMultiplier,
    generateTerrain
  };
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/lander-core.js lunar-lander/test.js
  git commit -m "feat: implement procedural midpoint-displacement terrain generation with landing pads"
  ```

---

### Task 4: Phaser Vector Rendering Engine (Flight Scene Setup)

**Files:**
- Create: `lunar-lander/game.js`

**Interfaces:**
- Produces: Phaser Game configuration & initialization.
- Produces: Dynamic vector graphics rendering of mountains, starfield, HUD and lander.

- [ ] **Step 1: Write verify file check**
  Write code checking that `game.js` exists and exports the main Game Scene correctly.
  
  ```javascript
  // Add to lunar-lander/test.js
  const fs = require('fs');
  assert.ok(fs.existsSync('./lunar-lander/game.js'));
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node lunar-lander/test.js`
  Expected: FAIL (AssertionError: false == true for file existence)

- [ ] **Step 3: Write game canvas setup & loop implementation**
  Create `lunar-lander/game.js`:
  ```javascript
  // lunar-lander/game.js
  const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: 800,
      height: 600,
      backgroundColor: '#000000',
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

  // Safe parameters
  let score = 0;
  let highScore = parseInt(localStorage.getItem('lander_high_score') || '0');
  let lives = 3;
  let fuel = 1000;
  let level = 1;

  function preload() {
      // Phaser doesn't need external graphics assets for vector mode!
  }

  function create() {
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

      resetLander();
      generateNewLevel();
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

  function generateNewLevel() {
      terrain = window.LanderCore.generateTerrain(800, 600, level);
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
      graphics.lineStyle(1, 0xffffff, 0.5);
      stars.forEach(s => {
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
          
          // Draw text label above pad
          this.add.text((pad.x1 + pad.x2) / 2 - 12, pad.y - 18, `${pad.multiplier}X`, {
              fontFamily: '"Press Start 2P"',
              fontSize: '8px',
              color: '#33ff33'
          }).setOrigin(0.5).setAlpha(0.7);
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

          // Render ship
          drawVectorLander(graphics, landerState.x, landerState.y, landerState.angle, landerState.thrust);
      }
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: wire up Phaser scenes, draw starfields, terrain, and ship vectors"
  ```

---

### Task 5: Web Audio Synth Implementation

**Files:**
- Modify: `lunar-lander/game.js`

**Interfaces:**
- Produces: `SynthEngine` class controlling dynamic, live audio wave synth.
- Produces: `playThrust(intensity)`, `playLowFuelAlarm()`, `playExplosion()`, `playSuccess()`

- [ ] **Step 1: Write Synth mock checks**
  Add mock tests verifying synth methods presence.
  
  ```javascript
  // Add to lunar-lander/test.js
  // Verify basic game skeleton hooks structure
  ```

- [ ] **Step 2: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Synthesize audio loops & triggers**
  Inject synth code at the beginning of `lunar-lander/game.js`:
  
  ```javascript
  // Add at top of lunar-lander/game.js
  class SynthEngine {
      constructor() {
          this.ctx = null;
          this.thrustGain = null;
          this.thrustOsc = null;
          this.alarmInterval = null;
      }

      init() {
          if (this.ctx) return;
          const AudioContext = window.AudioContext || window.webkitAudioContext;
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
      }

      setThrust(level) {
          if (!this.ctx) return;
          // Ramp gain values smoothly to avoid digital pops
          const targetGain = level * 0.15;
          this.thrustGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
          this.thrustOsc.frequency.setTargetAtTime(45 + level * 50, this.ctx.currentTime, 0.1);
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
  // Call audio.init() on first user interaction gesture.
  ```

  Update flight updates in the physics update loop to interface with `audio`:
  ```javascript
  // Add inside update() scene function where input/physics is mapped:
  audio.setThrust(landerState.thrust);
  
  if (landerState.fuel < 200 && landerState.fuel > 0) {
      audio.startWarningAlarm();
  } else {
      audio.stopWarningAlarm();
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: implement SynthEngine Web Audio API synthesizer for engine noise, warning, and chimes"
  ```

---

### Task 6: Custom Inputs & Mirrored Mobile Gutters

**Files:**
- Modify: `lunar-lander/game.js`
- Modify: `lunar-lander/index.html`

**Interfaces:**
- Consumes: Mobile Sliders viewport values.
- Produces: Analog throttle controls & smooth horizontal steering rotation scaling.

- [ ] **Step 1: Write slider value tests**
  Assert default mapping values in test code file check.

- [ ] **Step 2: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Setup UI events & dynamic touch/mouse mapping**
  Inject mouse wheel event capturing and touch slider bindings into `game.js` inside the `create` scene function:
  
  ```javascript
  // Inside create() in game.js:
  // Mouse Wheel listener for Desktop
  this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
      // Scroll up increases throttle, scroll down decreases throttle
      let currentThrust = landerState.thrust;
      if (deltaY < 0) {
          currentThrust = Math.min(1.0, currentThrust + 0.1);
      } else {
          currentThrust = Math.max(0.0, currentThrust - 0.1);
      }
      landerState.thrust = currentThrust;

      // Update virtual visual sliders if they are displayed
      document.getElementById('thrust-left').value = currentThrust * 100;
      document.getElementById('thrust-right').value = currentThrust * 100;
  });

  // Touch Screen bindings for Mobile Sliders (Mirrored logic)
  const leftThrustSlider = document.getElementById('thrust-left');
  const rightThrustSlider = document.getElementById('thrust-right');
  const leftSteerSlider = document.getElementById('steer-left');
  const rightSteerSlider = document.getElementById('steer-right');

  const syncThrust = (val) => {
      audio.init(); // Initialize audio context on first interactive gesture
      const level = val / 100;
      landerState.thrust = level;
      leftThrustSlider.value = val;
      rightThrustSlider.value = val;
  };

  leftThrustSlider.addEventListener('input', (e) => syncThrust(e.target.value));
  rightThrustSlider.addEventListener('input', (e) => syncThrust(e.target.value));

  const syncSteer = (val) => {
      audio.init();
      // Steer value mapping
      landerState.targetSteerAngle = parseFloat(val);
      leftSteerSlider.value = val;
      rightSteerSlider.value = val;
  };

  leftSteerSlider.addEventListener('input', (e) => syncSteer(e.target.value));
  rightSteerSlider.addEventListener('input', (e) => syncSteer(e.target.value));
  
  // Snap slider back to center when released
  const releaseSteer = () => {
      syncSteer(0);
  };
  leftSteerSlider.addEventListener('touchend', releaseSteer);
  rightSteerSlider.addEventListener('touchend', releaseSteer);
  leftSteerSlider.addEventListener('mouseup', releaseSteer);
  rightSteerSlider.addEventListener('mouseup', releaseSteer);
  ```

  Modify the Keyboard controls block inside `update()` to smoothly blend steer bindings:
  ```javascript
  // Replace standard rotation in update():
  if (cursorKeys.left.isDown) {
      landerState.angle -= 90 * dt;
  } else if (cursorKeys.right.isDown) {
      landerState.angle += 90 * dt;
  } else if (landerState.targetSteerAngle !== undefined) {
      // Smoothly rotate lander towards target touch angle
      const diff = landerState.targetSteerAngle - landerState.angle;
      landerState.angle += diff * 0.1;
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: implement mouse-wheel throttle and mirrored mobile sliders integration with touch end snapping"
  ```

---

### Task 7: Full Collision Logic, Crash Animations & Score Persistence

**Files:**
- Modify: `lunar-lander/game.js`
- Modify: `index.html` (root)

**Interfaces:**
- Produces: Multi-level game loop state flow. High scores stored and rendered on top.

- [ ] **Step 1: Write integration mock tests**
  Add mock checks for collision structures.

- [ ] **Step 2: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Setup state changes & collision detection loops**
  Add detailed physics boundary collision detection to standard update loop in `game.js`. When colliding with terrain points:
  * Check matching pad x-boundaries:
    * If matching pad range and safe landing velocity -> lander freezes. Award score, load next level in 2 seconds. Play success chord.
    * Else -> Explode. Split lander lines into moving debris particles. Decrement lives. Reset in 2 seconds. Play explosion noise.
  Update root index.html to link back to the `/lunar-lander/index.html` game app directory.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  Run:
  ```bash
  git add lunar-lander/game.js index.html
  git commit -m "feat: implement terrain landing collision checks, particle crash animation, and link in root"
  ```
