# Design Spec: Lunar Lander 1979 Atari Arcade Vector Cabinet Recreation

**Date:** 2026-06-21  
**Status:** Under Review  
**Topic:** Retro Atari Arcade Vector Cabinets Visual Identity Recreation

---

## 1. Goal

Refactor the Lunar Lander retro reproduction to match the 1979 Atari arcade vector cabinet's original visual identity based on expert feedback.

---

## 2. Visual & Aesthetics Refactoring

### 2.1 Color Palette & Glow Transition
* **Color Scheme**: Transition all vectors (terrain, lander, pads, text, indicators) from Apple II/PC terminal green (`#33ff33` / `0x33ff33`) to authentic arcade vector white/off-white (`#ffffff` / `0xffffff` / `#e0e0e0`).
* **Phosphor Bloom**: Emulate CRT vector screen phosphor excitation via a dual-pass CSS drop-shadow filter on the canvas:
  ```css
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9)) 
          drop-shadow(0 0 6px rgba(255, 255, 255, 0.45));
  ```
* **Vignette & Screen Curve**: Add a radial gradient vignette overlay in CSS to simulate a curved glass CRT tube surface:
  ```css
  background: radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%);
  ```
  And remove the green screen-wrapper borders.

### 2.2 Vector Starfield & Terrain Lines
* **Sparse Stars**: Reduce the starfield from 200 dense stars to 30 faint, single-pixel points.
* **Sharp Terrain**: Ensure the terrain lines are drawn with sharp vector segments rather than smooth curves.

---

## 3. Programmatic Vector Font (`vector-font.js`)

To replicate the iconic Atari vector text font, we replace Phaser's bitmap/bitmap-like text with a custom client-side programmatic stroke font.

### 3.1 Font Data Representation
* Create a dedicated `vector-font.js` module.
* Define characters on a normalized $4 \times 6$ coordinate grid.
* Represent glyph definitions as arrays of line segments `[x1, y1, x2, y2]`.
* Expose:
  - `VectorFont.drawText(graphics, text, x, y, size, color, strokeWidth)`
  - `VectorFont.getTextWidth(text, size)`

### 3.2 Drawing Integration
* Keep existing Phaser text objects (hidden/alpha=0) to maintain structural layout checks and prevent breaking unit tests in `test.js`.
* Instantiate a dedicated `hudTextGraphics` (on `this.hudCamera` to ignore zooming/scrolling) and `worldTextGraphics` (for landing pad labels, zoomable/scrollable).
* Clear and draw text segments programmatically in the scene update loop.

---

## 4. HUD Reorganization

Reorganize the screen layouts to align with 1979 Atari arcade cabinet specifications:

* **Left HUD Stack**:
  - `SCORE`: 6 digits padded (e.g. `000150`)
  - `TIME`: level timer in seconds, 6 digits padded (e.g. `000045`)
  - `FUEL`: 6 digits padded (e.g. `000920`)
* **Right HUD Stack**:
  - `ALTITUDE`: 6 digits padded (e.g. `000480`)
  - `HORIZONTAL SPEED`: 6 digits padded with speed direction arrow (`←` or `→` based on velocity sign, e.g. `000012 →`)
  - `VERTICAL SPEED`: 6 digits padded with velocity direction arrow (`↑` if ascending, `↓` if descending, e.g. `000008 ↓`)
* **Remove Arcade-Inaccurate Metrics**:
  - Remove `HIGH SCORE`, `LEVEL`, `LIVES` from the HUD layout (retaining the variables for game states).

---

## 5. Motion Trails & Afterglow Decay

Vector displays have natural phosphor decay trails. We simulate this for the lander capsule and debris.

### 5.1 Lander Trails
* Maintain a rolling history of the last 4 frames of coordinates (`x`, `y`, `angle`).
* Render these 4 frames with decaying opacity (e.g., alphas: `0.1`, `0.2`, `0.3`, `0.4` or similar) prior to drawing the active lander.
* Ensure coordinate wrapping calculations are mirrored on the trails.

### 5.2 Debris Trails
* Maintain a `history` array for each debris segment.
* Draw past frames with decaying opacities during the explosion sequence.

---

## 6. Initial Boundary Spawn Mechanics

* At start/reset, randomize the lander's horizontal spawn location:
  - **Left Viewport Edge**: `x = 20`, velocity `vx = 75` (moving right).
  - **Right Viewport Edge**: `x = 780`, velocity `vx = -75` (moving left).
* Set camera `scrollX = 0` initially.

---

## 7. Verification & Testing

1. **Automated Unit Tests**:
   - Ensure the existing `test.js` assertions continue to pass.
   - Add new assertions to check that the vector font module is loaded and HUD columns are properly structured.
2. **Visual Verification**:
   - Confirm screen layout alignment, CRT glow effects, vignette overlays, and phosphor decay trails behave smoothly in the web browser.
