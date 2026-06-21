# Lunar Lander HUD Camera Separation & Control Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement camera separation for HUD text elements to keep them static during camera zooming, and update thruster input logic to prevent keyboard/button inputs from sticking.

**Architecture:**
* Create a dedicated Phaser HUD camera locked at 1.0 zoom that ignores world graphics objects.
* Modify the main camera to ignore all HUD and screen overlay text objects so they are not affected by world zoom.
* Refactor the controls update loop in `game.js` to snap the thruster sliders and desired thrust back to 0 immediately when keyboard/button inputs are released.

**Tech Stack:**
* Phaser 3 (HTML5 canvas framework)
* Vanilla JavaScript
* Node.js Assertions (Unit testing)

## Global Constraints

* Target platform: Desktop (Chrome, Safari, Firefox) and Mobile browsers (enforced portrait mode).
* Visual constraint: Green CRT phosphor vector lines with neon glow bloom.
* Sound constraint: 100% synthetically generated Web Audio API (no static media files).
* Dependency constraint: CDN-loaded Phaser.js, no compilation steps (Babel/Webpack/Vite), pure ES modules.

---

### Task 1: Thruster Input Fixes

**Files:**
* Modify: `lunar-lander/game.js`

**Interfaces:**
* Produces:
  * Non-sticking controls for thruster input.

- [ ] **Step 1: Write the implementation**
  Replace the thrust input logic inside `update(time, delta)` in `lunar-lander/game.js` (around line 790):
  ```javascript
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
        } else if (this.wasKeyboardThrusting) {
            // Keyboard/button was released: snap thrust slider and desired thrust back to 0
            desiredThrust = 0;
            const leftThrustSlider = document.getElementById('thrust-left');
            const rightThrustSlider = document.getElementById('thrust-right');
            if (leftThrustSlider) leftThrustSlider.value = 0;
            if (rightThrustSlider) rightThrustSlider.value = 0;
            this.wasKeyboardThrusting = false;
        } else {
            // Read from slider/throttle if not active keyboard/button thrusting
            const leftThrustSlider = document.getElementById('thrust-left');
            desiredThrust = leftThrustSlider ? parseFloat(leftThrustSlider.value) / 100 : 0;
        }
  ```

- [ ] **Step 2: Verify existing unit tests still pass**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add lunar-lander/game.js
  git commit -m "fix: implement non-sticking thruster input controls"
  ```

---

### Task 2: HUD Camera Separation

**Files:**
* Modify: `lunar-lander/game.js`

**Interfaces:**
* Produces:
  * Fixed HUD elements untouched by camera zoom or scroll.

- [ ] **Step 1: Setup HUD Camera in `create()`**
  Instantiate the HUD camera at the end of the `create()` function in `lunar-lander/game.js` (around line 290):
  ```javascript
      // Create a transparent HUD camera locked at 1.0 zoom overlaying the main camera
      this.hudCamera = this.cameras.add(0, 0, 800, 600);
      this.hudCamera.setScroll(0, 0);

      // Main camera ignores HUD texts
      const hudElements = [
          scoreText,
          fuelText,
          levelLivesText,
          speedText,
          screenTitleText,
          screenDetailText,
          screenPromptText
      ];
      this.cameras.main.ignore(hudElements);

      // HUD camera ignores game world graphics objects
      this.hudCamera.ignore([
          graphics,
          landerGraphics,
          landerGraphicsWrap
      ]);
  ```

- [ ] **Step 2: Update `generateNewLevel()` to ignore dynamic pad texts in HUD Camera**
  Update pad labels text rendering inside `generateNewLevel(scene)` in `lunar-lander/game.js` (around line 610) to make sure they are ignored on the HUD camera:
  ```javascript
            const txt = activeScene.add.text(baseX, pad.y - 18, `${pad.multiplier}X`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '8px',
                color: '#33ff33'
            }).setOrigin(0.5).setAlpha(0.7);
            
            // Ignore pad multiplier labels on HUD camera so they scale with main camera zoom
            if (activeScene.hudCamera) {
                activeScene.hudCamera.ignore(txt);
            }
            
            txt.baseX = baseX;
            padTexts.push(txt);
  ```

- [ ] **Step 3: Verify existing unit tests still pass**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 4: Commit**
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: implement separate HUD camera locked at 1.0 zoom"
  ```

---

### Task 3: Automated Verification Tests

**Files:**
* Modify: `lunar-lander/test.js`

**Interfaces:**
* Produces:
  * Regression assertions verifying camera setup.

- [ ] **Step 1: Add new assertions to `lunar-lander/test.js`**
  Add assertions at the end of the script before printing `ALL TESTS PASSED!` to verify HUD camera setup exists in `game.js`:
  ```javascript
    // Verify HUD camera setup exists in game.js (Task 2 check)
    console.log("Running HUD camera verification checks...");
    assert.ok(gameContent.includes('this.hudCamera = this.cameras.add'), "game.js must add a separate HUD camera");
    assert.ok(gameContent.includes('this.cameras.main.ignore('), "game.js must ignore HUD elements on main camera");
    assert.ok(gameContent.includes('this.hudCamera.ignore('), "game.js must ignore graphics objects on HUD camera");
  ```

- [ ] **Step 2: Run verification**
  Run: `node lunar-lander/test.js`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add lunar-lander/test.js
  git commit -m "test: add HUD camera separation assertions"
  ```
