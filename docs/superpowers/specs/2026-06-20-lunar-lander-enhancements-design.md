# Design Document: Lunar Lander Enhancements
**Date:** 2026-06-20  
**Topic:** Multi-screen Loop, Dynamic Camera Zooming, and Landing Quality Penalties  

---

## 1. Overview
This document specifies the technical design for adding advanced scrolling, zooming, and touchdown quality dynamics to the Lunar Lander retro vector recreation. The goal is to expand the gameplay area beyond a single screen, implement authentic arcade zooming transitions, and reward/penalize landings based on impact velocities and orientation angles.

---

## 2. Multi-screen Loop Terrain

### 2.1 Terrain Scaling
* The width of the procedurally generated terrain is expanded from `800px` to `4000px` (5 full screens wide).
* Horizontal wrap-around limits are adjusted in physics and collision logic to `[0, 4000]` pixels.
* Landing pads are scaled up to match the larger terrain canvas:
  - **Narrow Pad (10x)**: `70px` wide (approx. 2.2 lander widths).
  - **Medium Pad (5x)**: `120px` wide.
  - **Wide Pad (2x)**: `250px` wide.
* Pad widths are matched dynamically in `lander-core.js` to assign appropriate multipliers:
  - Width $\le 75$: 10X
  - Width $\le 130$: 5X
  - Width $> 130$: 2X

### 2.2 Camera Scrolling Window (15% Margins)
* Viewport width remains `800px`. Margins are defined as `120px` from the screen edges.
* The camera will follow the lander horizontally only when the craft exceeds these bounds relative to the current viewport:
  - Let `W_world = 800 / camera.zoom`
  - Let `M_world = 120 / camera.zoom`
  - Let `screenX_world = lander.x - camera.scrollX`
  - If `screenX_world > W_world - M_world`: scroll camera right to `camera.scrollX = lander.x - (W_world - M_world)`.
  - If `screenX_world < M_world`: scroll camera left to `camera.scrollX = lander.x - M_world`.
* The camera scroll X-coordinate is wrapped to `[0, 4000]` using modulo logic.

### 2.3 Seamless Loop Drawing
* When the camera viewport overlaps the boundaries (`camera.scrollX` close to `0` or `4000`), parts of the terrain wrapping around must be drawn.
* To render this seamlessly, terrain drawing logic in `game.js` draws lines twice:
  - Normal copy: lines from points in `[0, 4000]`.
  - Wrapped copy: shifted by `-4000` (if near the right edge) or `+4000` (if near the left edge) relative to coordinates.
* Starfield and lander debris/particles are also rendered wrapping around in coordinate space.

---

## 3. Dynamic Camera Zooming

### 3.1 Zoom Thresholds
* **Zoom Out (0.5x)**: Active when the lander is in high altitude. Makes space feel vast and shows a larger portion of the map.
* **Zoom In (1.0x)**: Active when the lander is close to the surface. Allows precise landing control.
* **Cutoff Trigger**: Distance to the ground directly below the lander's feet. Let `altitude = getTerrainHeight(terrain, landerState.x) - landerState.y`.
  - If `altitude < 200px`: Target Zoom = `1.0`.
  - If `altitude >= 200px`: Target Zoom = `0.5`.

### 3.2 Smooth Interpolation
* The transition between zoom levels is computed dynamically in the update loop using frame-rate independent exponential smoothing:
  - `camera.zoom += (targetZoom - camera.zoom) * (1 - Math.exp(-8 * dt))`
* The viewport rendering center focuses on the lander to keep it centered during zoom changes.

---

## 4. Landing Quality & Penalties

### 4.1 Classification Rules
Touchdown checks are expanded to classify landing speed and angle quality:

| Class | Horizontal Speed ($|v_x|$) | Vertical Speed ($v_y$) | Tilt Angle ($|\theta|$) | Screen Messages (Randomized) | Next Level Fuel | Landing Score Mod |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Perfect** | $\le 4 \text{ px/s}$ | $\le 8 \text{ px/s}$ | $\le 1^\circ$ | `PERFECT LANDING! THE EAGLE HAS LANDED.`, `FLAWLESS TOUCHDOWN! OUTSTANDING WORK.`, `PERFECT SCORE! HOUSTON IS PLEASED.` | `1000` (Full) | `+500` Bonus Points |
| **Good** | $\le 10 \text{ px/s}$ | $\le 20 \text{ px/s}$ | $\le 3^\circ$ | `SAFE TOUCHDOWN.` | `1000` (Standard) | Normal Points |
| **Hard** | $\le 15 \text{ px/s}$ | $\le 30 \text{ px/s}$ | $\le 5^\circ$ | `HARD LANDING HAS DAMAGED YOUR LIFE SUPPORT!`, `YOU HAVE LANDED BUT THIS IS A ONE WAY TRIP!` | **`500` (Penalized)** | **`25%` Reduction** |
| **Crash** | $> 15 \text{ px/s}$ | $> 30 \text{ px/s}$ | $> 5^\circ$ | (Standard Crash Screens) | Resets to normal | Lose 1 Life |

---

## 5. Web Audio Synth Tuning
* **Perfect Landing**: Plays a high-pitched, sparkling major arpeggio chime sweep.
* **Good Landing**: Plays the standard pleasant major arpeggio.
* **Hard Landing**: Plays a detuned arpeggio sweep accompanied by a low-pitched rumble alarm sweep.

---

## 6. Testing & Verification

### 6.1 Unit Tests (test.js)
* **Terrain Loop**: Verify terrain generated at `4000px` width correctly loops points.
* **Landing Quality**: Assert classifications and multipliers for Perfect, Good, and Hard inputs match specification bounds.
* **Zooming Bounds**: Verify height-to-zoom calculation functions return expected values.

### 6.2 Browser Verification
* Test loop boundaries and verify screen wrapping is visually seamless.
* Touchdown repeatedly at different velocities to verify HUD messages and starting fuel penalties.
