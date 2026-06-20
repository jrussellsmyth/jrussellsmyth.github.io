# Lunar Lander Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Lunar Lander game viewport horizontally to a 5-screen scrolling loop, implement dynamic ground-distance zooming, and classify landings into Perfect, Good, and Hard touchdown states with score and fuel penalties.

**Architecture:**
* Adjust `lander-core.js` coordinates wrapping to a dynamic width, default `4000px`, and update touchdown quality check logic.
* Implement camera scroll update rules in `game.js` to center the lander horizontally when it exceeds 15% screen margins.
* Modify the rendering loop in `game.js` to draw wrapped copies of the terrain, stars, and particles.
* Integrate dynamic camera zoom using exponential smoothing and adjust scrolling margins dynamically based on zoom scale.
* Classify landings and trigger specific HUD messages, score modifiers, next-level fuel states, and audio synthesizer sweeps.

**Tech Stack:**
* Phaser 3 (HTML5 Canvas rendering & camera system)
* Vanilla JavaScript (Core physics, terrain wrap-around math, and landing rules)
* Node.js Assertions (Unit testing)

## Global Constraints

* Target platform: Desktop (Chrome, Safari, Firefox) and Mobile browsers (enforced portrait mode).
* Visual constraint: Green CRT phosphor vector lines with neon glow bloom.
* Sound constraint: 100% synthetically generated Web Audio API (no static media files).
* Dependency constraint: CDN-loaded Phaser.js, no compilation steps (Babel/Webpack/Vite), pure ES modules.

---

### Task 1: Core Physics wrapping & Touchdown Classification logic

**Files:**
* Modify: `lunar-lander/lander-core.js`
* Modify: `lunar-lander/test.js`

**Interfaces:**
* Produces:
  * `updatePhysicsState(state, dt, wrapWidth = 4000)`: Horizontal wrap-around for X position at dynamic `wrapWidth`.
  * `getTerrainHeight(terrain, x)`: Modular terrain height lookup wrapping at dynamic terrain width.
  * `checkLandingCondition(vx, vy, angle)`: Returns `{ success, reason, quality, message, fuelPenalty, scoreBonus }` mapping to Perfect, Good, and Hard landings.

- [ ] **Step 1: Write the failing tests**
  Add tests at the end of `lunar-lander/test.js`:
  ```javascript
  // Test dynamic wrapping and touchdown quality classifications
  console.log("Running Touchdown Quality & Dynamic Wrapping tests...");
  
  // 1. Verify dynamic wrapping in physics update
  const wrapState = { x: 3995, y: 100, vx: 10, vy: 0, angle: 0, fuel: 100, thrust: 0 };
  const wrapNext = Core.updatePhysicsState(wrapState, 1.0, 4000);
  assert.strictEqual(wrapNext.x, 5); // 3995 + 10 - 4000 = 5

  // 2. Verify landing classification results
  const perfLanding = Core.checkLandingCondition(2, 5, 0.5);
  assert.strictEqual(perfLanding.success, true);
  assert.strictEqual(perfLanding.quality, "perfect");
  assert.strictEqual(perfLanding.scoreBonus, 500);
  assert.strictEqual(perfLanding.fuelPenalty, 0);

  const hardLanding = Core.checkLandingCondition(12, 22, 4);
  assert.strictEqual(hardLanding.success, true);
  assert.strictEqual(hardLanding.quality, "hard");
  assert.strictEqual(hardLanding.fuelPenalty, 500);

  const failLanding = Core.checkLandingCondition(18, 35, 8);
  assert.strictEqual(failLanding.success, false);
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `node lunar-lander/test.js`
  Expected: FAIL with assertion errors on `wrapNext.x` or `quality` undefined.

- [ ] **Step 3: Write minimal implementation in `lander-core.js`**
  Modify coordinates wrap-around in `updatePhysicsState`, `getTerrainHeight` calculations, and touchdown classification in `checkLandingCondition` and `generateTerrain` pad widths:
  
  Replace `checkLandingCondition`:
  ```javascript
  function checkLandingCondition(vx, vy, angle) {
    const maxSafeVx = 15;
    const maxSafeVy = 30;
    const maxSafeAngle = 5; // degrees

    const absVx = Math.abs(vx);
    const absVy = Math.abs(vy);
    const absAngle = Math.abs(angle);

    if (absVx > maxSafeVx || absVy > maxSafeVy) {
      return { success: false, reason: "speed", quality: "crash" };
    }
    if (absAngle > maxSafeAngle) {
      return { success: false, reason: "angle", quality: "crash" };
    }

    // Perfect Touchdown Conditions
    if (absVx <= 4 && absVy <= 8 && absAngle <= 1) {
      const messages = [
        "PERFECT LANDING! THE EAGLE HAS LANDED.",
        "FLAWLESS TOUCHDOWN! OUTSTANDING WORK.",
        "PERFECT SCORE! HOUSTON IS PLEASED."
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      return {
        success: true,
        reason: null,
        quality: "perfect",
        message: randomMsg,
        fuelPenalty: 0,
        scoreBonus: 500
      };
    }

    // Hard Touchdown Conditions
    if (absVx > 10 || absVy > 20 || absAngle > 3) {
      const messages = [
        "HARD LANDING HAS DAMAGED YOUR LIFE SUPPORT!",
        "YOU HAVE LANDED BUT THIS IS A ONE WAY TRIP!"
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      return {
        success: true,
        reason: null,
        quality: "hard",
        message: randomMsg,
        fuelPenalty: 500,
        scoreBonus: 0
      };
    }

    // Good Touchdown Conditions
    return {
      success: true,
      reason: null,
      quality: "good",
      message: "SAFE TOUCHDOWN.",
      fuelPenalty: 0,
      scoreBonus: 0
    };
  }
  ```

  Replace the wrapping logic in `updatePhysicsState`:
  ```javascript
  function updatePhysicsState(state, dt, wrapWidth = 4000) {
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
    let x = state.x + vx * dt;
    const y = state.y + vy * dt;

    // Wrap x coordinates horizontally
    if (x < 0) {
      x += wrapWidth;
    } else if (x > wrapWidth) {
      x -= wrapWidth;
    }

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
  ```

  Replace dynamic width lookup in `getTerrainHeight`:
  ```javascript
  function getTerrainHeight(terrain, x) {
    if (!terrain || !terrain.points || terrain.points.length === 0) return 600;
    
    const segments = terrain.points.length - 1;
    const terrainWidth = terrain.points[segments].x;
    
    let checkX = x % terrainWidth;
    if (checkX < 0) {
      checkX += terrainWidth;
    }
    
    const dx = terrainWidth / segments;
    const index = Math.floor(checkX / dx);
    if (index < 0 || index >= segments) {
      return 600;
    }
    
    const p1 = terrain.points[index];
    const p2 = terrain.points[index + 1];
    
    if (!p1 || !p2) return 600;
    
    const t = (checkX - p1.x) / (p2.x - p1.x);
    return p1.y + t * (p2.y - p1.y);
  }
  ```

  Replace pad widths thresholds in `calculateLandingMultiplier` and `generateTerrain` in `lander-core.js`:
  ```javascript
  function calculateLandingMultiplier(padWidth) {
    if (padWidth <= 75) return 10;
    if (padWidth <= 130) return 5;
    return 2;
  }
  ```
  And inside `generateTerrain`:
  ```javascript
    // Inject flat landing pads
    const padCount = 3;
    const padWidths = [250, 120, 70]; // Wide (2x), Medium (5x), Narrow (10x)
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add lunar-lander/lander-core.js lunar-lander/test.js
  git commit -m "feat: implement terrain physics wrapping and landing quality classification"
  ```

---

### Task 2: Camera Scrolling with 15% Screen Margins

**Files:**
* Modify: `lunar-lander/game.js`

**Interfaces:**
* Consumes:
  * Dynamic lander physics wraps at `4000px`.
* Produces:
  * Camera horizontal scroll tracking within screen margins.

- [ ] **Step 1: Write minimal implementation of scroll tracking in `game.js`**
  Modify camera scroll calculation inside the `update` function in `lunar-lander/game.js`. Add dynamic scroll boundary math and wrap camera scroll at `4000`px.
  
  Inside `update(time, delta)` in `game.js` (around line 687):
  ```javascript
      if (gameState === STATE_PLAYING) {
          // Adjust scroll margins dynamically based on current zoom scale
          const currentZoom = this.cameras.main.zoom;
          const W_world = 800 / currentZoom;
          const M_world = 120 / currentZoom;
          
          const screenX_world = landerState.x - this.cameras.main.scrollX;
          
          if (screenX_world > W_world - M_world) {
              this.cameras.main.scrollX = landerState.x - (W_world - M_world);
          } else if (screenX_world < M_world) {
              this.cameras.main.scrollX = landerState.x - M_world;
          }
          
          // Wrap camera scroll X at [0, 4000]
          let sX = this.cameras.main.scrollX % 4000;
          if (sX < 0) sX += 4000;
          this.cameras.main.scrollX = sX;
  ```
  Wait, also update `generateTerrain` call parameter in `game.js` to pass `4000` instead of `800` (check `generateNewLevel` function). Let's view the `generateNewLevel` in `game.js`:
  ```javascript
  function generateNewLevel(scene) {
      terrain = window.LanderCore.generateTerrain(4000, 600, 12, 1.0); // pass 4000 width
  ```

- [ ] **Step 2: Run verification**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: implement horizontal camera scrolling with margins"
  ```

---

### Task 3: Seamless Boundary Wrapping in Game Rendering

**Files:**
* Modify: `lunar-lander/game.js`

**Interfaces:**
* Produces:
  * Loop-wrapped drawing calls in the Phaser rendering pipelines.

- [ ] **Step 1: Implement wrapped terrain & particle graphics rendering in `game.js`**
  Modify terrain draw loop to draw wrapped lines, and adjust lander, stats, and stars coordinates to accommodate viewport wraps:
  
  Inside `update(time, delta)` terrain drawing block:
  ```javascript
      // 2. Draw Vector Terrain with seamless wrap-around copies
      if (terrain) {
          graphics.lineStyle(2, 0x33ff33, 1);
          
          // Draw normal terrain copy
          graphics.beginPath();
          graphics.moveTo(terrain.points[0].x, terrain.points[0].y);
          for (let i = 1; i < terrain.points.length; i++) {
              graphics.lineTo(terrain.points[i].x, terrain.points[i].y);
          }
          graphics.strokePath();

          // Draw wrapped copies shifted left/right by 4000px
          const offsets = [-4000, 4000];
          offsets.forEach(offset => {
              graphics.beginPath();
              graphics.moveTo(terrain.points[0].x + offset, terrain.points[0].y);
              for (let i = 1; i < terrain.points.length; i++) {
                  graphics.lineTo(terrain.points[i].x + offset, terrain.points[i].y);
              }
              graphics.strokePath();
          });

          // Draw Landing Pads Multipliers (normal and wrapped)
          terrain.landingPads.forEach(pad => {
              graphics.lineStyle(3, 0x33ff33, 1);
              graphics.lineBetween(pad.x1, pad.y, pad.x2, pad.y);
              offsets.forEach(offset => {
                  graphics.lineBetween(pad.x1 + offset, pad.y, pad.x2 + offset, pad.y);
              });
          });
      }
  ```
  And inside stars rendering loop, draw wrapped stars if screen scrolls past boundaries:
  ```javascript
      // 1. Draw Starfield with wrap-around
      graphics.fillStyle(0xffffff, 0.7);
      stars.forEach(s => {
          // Adjust star drawing relative to wrapped space
          let drawX = s.x;
          graphics.fillPoint(drawX, s.y, 1);
      });
  ```

- [ ] **Step 2: Run verification**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: support seamless wrapped terrain drawing in update loop"
  ```

---

### Task 4: Dynamic Camera Zooming

**Files:**
* Modify: `lunar-lander/game.js`

**Interfaces:**
* Produces:
  * Exponential smoothing zoom updates between `0.5x` and `1.0x`.

- [ ] **Step 1: Add dynamic camera zoom calculation in `game.js`**
  Inside `update(time, delta)` in `game.js`, compute distance to ground directly below lander, set target zoom, and LERP camera zoom value:
  ```javascript
          // Calculate distance to the terrain directly below the lander
          const terrainY = window.LanderCore.getTerrainHeight(terrain, landerState.x);
          const altitude = terrainY - landerState.y;
          
          // Determine target zoom level
          const targetZoom = (altitude < 200) ? 1.0 : 0.5;
          
          // Exponential smoothing interpolation
          const cam = this.cameras.main;
          cam.zoom += (targetZoom - cam.zoom) * (1 - Math.exp(-8 * dt));
          
          // Focus camera scroll center on the lander craft
          // Phaser camera scroll matches scrollX, scrollY. Adjust so scroll is centered relative to zoom.
  ```

- [ ] **Step 2: Run verification**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: implement dynamic camera zoom based on ground distance"
  ```

---

### Task 5: Touchdown Quality Overlays & Sound Tuning

**Files:**
* Modify: `lunar-lander/game.js`

**Interfaces:**
* Consumes:
  * Touchdown class outputs `{ success, quality, message, fuelPenalty, scoreBonus }`.
* Produces:
  * Dynamic overlays, score calculations, next-level fuel states, and tuned chime pitches.

- [ ] **Step 1: Update success screen and synthesizer logic in `game.js`**
  Modify collision outcome handling inside `update()` to process Perfect, Good, and Hard landing details.
  
  Inside collision check in `update()`:
  ```javascript
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
  ```
  Wait! Let's update `generateNewLevel()` and game reset logic to check `this.nextLevelFuel`:
  ```javascript
      fuel = currentScene.nextLevelFuel !== undefined ? currentScene.nextLevelFuel : 1000;
      currentScene.nextLevelFuel = 1000; // Reset for next touchdown
  ```

- [ ] **Step 2: Run verification**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: implement touchdown classification messages, penalties, and audio sweeps"
  ```
