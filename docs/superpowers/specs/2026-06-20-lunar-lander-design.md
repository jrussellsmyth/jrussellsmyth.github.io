# Design Document: Lunar Lander (Retro Vector Recreation)
**Date:** 2026-06-20  
**Aesthetic:** 1979 Vector Arcade (CRT Phosphor Glow)  

---

## 1. Overview
Lunar Lander is a faithful recreation of the classic 1979 Atari arcade game, built as a single-page HTML5 web application using **Phaser.js** for physics/game loop orchestration and standard **Web Audio API** for synthesized sound generation. The game features wireframe vector aesthetics, high-fidelity landing physics, procedurally generated terrains with landing multipliers, and customizable inputs optimized for both Desktop and Mobile viewports.

---

## 2. Core Game Mechanics

### 2.1 Physics & Flight Dynamics
* **Gravity:** A constant downward force pulling the lander toward the terrain.
* **Thrust:** A variable force applied in the direction the lander is pointing. The thrust level (throttle) is controlled dynamically from `0%` to `100%`.
* **Rotation:** Direct angle rotation of the lander (left/right) at a fixed angular velocity.
* **Fuel:** Fuel is consumed proportionally to the thrust level. When fuel reaches `0`, thrusters fail, and the lander enters freefall.
* **Velocity Metrics:** Two metrics determine landing success:
  * Horizontal speed ($|v_x| < V_{x\_safe}$)
  * Vertical speed ($v_y < V_{y\_safe}$, where positive is downwards)
  * Lander tilt angle must be close to vertical ($|\theta| < \theta_{safe}$).

### 2.2 Procedural Terrain Generation
* The terrain is generated using a midpoint displacement algorithm (1D plasma fractal) to create rugged lunar mountains and craters.
* Flat horizontal ledges of varying widths are inserted at random locations.
* Narrower ledges are assigned higher score multipliers (e.g., `5X` or `10X`), while wider ledges are assigned lower multipliers (e.g., `2X`).
* The terrain is drawn as a continuous, green glow wireframe path.

### 2.3 Landing & Crash Logic
* **Terrain Collision:** If the lander touches the terrain, we check if it is colliding with a landing pad.
  * **Safe Landing:** Lander is vertical ($|\theta| \le 5^\circ$), horizontal speed $\le 15 \text{ px/s}$, vertical speed $\le 30 \text{ px/s}$. Fuel is replenished, points are awarded (multiplied by the pad's score modifier), and a new level starts.
  * **Crash:** If velocity or angle thresholds are exceeded on landing, or if colliding with non-flat terrain, the lander explodes. The explosion is rendered by breaking the lander's vector polygon into separate line segments that drift away under custom velocities, accompanied by a synthesised white-noise explosion sweep.

---

## 3. Visual Aesthetic & Rendering Pipeline

### 3.1 CRT Phosphor Vector Glow
* **Vector Lines:** All graphics (lander, terrain, stars, text) are drawn as thin lines with a bright green tint (`#33ff33` / `#00ff00`).
* **Glow/Bloom Filter:** We apply a CSS filter `filter: drop-shadow(0 0 4px #00ff00)` on the game canvas, combined with low-opacity drawing passes to emulate CRT bloom and phosphor persistence.
* **CRT Screen Shader:** A subtle scanline overlay is applied using a CSS linear gradient overlay to capture the retro monitor aesthetic.
* **Vector Font:** Use a retro monospaced or simulated vector stroke font (e.g., loaded from Google Fonts like "Press Start 2P" or simulated with line vectors).

### 3.2 Viewport & Layout
* **Desktop Layout:** Full-bleed black screen with simple, clean HUD overlay at the top (Score, Fuel, Speed, Angle, Throttle).
* **Mobile Layout (Gutters):**
  * When mobile is detected, landscape orientation is enforced via CSS.
  * Two prominent visual "gutters" (sidebars) are shown on the left and right sides of the canvas.
  * **Left & Right Gutters (Mirrored Controls):**
    * **Thrust (Vertical Slider):** Drag up/down to increase/decrease throttle from `0` to `100%`.
    * **Rotation (Horizontal Slider / Joystick):** Drag left/right to rotate the lander.
    * Controls are mirrored on both sides to accommodate both left-handed and right-handed play.

---

## 4. Input Mapping

| Device | Action | Input Event | Details |
| :--- | :--- | :--- | :--- |
| **Desktop** | Rotate Left / Right | Left/Right Arrows or A/D | Key down/up changes angular velocity |
| **Desktop** | Throttle (Thrust) | Mouse Wheel (Scroll) | Scroll up increases throttle, down decreases |
| **Mobile** | Rotate Left / Right | Horizontal Slider | Slider value translates directly to angular offset or rotation rate |
| **Mobile** | Throttle (Thrust) | Vertical Slider | Slider value sets absolute thrust level (0–100%) |

---

## 5. Web Audio API Synthesizer
No external audio files are loaded. Sound is generated dynamically using a Web Audio context:
1. **Engine Thrust:** A continuous Low-Frequency Oscillator (LFO) modulating a low-pass filtered brownian/white noise generator + low frequency triangle wave. The sound's volume and pitch scale with the throttle level.
2. **Beep Alarm:** A fast, high-pitched sine wave oscillator beep that triggers when fuel is low or vertical descent speed exceeds safe limits.
3. **Landing Success:** A pleasant synthesized major chord arpeggio (`OscillatorNode`).
4. **Crash Explosion:** A white noise source passed through a band-pass filter with an exponentially decaying envelope and sweep.

---

## 6. Game States & Loop
1. **Title / Boot Screen:** Vector animation showcasing the controls and prompting the user to press "Start" or tap. Shows the current high score.
2. **Action Phase:** Player controls flight. HUD is displayed. Fuel is consumed.
3. **Landing Success Screen:** Pauses flight, shows statistics (Safe Landing! Score multiplier applied, fuel bonus calculated), adds points, and loads next level with shorter/harder landing pads.
4. **Crash Screen:** Triggers explosion animation, displays crash stats (e.g., "Crashed! Speed too high"), deducts a life.
5. **Game Over Screen:** Prompted when lives hit 0. Checks high score. Prompts replay.
