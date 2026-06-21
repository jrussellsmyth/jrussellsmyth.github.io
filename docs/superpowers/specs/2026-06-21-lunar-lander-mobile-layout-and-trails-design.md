# Design Spec: Lunar Lander Layout, Controls, and Trail Zoom Correction

**Date:** 2026-06-21  
**Status:** Under Review  
**Topic:** Landing Pad Frequency, Mobile Landscape Controls, and Screen-Space Phosphor Trails

---

## 1. Goal

Enhance the Lunar Lander retro reproduction with three key modifications:
1. Increase landing pad frequency to improve playability and visual pacing.
2. Force landscape orientation on mobile devices, remove all legacy range sliders, and implement dual-gutter control panels in the bottom 1/3 of the screen with rotation and thrust buttons to accommodate both left and right-handed users.
3. Fix the phosphor trail afterglow zoom scaling by decoupling trails from the camera zoom/scroll transformations and rendering them in stationary screen-space coordinates.

---

## 2. Landing Pad Frequency

### 2.1 Requirements
* Establish 3-5 flat landing pads per screen width. Since the screen width is 800px and the world width is 4000px, there are 5 screen widths.
* This requires generating **15 to 25 landing pads total** (we will target exactly 20 pads for `width = 4000`, which equates to 4 pads per screen width).
* For smaller widths (e.g. 800px in unit tests), the pad count scales proportionally (4 pads total).

### 2.2 Placement & Overlap Prevention
* Increase midpoint displacement terrain segments from 128 to **512** when generating a 4000px world. This provides a higher resolution layout (points spaced every 7.81px) allowing multiple pads to sit in close proximity.
* Reduce the occupied verification buffer size proportionally to allow tight packing.
* Cycle through the standard pad widths (`250`, `120`, and `70` pixels unscaled) for the generated pads.
* **Important Compatibility Gate:** Ensure the first three generated pads in the `landingPads` array are exactly `250`, `120`, and `70` (unscaled) respectively. This guarantees that existing assertions in [test.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/test.js) checking the first three pads' multipliers pass without changes.

---

## 3. Mobile Landscape Controls & Orientation

### 3.1 Orientation Enforcement
* Revert the mobile warning logic to enforce **landscape** orientation.
* Update [index.html](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/index.html) warning text: "ROTATE DEVICE — PLEASE ROTATE YOUR DEVICE TO LANDSCAPE MODE TO PLAY."
* Modify the CSS media queries in [style.css](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/style.css) to display the orientation warning overlay only when the mobile device is in **portrait** orientation:
  ```css
  @media (pointer: coarse) and (orientation: portrait) {
      #landscape-warning {
          display: flex;
      }
  }
  ```

### 3.2 Dual-Gutter Button Panels (Bottom 1/3 Placement)
* Keep `#game-wrapper` in `flex-direction: row` layout on mobile coarse pointers so the gutters and canvas display side-by-side.
* Remove all legacy range slider inputs (`thrust-left`, `thrust-right`, `steer-left`, `steer-right`) and their containing `.control-box` DOM elements from [index.html](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/index.html) completely.
* In each gutter (left and right), place the layout inside a container styled to align to the bottom 1/3 of the viewport.
* The button layout in each gutter will be vertically stacked as follows:
  - At the top of the stack: A single `THRUST` button spanning the full width of the gutter.
  - Directly below it: A row containing two side-by-side rotation buttons (`ROT L` and `ROT R`).
* HTML structure inside `.left-gutter` and `.right-gutter`:
  ```html
  <div class="gutter-controls-container">
      <div class="gutter-buttons">
          <button class="control-btn btn-thrust" id="btn-thrust-left">THRUST</button>
          <div class="rot-buttons">
              <button class="control-btn btn-left" id="btn-left-left">ROT L</button>
              <button class="control-btn btn-right" id="btn-right-left">ROT R</button>
          </div>
      </div>
  </div>
  ```
  *(IDs for the right gutter suffix with `-right`)*

### 3.3 Input Handler Mapping & Test Updates
* In `game.js`, bind both `mousedown` / `touchstart` and `mouseup` / `touchend` events to all six button elements.
* Maintain active button states using `Set` structures for independent tracking:
  ```javascript
  let activeThrustButtons = new Set();
  let activeLeftButtons = new Set();
  let activeRightButtons = new Set();
  ```
* Remove slider synchronization logic, wheel listener slider reference updates, and smooth slider velocity math from physics calculations. Steer and thrust inputs will rely entirely on keyboard events and the new active button states.
* Update [test.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/test.js):
  - Delete legacy assertions expecting IDs `thrust-left`, `thrust-right`, `steer-left`, `steer-right`.
  - Add assertions verifying that the new mobile buttons (`btn-thrust-left`, `btn-thrust-right`, `btn-left-left`, `btn-left-right`, `btn-right-left`, `btn-right-right`) exist in the HTML structure.
  - Verify that the game code binds events to these elements and reads their states.

---

## 4. Screen-Space Phosphor Trails (Option A)

### 4.1 Concept
* Phosphor trail afterglow is an screen-space decay artifact of the CRT screen monitor glass. It must represent stationary screen-space pixels and not stretch or zoom with camera scale changes.

### 4.2 Lander Trail Implementation
* Create a dedicated `hudTrailGraphics` Phaser graphics object. Add it to the HUD camera so it is drawn at `1.0` zoom and ignoring camera scroll.
* In `update()`, convert the lander's historical world coordinates (`t.x`, `t.y`) to screen coordinates using the camera's current zoom and scroll position:
  ```javascript
  const cameraCenter = cam.scrollX + 400;
  let deltaX = t.x - cameraCenter;
  // Wrap deltaX horizontally relative to the 4000px world
  deltaX = ((deltaX + 2000) % 4000 + 4000) % 4000 - 2000;
  
  const screenX = 400 + deltaX * cam.zoom;
  const screenY = 300 + (t.y - 300) * cam.zoom;
  ```
* Clear `hudTrailGraphics` every frame and render the 4 historical trail frames at screen coordinates (`screenX`, `screenY`) using `drawVectorLander` (passing the HUD trail graphics object).
* This guarantees the decay trails keep a constant unzoomed stroke thickness (2px) and realistic decay motion.

### 4.3 Debris Trail Implementation
* During ship destruction, particles (debris) fly in world space.
* The current frame of each debris piece is drawn in world coordinates (so it scales and scrolls normally).
* The *trails* (historical frames) of all debris pieces are drawn in screen space on `hudTrailGraphics` (or `hudTextGraphics`) by transforming their historical coordinates `(h.x, h.y)` using the same screen-space projection formula.
* This keeps the debris afterglow trail thickness at 2px and decoupled from zoom.

---

## 5. Verification & Testing Plan

1. **Automated Unit Tests**:
   - Run `node lunar-lander/test.js` to verify that existing assertions pass.
   - Extend the test suite to verify landscape warnings, segment count, and dual gutter buttons.
2. **Visual Verification**:
   - Verify mobile landscape warning overlays.
   - Inspect dual side buttons on mobile devices using simulator tools.
   - Confirm phosphor trails for the ship and debris have consistent thickness and spacing under all zoom levels.
