# Design Spec: Lunar Lander HUD Camera Separation & Control Fixes

**Date:** 2026-06-20  
**Status:** Approved  
**Topic:** HUD Camera Separation & Thruster Input Fixes

## 1. Goal

Address two critical issues identified after the Lunar Lander enhancements:
1. **HUD Camera Separation**: Prevent the camera zoom from affecting HUD and screen title/overlay text objects, ensuring they remain static, crisp, and properly aligned.
2. **Thruster Sticking Fix**: Ensure the thruster cleanly fires and stops when keyboard/button controls are used, resolving the sticking issue where the thrust stayed locked at 1.0 on release.

---

## 2. Architecture & Design

### 2.1 HUD Camera Separation
Phaser 3 cameras post-process the entire viewport. Rather than manually countering zoom and scroll math on each individual text element, we introduce a dual-camera system:

1. **Main Camera (`this.cameras.main`)**:
   * Handles the game world.
   * Scales dynamically between `0.5x` (zoomed out at high altitude) and `1.0x` (zoomed in near the ground).
   * Scrolls horizontally between `0` and `4000px`.
   * **Ignores**: HUD text labels (`scoreText`, `fuelText`, `levelLivesText`, `speedText`) and screen overlay texts (`screenTitleText`, `screenDetailText`, `screenPromptText`).

2. **HUD Camera (`this.hudCamera`)**:
   * Standard transparent overlays.
   * Fixed at `1.0` zoom and `(0, 0)` camera scroll.
   * **Ignores**: World graphics elements (`graphics`, `landerGraphics`, `landerGraphicsWrap`) and dynamic level text elements (landing pad multiplier text objects `padTexts`).

#### Ignoring Dynamic Text Objects
In `generateNewLevel()`, when dynamic landing pad labels (e.g. `2X`, `5X`, `10X`) are created, we must call `this.hudCamera.ignore(txt)` to keep them strictly bound to the zoomable/scrollable main camera viewport.

---

### 2.2 Thruster Input Logic
We replace the current checks in the physics update block inside `update(time, delta)` in `game.js` to cleanly transition from active button/key press back to slider-based input:

```javascript
// Inside update():
let desiredThrust = landerState.thrust;

// Check keyboard or mobile button input for thrust
const isThrusting = (cursorKeys.up && cursorKeys.up.isDown) || 
                    (this.wasd && this.wasd.up && this.wasd.up.isDown) ||
                    window.isThrustingButtonActive;

if (isThrusting) {
    desiredThrust = 1.0;
    // Update the slider UI values to sync when keyboard/button is held
    const leftThrustSlider = document.getElementById('thrust-left');
    const rightThrustSlider = document.getElementById('thrust-right');
    if (leftThrustSlider) leftThrustSlider.value = 100;
    if (rightThrustSlider) rightThrustSlider.value = 100;
    this.wasKeyboardThrusting = true;
} else if (this.wasKeyboardThrusting) {
    // Keyboard/button was released: reset slider UI and set thrust to 0
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

---

## 3. Verification & Testing

1. **Automated Unit Tests**:
   * Run the test suite: `node lunar-lander/test.js`.
   * Add assertion checks to verify that `game.js` creates a separate HUD camera and ignores the correct Game Objects.
2. **Manual Visual Testing**:
   * Verify that HUD texts (Score, Fuel, Speed, etc.) do not change in size or position when the lander ascends (zoom transitions to `0.5x`) or moves horizontal margins.
   * Verify that pressing and releasing the Up key or W key starts and stops the thruster cleanly, showing/hiding the engine flame.
