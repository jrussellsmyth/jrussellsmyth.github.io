# Lunar Lander Mobile Layout and Trail Zoom Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Lunar Lander game to increase landing pad frequency, implement dual-gutter landscape controls at the bottom 1/3 on mobile (removing legacy sliders), and draw decoupled screen-space phosphor trails.

**Architecture:** Use a higher resolution terrain segment count (512) with tighter occupancy checks to generate 15 landing pads total across the 4000px world. Style the mobile gutters to align to the bottom 1/3 of the landscape viewport, holding control buttons inside them. Map touch events on all left/right gutter buttons to input sets. Draw ship and debris decay trails on an unzoomed, scroll-locked screen-space HUD Graphics overlay.

**Tech Stack:** JavaScript (ES6 modules), Phaser.js (v3.80.1), Vanilla CSS, HTML5.

## Global Constraints

- Target platform: Desktop (Chrome, Safari, Firefox) and Mobile browsers (enforced landscape mode).
- Visual constraint: White vector lines on pure black with CRT glow and screen curvature.
- Sound constraint: 100% synthetically generated Web Audio API.
- Naming constraint: Export the VectorFont object via module.exports and define it on window.VectorFont.
- Verify tests pass before completing.

---

### Task 1: Terrain Generation Segment Count & Landing Pad Density

**Files:**
- Modify: `lunar-lander/lander-core.js:125-231`
- Test: `lunar-lander/test.js:84-105`

**Interfaces:**
- Consumes: None
- Produces: `Core.generateTerrain` updated points count and landing pads frequency.

- [ ] **Step 1: Write the terrain and landing pads test**

Update [test.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/test.js#L84-L105) to assert the higher resolution segments and the increased number of landing pads for a 4000px world.

Change:
```javascript
  const terrain = Core.generateTerrain(width, height, 8, 1.0);

  // Assert we got valid coordinates
  assert.ok(terrain.points.length > 50);
```
To:
```javascript
  const terrain = Core.generateTerrain(width, height, 8, 1.0);

  // Assert segments resolution is higher for 4000px world
  const testTerrain4000 = Core.generateTerrain(4000, 600, 12, 1.0);
  assert.strictEqual(testTerrain4000.points.length, 513); // 512 segments + 1 point
  assert.strictEqual(testTerrain4000.landingPads.length, 15); // 15 landing pads total (3 per screen)
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node lunar-lander/test.js
```
Expected: FAIL with assertion error showing incorrect points count or landing pads length.

- [ ] **Step 3: Update generateTerrain in lander-core.js**

Replace the terrain segments configuration and pad counts logic in [lander-core.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/lander-core.js#L125-L231):
```javascript
function generateTerrain(width, height, count, difficulty) {
  let actualDifficulty = 1.0;
  if (difficulty !== undefined) {
    actualDifficulty = difficulty;
  } else if (count !== undefined) {
    actualDifficulty = count;
  }

  const points = [];
  const landingPads = [];
  
  // Seed points evenly across width
  const segments = width >= 4000 ? 512 : 128;
  const dx = width / segments;
  const heights = new Array(segments + 1);

  // Initial boundary heights (must be identical for seamless loop wrap-around)
  const boundaryHeight = height - 100 - Math.random() * 150;
  heights[0] = boundaryHeight;
  heights[segments] = boundaryHeight;

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
  
  const roughnessCap = Math.min(1.8, 1.2 + actualDifficulty * 0.08);
  displace(0, segments, roughnessCap);

  // Inject flat landing pads (3 pads per 800px screen width)
  const padCount = Math.max(3, Math.floor((width / 800) * 3));
  const scale = width / 4000;
  const unscaledWidths = [250, 120, 70];
  const padWidths = [];
  for (let i = 0; i < padCount; i++) {
    const unscaledW = unscaledWidths[i % unscaledWidths.length];
    padWidths.push({
      unscaled: unscaledW,
      scaled: unscaledW * scale
    });
  }
  const occupied = new Array(segments + 1).fill(false);
  
  // Enforce checkBuffer = 5 to accommodate taper width N = 4 transitions
  const checkBuffer = 5;

  for (let i = 0; i < padCount; i++) {
    const pWidth = padWidths[i].scaled;
    const pMult = calculateLandingMultiplier(padWidths[i].unscaled);
    const maxSegmentOffset = Math.floor(pWidth / dx);
    
    let startSeg = 0;
    let endSeg = 0;
    let attempts = 0;
    let overlap = true;
    
    while (overlap && attempts < 100) {
      startSeg = Math.floor(Math.random() * (segments - maxSegmentOffset - 10)) + 5;
      endSeg = startSeg + maxSegmentOffset;
      
      overlap = false;
      for (let s = startSeg - checkBuffer; s <= endSeg + checkBuffer; s++) {
        if (s >= 0 && s <= segments && occupied[s]) {
          overlap = true;
          break;
        }
      }
      attempts++;
    }
    
    // Mark range as occupied
    for (let s = startSeg - checkBuffer + 1; s <= endSeg + checkBuffer - 1; s++) {
      if (s >= 0 && s <= segments) {
        occupied[s] = true;
      }
    }
    
    // Align pad height to the original terrain's average height in that range
    let originalAvgY = 0;
    for (let s = startSeg; s <= endSeg; s++) {
      originalAvgY += heights[s];
    }
    const padY = originalAvgY / (endSeg - startSeg + 1);
    
    for (let s = startSeg; s <= endSeg; s++) {
      heights[s] = padY;
    }
 
    // Taper left transition over N = 4 segments
    const N = 4;
    const leftBoundarySeg = startSeg - N - 1;
    if (leftBoundarySeg >= 0) {
      const yLeftBoundary = heights[leftBoundarySeg];
      for (let s = startSeg - N; s < startSeg; s++) {
        const t = (s - leftBoundarySeg) / (N + 1);
        heights[s] = yLeftBoundary + (padY - yLeftBoundary) * t;
      }
    }

    // Taper right transition over N = 4 segments
    const rightBoundarySeg = endSeg + N + 1;
    if (rightBoundarySeg <= segments) {
      const yRightBoundary = heights[rightBoundarySeg];
      for (let s = endSeg + 1; s <= endSeg + N; s++) {
        const t = (s - endSeg) / (N + 1);
        heights[s] = padY + (yRightBoundary - padY) * t;
      }
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
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
node lunar-lander/test.js
```
Expected: PASS (Terrain generator tests pass, other tests still green)

- [ ] **Step 5: Commit changes**

```bash
git add lunar-lander/lander-core.js lunar-lander/test.js
git commit -m "feat: increase landing pad frequency and segment resolution for large terrain widths"
```

---

### Task 2: Mobile Warning, Gutter Buttons HTML, and CSS Styling

**Files:**
- Modify: `lunar-lander/index.html:18-65`
- Modify: `lunar-lander/style.css:65-296`
- Modify: `lunar-lander/test.js:163-181`

**Interfaces:**
- Consumes: None
- Produces: Landscape warned layout structure, new buttons in left/right HTML gutters, updated responsive classes.

- [ ] **Step 1: Write test assertions for gutter buttons and landscape mode**

Modify [test.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/test.js#L163-L181) to remove legacy range slider checks and check for the existence of the new gutter buttons:
```javascript
  // Custom Inputs & Mirrored Mobile Gutters checks (Task 6 verification)
  console.log("Running Custom Inputs & Mirrored Mobile Gutters checks...");
  assert.ok(htmlContent.includes('id="btn-thrust-left"'), "HTML must contain left thrust button");
  assert.ok(htmlContent.includes('id="btn-thrust-right"'), "HTML must contain right thrust button");
  assert.ok(htmlContent.includes('id="btn-left-left"'), "HTML must contain left rot-left button");
  assert.ok(htmlContent.includes('id="btn-left-right"'), "HTML must contain right rot-left button");
  assert.ok(htmlContent.includes('id="btn-right-left"'), "HTML must contain left rot-right button");
  assert.ok(htmlContent.includes('id="btn-right-right"'), "HTML must contain right rot-right button");
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node lunar-lander/test.js
```
Expected: FAIL on the new HTML content assertions (since buttons don't exist yet).

- [ ] **Step 3: Modify index.html**

Update the landscape warning message, remove all old slider blocks, and add the bottom-aligned controls container inside left and right gutters in [index.html](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/index.html#L18-L65):
```html
    <div id="landscape-warning">
        <h1>ROTATE DEVICE</h1>
        <p>PLEASE ROTATE YOUR DEVICE TO LANDSCAPE MODE TO PLAY.</p>
    </div>
    <div id="game-wrapper">
        <div class="gutter left-gutter">
            <div class="gutter-controls-container">
                <div class="gutter-buttons">
                    <button class="control-btn btn-thrust" id="btn-thrust-left">THRUST</button>
                    <div class="rot-buttons">
                        <button class="control-btn btn-left" id="btn-left-left">ROT L</button>
                        <button class="control-btn btn-right" id="btn-right-left">ROT R</button>
                    </div>
                </div>
            </div>
        </div>

        <div id="game-container"></div>

        <div class="gutter right-gutter">
            <div class="gutter-controls-container">
                <div class="gutter-buttons">
                    <button class="control-btn btn-thrust" id="btn-thrust-right">THRUST</button>
                    <div class="rot-buttons">
                        <button class="control-btn btn-left" id="btn-left-right">ROT L</button>
                        <button class="control-btn btn-right" id="btn-right-right">ROT R</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
```

- [ ] **Step 4: Update CSS rules in style.css**

Replace CSS configurations for mobile layout and landscape warnings in [style.css](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/style.css#L65-L296) to position the control buttons inside the bottom 1/3 of the gutters, hide sliders, and warn on portrait orientation:
```css
.gutter {
    width: 80px;
    background-color: #0d0d0d;
    border-right: 2px solid #ffffff;
    display: none; /* Hidden on desktop */
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    padding: 10px;
    height: 100%;
}

.right-gutter {
    border-right: none;
    border-left: 2px solid #ffffff;
}

.gutter-controls-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
}

.rot-buttons {
    display: flex;
    gap: 6px;
    width: 100%;
}

.rot-buttons .control-btn {
    flex: 1;
    height: 45px;
    font-size: 8px;
}

.btn-thrust {
    width: 100%;
    height: 60px;
    font-size: 10px;
}

/* Landscape/portrait warn overlays on mobile coarse */
@media (pointer: coarse) and (orientation: portrait) {
    #landscape-warning {
        display: flex;
    }
}

@media (pointer: coarse) {
    #game-wrapper {
        flex-direction: row;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        max-width: none;
        max-height: none;
        border: none;
        box-shadow: none;
    }

    #game-container {
        flex-grow: 1;
        height: 100%;
        width: auto;
    }

    .gutter {
        display: flex !important;
    }

    .control-btn {
        background-color: transparent;
        border: 2px solid #ffffff;
        color: #ffffff;
        font-family: 'Press Start 2P', monospace;
        text-align: center;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
        transition: background-color 0.1s ease, box-shadow 0.1s ease, transform 0.05s ease;
        outline: none;
    }

    .control-btn:active, .control-btn.active {
        background-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 0 20px #ffffff, inset 0 0 10px #ffffff;
        transform: scale(0.98);
    }
}
```

- [ ] **Step 5: Run tests to verify passing**

Run:
```bash
node lunar-lander/test.js
```
Expected: PASS (HTML elements found successfully)

- [ ] **Step 6: Commit**

```bash
git add lunar-lander/index.html lunar-lander/style.css lunar-lander/test.js
git commit -m "feat: restructure mobile layout to force landscape and add side gutter touch buttons"
```

---

### Task 3: Dual-Gutter Button Input Handlers Mapping & Physics simplification

**Files:**
- Modify: `lunar-lander/game.js:397-495`, `lunar-lander/game.js:895-929`
- Test: `lunar-lander/test.js:174-181`

**Interfaces:**
- Consumes: Gutter buttons IDs in index.html.
- Produces: Updated input variables, simplified updatePhysics check.

- [ ] **Step 1: Update test file constraints**

Update [test.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/test.js#L174-L181) to verify that `game.js` contains references to the new buttons instead of legacy sliders:
```javascript
  // Verify game.js contains layout buttons listener logic
  assert.ok(gameContent.includes("this.input.on('wheel'"), "game.js must listen to wheel events");
  assert.ok(gameContent.includes("btn-thrust-left"), "game.js must reference left thrust button");
  assert.ok(gameContent.includes("btn-thrust-right"), "game.js must reference right thrust button");
  assert.ok(gameContent.includes("btn-left-left"), "game.js must reference left rot-left button");
  assert.ok(gameContent.includes("btn-right-left"), "game.js must reference left rot-right button");
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node lunar-lander/test.js
```
Expected: FAIL (game.js does not yet reference new buttons)

- [ ] **Step 3: Replace inputs listener binding block in game.js**

In `create()` in [game.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/game.js#L397-L495), remove all old slider and portrait button handlers, and insert:
```javascript
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
```

- [ ] **Step 4: Simplify update loop input physics in game.js**

In `update()` in [game.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/game.js#L895-L929), remove slider-referencing thrust synchronization and steer velocity math. Replace with direct button check assignments:
```javascript
        // Check keyboard or mobile button input for thrust
        const isThrusting = (cursorKeys.up && cursorKeys.up.isDown) || 
                            (this.wasd && this.wasd.up && this.wasd.up.isDown) ||
                            window.isThrustingButtonActive;
        
        desiredThrust = isThrusting ? 1.0 : 0.0;

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
```

- [ ] **Step 5: Run tests to verify passing**

Run:
```bash
node lunar-lander/test.js
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lunar-lander/game.js lunar-lander/test.js
git commit -m "feat: map dual-gutter button event listeners and simplify inputs physics checks"
```

---

### Task 4: Screen-Space Decoupled Phosphor Trails

**Files:**
- Modify: `lunar-lander/game.js`
- Test: `lunar-lander/test.js`

**Interfaces:**
- Consumes: `this.hudCamera`
- Produces: `this.hudTrailGraphics` projection and render trails unzoomed.

- [ ] **Step 1: Write tests for screen-space trails**

Update [test.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/test.js) to assert initialization of `hudTrailGraphics` and ensure the main camera ignores it:
```javascript
  assert.ok(gameContent.includes('hudTrailGraphics = this.add.graphics();'), "game.js must initialize hudTrailGraphics");
  assert.ok(gameContent.includes('this.cameras.main.ignore(') && gameContent.includes('hudTrailGraphics'), "main camera must ignore hudTrailGraphics");
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
node lunar-lander/test.js
```
Expected: FAIL (hudTrailGraphics not yet defined)

- [ ] **Step 3: Define hudTrailGraphics and ignore properties in game.js**

In `create()` inside [game.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/game.js), define:
```javascript
    hudTrailGraphics = this.add.graphics();
```
And modify main camera ignore list:
```javascript
    this.cameras.main.ignore([scoreText, fuelText, levelLivesText, speedText, screenTitleText, screenDetailText, screenPromptText, hudTextGraphics, hudTrailGraphics]);
```
*(HUD camera does not ignore hudTrailGraphics).*

- [ ] **Step 4: Update debris drawing helper signature**

Update `updateAndDrawDebris` declaration in [game.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/game.js):
```javascript
function updateAndDrawDebris(worldGraphics, trailGraphics, dt, cam) {
    const gravity = 25.0;
    
    debris.forEach(d => {
        if (!d.history) {
            d.history = [];
        }
        d.history.push({ x: d.x, y: d.y, angle: d.angle });
        if (d.history.length > 4) {
            d.history.shift();
        }

        // Draw historical segments in screen space (unzoomed) on trailGraphics
        d.history.forEach((h, index) => {
            const alpha = ((index + 1) / (d.history.length + 1)) * 0.45;
            trailGraphics.lineStyle(2, 0xffffff, alpha);

            const rad = (h.angle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const x1_world = h.x + d.lx1 * cos - d.ly1 * sin;
            const y1_world = h.y + d.lx1 * sin + d.ly1 * cos;
            const x2_world = h.x + d.lx2 * cos - d.ly2 * sin;
            const y2_world = h.y + d.lx2 * sin + d.ly2 * cos;

            const cameraCenter = cam.scrollX + 400;
            const toScreenX = (wx) => {
                let deltaX = wx - cameraCenter;
                deltaX = ((deltaX + 2000) % 4000 + 4000) % 4000 - 2000;
                return 400 + deltaX * cam.zoom;
            };
            const toScreenY = (wy) => {
                return 300 + (wy - 300) * cam.zoom;
            };

            trailGraphics.lineBetween(toScreenX(x1_world), toScreenY(y1_world), toScreenX(x2_world), toScreenY(y2_world));
        });

        // Update physics positions
        d.vy += gravity * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.angle += d.vAngle * dt;

        // Wrap debris horizontally at 4000
        d.x = (d.x % 4000 + 4000) % 4000;

        // Draw primary segment in world space (zoomed)
        worldGraphics.lineStyle(2, 0xffffff, 1.0);

        const rad = (d.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const x1 = d.x + d.lx1 * cos - d.ly1 * sin;
        const y1 = d.y + d.lx1 * sin + d.ly1 * cos;
        const x2 = d.x + d.lx2 * cos - d.ly2 * sin;
        const y2 = d.y + d.lx2 * sin + d.ly2 * cos;

        worldGraphics.lineBetween(x1, y1, x2, y2);

        // Double-draw debris if near horizontal wrapping borders
        if (d.x < 1600) {
            worldGraphics.lineBetween(x1 + 4000, y1, x2 + 4000, y2);
        } else if (d.x > 2400) {
            worldGraphics.lineBetween(x1 - 4000, y1, x2 - 4000, y2);
        }
    });
}
```

- [ ] **Step 5: Render lander trails in screen space in update**

Replace the lander trail drawing in `update()` in [game.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/game.js) to draw unzoomed paths on `this.hudTrailGraphics`:
```javascript
            // Draw lander trails in screen coordinates
            this.hudTrailGraphics.clear();
            const cam = this.cameras.main;
            landerTrail.forEach((t, i) => {
                const alpha = 0.1 * (i + 1);
                
                const cameraCenter = cam.scrollX + 400;
                let deltaX = t.x - cameraCenter;
                deltaX = ((deltaX + 2000) % 4000 + 4000) % 4000 - 2000;
                
                const screenX = 400 + deltaX * cam.zoom;
                const screenY = 300 + (t.y - 300) * cam.zoom;
                
                drawVectorLander(this.hudTrailGraphics, screenX, screenY, t.angle, t.thrust, alpha);
            });
```
*(Also clean up/remove the old duplicate trail rendering inside `STATE_PLAYING` and `STATE_SUCCESS` segments).*

- [ ] **Step 6: Update debris update call**

Modify the `updateAndDrawDebris` call inside [game.js](file:///Users/jrussell/code/jrussellsmyth.github.io/lunar-lander/game.js):
```javascript
          updateAndDrawDebris(graphics, this.hudTrailGraphics, dt, this.cameras.main);
```

- [ ] **Step 7: Run tests to verify passing**

Run:
```bash
node lunar-lander/test.js
```
Expected: PASS (All tests pass successfully)

- [ ] **Step 8: Commit**

```bash
git add lunar-lander/game.js lunar-lander/test.js
git commit -m "feat: implement screen-space unzoomed phosphor trails for ship and debris"
```
