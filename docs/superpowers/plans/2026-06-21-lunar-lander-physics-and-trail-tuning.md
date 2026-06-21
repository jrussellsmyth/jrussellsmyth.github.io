# Lunar Lander Physics & Phosphor Trail Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tune the landing thresholds to be more lenient and make the phosphor trail shorter and faster-decaying.

**Architecture:** Define configuration constants for trails and landing limits at the top of the logic/drawing modules to allow clean, easily editable definitions, and update tests accordingly.

**Tech Stack:** JavaScript, Phaser, Node.js (for testing)

## Global Constraints

- White vector lines on pure black with CRT glow and screen curvature.
- Target platform: Desktop and Mobile browsers.
- Phosphor trail length is 3 with decay alphas [0.05, 0.10, 0.20].
- Safe landing parameters: vx <= 15, vy <= 30, angle <= 5.
- Hard landing parameters: vx <= 25, vy <= 45, angle <= 8.

---

### Task 1: Landing Physics Thresholds & Constants in lander-core.js

**Files:**
- Modify: `lunar-lander/lander-core.js:1-66`
- Modify: `lunar-lander/test.js:30-38`

**Interfaces:**
- Consumes: None
- Produces: Update `checkLandingCondition(vx, vy, angle)` with more lenient limits

- [ ] **Step 1: Write failing test vectors in test.js**
  Before modifying the implementation, update the unit tests in `lunar-lander/test.js` to assert the new landing rules. Specifically, modify the assertions for perfect, good, hard, and crashed landings.
  
  Replace lines 30-38 in `lunar-lander/test.js`:
  ```javascript
  const perfectLanding = Core.checkLandingCondition(2, 5, 0.5);
  assert.strictEqual(perfectLanding.success, true);
  assert.strictEqual(perfectLanding.quality, "perfect");

  const safeGoodLanding = Core.checkLandingCondition(10, 20, 3);
  assert.strictEqual(safeGoodLanding.success, true);
  assert.strictEqual(safeGoodLanding.quality, "good");

  const hardLandingNew = Core.checkLandingCondition(18, 35, 7);
  assert.strictEqual(hardLandingNew.success, true);
  assert.strictEqual(hardLandingNew.quality, "hard");

  const crashNew = Core.checkLandingCondition(26, 50, 10);
  assert.strictEqual(crashNew.success, false);
  assert.strictEqual(crashNew.quality, "crash");
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run command: `node lunar-lander/test.js`
  Expected: FAIL (AssertionError regarding landing thresholds)

- [ ] **Step 3: Define constants and update checkLandingCondition in lander-core.js**
  Define the thresholds at the top of `lunar-lander/lander-core.js` and use them in `checkLandingCondition`.

  Replace lines 5-65 in `lunar-lander/lander-core.js`:
  ```javascript
  const MAX_PERFECT_VX = 4;
  const MAX_PERFECT_VY = 8;
  const MAX_PERFECT_ANGLE = 1;

  const MAX_GOOD_VX = 15;
  const MAX_GOOD_VY = 30;
  const MAX_GOOD_ANGLE = 5;

  const MAX_SAFE_VX = 25;
  const MAX_SAFE_VY = 45;
  const MAX_SAFE_ANGLE = 8;

  function checkLandingCondition(vx, vy, angle) {
    const absVx = Math.abs(vx);
    const absVy = Math.abs(vy);
    const absAngle = Math.abs(angle);

    // 1. Crash conditions
    if (absVx > MAX_SAFE_VX || absVy > MAX_SAFE_VY || absAngle > MAX_SAFE_ANGLE) {
      return { success: false, reason: absAngle > MAX_SAFE_ANGLE ? "angle" : "speed", quality: "crash" };
    }

    // 2. Perfect Touchdown Conditions
    if (absVx <= MAX_PERFECT_VX && absVy <= MAX_PERFECT_VY && absAngle <= MAX_PERFECT_ANGLE) {
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

    // 3. Hard Touchdown Conditions
    if (absVx > MAX_GOOD_VX || absVy > MAX_GOOD_VY || absAngle > MAX_GOOD_ANGLE) {
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

    // 4. Good Touchdown Conditions
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

- [ ] **Step 4: Run test to verify it passes**
  Run command: `node lunar-lander/test.js`
  Expected: PASS on Task 1 components (some later unit tests in test.js might still fail and will be fixed in Task 3)

- [ ] **Step 5: Commit changes**
  Run command:
  ```bash
  git add lunar-lander/lander-core.js lunar-lander/test.js
  git commit -m "feat: adjust landing physics thresholds and checkLandingCondition"
  ```

---

### Task 2: Phosphor Trail Length & Alpha Decays in game.js

**Files:**
- Modify: `lunar-lander/game.js:30-1040` (adding constants, updating trail limits and drawing loops)

**Interfaces:**
- Consumes: None
- Produces: Updated lander and debris trails in Phaser loop using new decay/history settings

- [ ] **Step 1: Declare constants in game.js**
  Define `TRAIL_MAX_LENGTH` and `TRAIL_ALPHAS` at the top of `lunar-lander/game.js`.

  Add the following constants right after the configuration definitions (e.g. around line 20-30):
  ```javascript
  const TRAIL_MAX_LENGTH = 3;
  const TRAIL_ALPHAS = [0.05, 0.10, 0.20]; // from oldest to newest
  ```

- [ ] **Step 2: Update landerTrail history limits**
  Find the code block in `update(time, delta)` where elements are pushed to `landerTrail`. Update it to check against `TRAIL_MAX_LENGTH`.

  Modify lines 789-791 in `lunar-lander/game.js`:
  ```javascript
          if (landerTrail.length > TRAIL_MAX_LENGTH) {
              landerTrail.shift();
          }
  ```

- [ ] **Step 3: Update landerTrail drawing loop to use TRAIL_ALPHAS**
  Update the loop where `landerTrail` elements are drawn in `update(time, delta)`.

  Modify lines 1013-1014 in `lunar-lander/game.js`:
  ```javascript
          landerTrail.forEach((t, i) => {
              const alpha = TRAIL_ALPHAS[i];
  ```

- [ ] **Step 4: Update debris history limits and drawing loop**
  Update `updateAndDrawDebris` where historical segments are tracked and drawn.

  Modify lines 679-681 in `lunar-lander/game.js`:
  ```javascript
          if (d.history.length > TRAIL_MAX_LENGTH) {
              d.history.shift();
          }
  ```

  Modify lines 684-686 in `lunar-lander/game.js`:
  ```javascript
          d.history.forEach((h, index) => {
              const alpha = TRAIL_ALPHAS[index];
              trailGraphics.lineStyle(2, 0xffffff, alpha);
  ```

- [ ] **Step 5: Run tests and commit**
  Run command: `node lunar-lander/test.js`
  Expected: Passes basic checks for game.js structure.
  
  Run command:
  ```bash
  git add lunar-lander/game.js
  git commit -m "feat: reduce trail length to 3 and tune decay alphas"
  ```

---

### Task 3: Test Assertions Alignment

**Files:**
- Modify: `lunar-lander/test.js:227-241`

**Interfaces:**
- Consumes: `Core.checkLandingCondition`
- Produces: Validated test suite

- [ ] **Step 1: Identify and update outdated landing test cases in test.js**
  Look at the second check block in `test.js` (around lines 227-241) that validates landing quality classifications. Update them to match the new constants.

  Modify lines 227-241 in `lunar-lander/test.js`:
  ```javascript
  // 2. Verify landing classification results
  const perfLanding = Core.checkLandingCondition(2, 5, 0.5);
  assert.strictEqual(perfLanding.success, true);
  assert.strictEqual(perfLanding.quality, "perfect");
  assert.strictEqual(perfLanding.scoreBonus, 500);
  assert.strictEqual(perfLanding.fuelPenalty, 0);

  const hardLanding = Core.checkLandingCondition(18, 35, 7);
  assert.strictEqual(hardLanding.success, true);
  assert.strictEqual(hardLanding.quality, "hard");
  assert.strictEqual(hardLanding.fuelPenalty, 500);

  const failLanding = Core.checkLandingCondition(26, 50, 10);
  assert.strictEqual(failLanding.success, false);
  ```

- [ ] **Step 2: Run the full test suite**
  Run command: `node lunar-lander/test.js`
  Expected output:
  ```
  Running Core logic tests...
  Running VectorFont checks...
  Running HTML/CSS structure checks...
  Running Terrain generator tests...
  Running Phaser Vector Rendering Engine checks...
  Running Web Audio Synth checks...
  Running Custom Inputs & Mirrored Mobile Gutters checks...
  Running Collision Detection tests...
  Running Touchdown Quality & Dynamic Wrapping tests...
  Running Camera scroll tracking & wrapping tests...
  Running Camera dynamic zoom checks...
  Running HUD Camera separation checks...
  Running VectorFont HUD layout checks...
  Running Phosphor Trails & Decay Motion checks...
  Running Initial Boundary Spawn checks...
  ALL TESTS PASSED!
  ```

- [ ] **Step 3: Commit changes**
  Run command:
  ```bash
  git add lunar-lander/test.js
  git commit -m "test: align landing quality unit tests with new physics limits"
  ```
