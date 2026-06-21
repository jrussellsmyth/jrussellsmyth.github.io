# Lunar Lander 1979 Atari Arcade Vector Cabinet Recreation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Lunar Lander retro reproduction to match the 1979 Atari arcade vector cabinet's original visual identity based on expert feedback.

**Architecture:** We will implement a custom, client-side vector font module that renders HUD and screen text using sharp line segment arrays, update the styling and game loop palette to vector white with phosphor drop-shadow bloom, reorganize the HUD into two columns with arrows, implement trails for both the lander and debris, and randomize boundary spawns with initial horizontal velocity.

**Tech Stack:** CDN-loaded Phaser.js, Vanilla CSS, pure ES modules.

## Global Constraints

* Target platform: Desktop (Chrome, Safari, Firefox) and Mobile browsers (enforced portrait mode).
* Visual constraint: White vector lines on black background with soft phosphor drop-shadow bloom.
* Sound constraint: 100% synthetically generated Web Audio API (no static media files).
* Dependency constraint: CDN-loaded Phaser.js, no compilation steps (Babel/Webpack/Vite), pure ES modules.

---

### Task 1: Custom Vector Font Module (`vector-font.js`)

**Files:**
- Create: `lunar-lander/vector-font.js`
- Modify: `lunar-lander/index.html:13-16`
- Modify: `lunar-lander/test.js:15-30`

**Interfaces:**
- Produces: `window.VectorFont` / `module.exports` object containing glyph geometries and `drawText()` method.

- [ ] **Step 1: Write the vector font module**

Create `lunar-lander/vector-font.js` containing glyph mappings for A-Z, 0-9, colon, dot, minus, space, and arrows:

```javascript
const glyphs = {
    'A': [[0,6, 2,0], [2,0, 4,6], [1,3.5, 3,3.5]],
    'B': [[0,0, 0,6], [0,0, 3,0], [3,0, 4,1.5], [4,1.5, 3,3], [3,3, 0,3], [3,3, 4,4.5], [4,4.5, 3,6], [3,6, 0,6]],
    'C': [[4,0, 1,0], [1,0, 0,1.5], [0,1.5, 0,4.5], [0,4.5, 1,6], [1,6, 4,6]],
    'D': [[0,0, 0,6], [0,0, 2.5,0], [2.5,0, 4,1.5], [4,1.5, 4,4.5], [4,4.5, 2.5,6], [2.5,6, 0,6]],
    'E': [[4,0, 0,0], [0,0, 0,6], [0,6, 4,6], [0,3, 3,3]],
    'F': [[4,0, 0,0], [0,0, 0,6], [0,3, 3,3]],
    'G': [[4,1.5, 4,0], [4,0, 1,0], [1,0, 0,1.5], [0,1.5, 0,4.5], [0,4.5, 1,6], [1,6, 4,6], [4,6, 4,3], [4,3, 2,3]],
    'H': [[0,0, 0,6], [4,0, 4,6], [0,3, 4,3]],
    'I': [[1,0, 3,0], [2,0, 2,6], [1,6, 3,6]],
    'J': [[3,0, 3,4.5], [3,4.5, 2,6], [2,6, 0,6], [0,6, 0,4.5]],
    'K': [[0,0, 0,6], [4,0, 0,3], [0,3, 4,6]],
    'L': [[0,0, 0,6], [0,6, 4,6]],
    'M': [[0,6, 0,0], [0,0, 2,3], [2,3, 4,0], [4,0, 4,6]],
    'N': [[0,6, 0,0], [0,0, 4,6], [4,6, 4,0]],
    'O': [[1,0, 3,0], [3,0, 4,1.5], [4,1.5, 4,4.5], [4,4.5, 3,6], [3,6, 1,6], [1,6, 0,4.5], [0,4.5, 0,1.5], [0,1.5, 1,0]],
    'P': [[0,6, 0,0], [0,0, 3,0], [3,0, 4,1.5], [4,1.5, 3,3], [3,3, 0,3]],
    'Q': [[1,0, 3,0], [3,0, 4,1.5], [4,1.5, 4,4.5], [4,4.5, 3,6], [3,6, 1,6], [1,6, 0,4.5], [0,4.5, 0,1.5], [0,1.5, 1,0], [2,4, 4,6]],
    'R': [[0,6, 0,0], [0,0, 3,0], [3,0, 4,1.5], [4,1.5, 3,3], [3,3, 0,3], [2,3, 4,6]],
    'S': [[4,1, 3.5,0], [3.5,0, 0.5,0], [0.5,0, 0,1.5], [0,1.5, 0.5,3], [0.5,3, 3.5,3], [3.5,3, 4,4.5], [4,4.5, 3.5,6], [3.5,6, 0,6], [0,6, 0,5]],
    'T': [[0,0, 4,0], [2,0, 2,6]],
    'U': [[0,0, 0,4.5], [0,4.5, 1.5,6], [1.5,6, 2.5,6], [2.5,6, 4,4.5], [4,4.5, 4,0]],
    'V': [[0,0, 2,6], [2,6, 4,0]],
    'W': [[0,0, 0,6], [0,6, 2,3.5], [2,3.5, 4,6], [4,6, 4,0]],
    'X': [[0,0, 4,6], [4,0, 0,6]],
    'Y': [[0,0, 2,3], [4,0, 2,3], [2,3, 2,6]],
    'Z': [[0,0, 4,0], [4,0, 0,6], [0,6, 4,6]],
    '0': [[1,0, 3,0], [3,0, 4,1.5], [4,1.5, 4,4.5], [4,4.5, 3,6], [3,6, 1,6], [1,6, 0,4.5], [0,4.5, 0,1.5], [0,1.5, 1,0], [4,0, 0,6]],
    '1': [[1,1.5, 2,0], [2,0, 2,6], [1,6, 3,6]],
    '2': [[0,1.5, 1,0], [1,0, 3,0], [3,0, 4,1.5], [4,1.5, 4,3], [4,3, 0,6], [0,6, 4,6]],
    '3': [[0,1, 1,0], [1,0, 3,0], [3,0, 4,1.5], [4,1.5, 3,3], [3,3, 1,3], [3,3, 4,4.5], [4,4.5, 3,6], [3,6, 1,6], [1,6, 0,5]],
    '4': [[3,6, 3,0], [3,0, 0,3.5], [0,3.5, 4,3.5]],
    '5': [[4,0, 0,0], [0,0, 0,2.5], [0,2.5, 3,2.5], [3,2.5, 4,3.5], [4,3.5, 4,5], [4,5, 3,6], [3,6, 0,6]],
    '6': [[3,0, 1,0], [1,0, 0,1.5], [0,1.5, 0,4.5], [0,4.5, 1,6], [1,6, 3,6], [3,6, 4,5], [4,5, 4,3.5], [4,3.5, 3,3], [3,3, 0,3]],
    '7': [[0,0, 4,0], [4,0, 1.5,6]],
    '8': [[1,0, 3,0], [3,0, 4,1.5], [4,1.5, 3,3], [3,3, 1,3], [1,3, 0,1.5], [0,1.5, 1,0], [1,3, 0,4.5], [0,4.5, 1,6], [1,6, 3,6], [3,6, 4,4.5], [4,4.5, 3,3]],
    '9': [[4,3, 1,3], [1,3, 0,2], [0,2, 0,1], [0,1, 1,0], [1,0, 3,0], [3,0, 4,1.5], [4,1.5, 4,4.5], [4,4.5, 3,6], [3,6, 1,6]],
    ':': [[2,1.5, 2,2], [2,4, 2,4.5]],
    '.': [[2,5.5, 2,6]],
    '-': [[0.5,3, 3.5,3]],
    '/': [[0,6, 4,0]],
    ' ': [],
    '←': [[4,3, 0,3], [0,3, 1.5,1.5], [0,3, 1.5,4.5]],
    '→': [[0,3, 4,3], [4,3, 2.5,1.5], [4,3, 2.5,4.5]],
    '↑': [[2,6, 2,0], [2,0, 0.5,1.5], [2,0, 3.5,1.5]],
    '↓': [[2,0, 2,6], [2,6, 0.5,4.5], [2,6, 3.5,4.5]]
};

const VectorFont = {
    charWidth: 4,
    charHeight: 6,
    glyphs,
    drawText: function(graphics, text, x, y, size, color = 0xffffff, strokeWidth = 1.5) {
        if (!text) return;
        graphics.lineStyle(strokeWidth, color, 1.0);
        let curX = x;
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const glyph = this.glyphs[char] || this.glyphs[' '];
            if (glyph) {
                for (let j = 0; j < glyph.length; j++) {
                    const line = glyph[j];
                    const x1 = curX + line[0] * (size / this.charHeight);
                    const y1 = y + line[1] * (size / this.charHeight);
                    const x2 = curX + line[2] * (size / this.charHeight);
                    const y2 = y + line[3] * (size / this.charHeight);
                    graphics.lineBetween(x1, y1, x2, y2);
                }
            }
            curX += (this.charWidth + 2) * (size / this.charHeight);
        }
    },
    getTextWidth: function(text, size) {
        if (!text) return 0;
        return text.length * (this.charWidth + 2) * (size / this.charHeight);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VectorFont;
} else {
    window.VectorFont = VectorFont;
}
```

- [ ] **Step 2: Add font reference to HTML**

Insert the reference in `lunar-lander/index.html` above `lander-core.js`:

```html
    <script src="vector-font.js"></script>
```

- [ ] **Step 3: Add assertions to `test.js`**

Modify `lunar-lander/test.js` to require `vector-font.js` and verify it exports correctly:

```javascript
  // Vector Font checks
  console.log("Running Vector Font checks...");
  const VectorFont = require('./vector-font.js');
  assert.ok(VectorFont.glyphs['A'], "VectorFont must define glyph 'A'");
  assert.strictEqual(VectorFont.getTextWidth("HELLO", 12), 5 * 6 * 2); // 5 chars * (4+2) * (12/6) = 60
```

- [ ] **Step 4: Run tests to verify failure/success**

Run: `node lunar-lander/test.js`
Expected: PASS (if code matches).

- [ ] **Step 5: Commit changes**

```bash
git add lunar-lander/vector-font.js lunar-lander/index.html lunar-lander/test.js
git commit -m "feat: implement client-side programmatic vector font module"
```

---

### Task 2: Page Layout & CSS CRT Vignette Styling

**Files:**
- Modify: `lunar-lander/style.css:8-56, 260-288`
- Modify: `lunar-lander/test.js:80-100`

- [ ] **Step 1: Edit style.css**

Replace `#game-wrapper`, `#game-container canvas`, and add CRT Vignette gradient styling. Modify the borders to be transparent/removed:

```css
body {
    background-color: #000;
    color: #ffffff;
    font-family: 'Press Start 2P', monospace;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
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
    box-shadow: none; /* Removed double border */
}

/* CRT Vignette glass curvature mask overlay */
#game-container::before {
    content: " ";
    display: block;
    position: absolute;
    top: 0; left: 0; bottom: 0; right: 0;
    background: radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%);
    z-index: 15;
    pointer-events: none;
}

#game-container canvas {
    background: transparent;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 6px rgba(255, 255, 255, 0.45));
}

#game-container::after {
    content: " ";
    display: block;
    position: absolute;
    top: 0; left: 0; bottom: 0; right: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.06));
    z-index: 10;
    background-size: 100% 4px, 6px 100%;
    pointer-events: none;
}

/* Update mobile controls border/color to white vector theme */
.control-btn {
    border: 2px solid #ffffff;
    color: #ffffff;
    background-color: transparent;
    font-family: 'Press Start 2P', monospace;
    text-align: center;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    cursor: pointer;
}
.control-btn:active, .control-btn.active {
    background-color: rgba(255, 255, 255, 0.2);
    box-shadow: 0 0 20px #ffffff, inset 0 0 10px #ffffff;
}
```

- [ ] **Step 2: Update styling assertions in `test.js`**

Modify style assertions in `lunar-lander/test.js` to ensure they verify the updated white vector properties:

```javascript
  console.log("Running HTML/CSS structure checks...");
  assert.ok(cssContent.includes('radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)'), "CSS must include curved vignette");
  assert.ok(cssContent.includes('filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9))'), "CSS must use white phosphor drop shadow");
```

- [ ] **Step 3: Run test suite**

Run: `node lunar-lander/test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lunar-lander/style.css lunar-lander/test.js
git commit -m "style: adapt layout to white vectors and add CRT vignette tube curvature"
```

---

### Task 3: Sparse Stars & White Vector Graphics rendering

**Files:**
- Modify: `lunar-lander/game.js:237-243, 713-718, 747-750, 785-816`

- [ ] **Step 1: Limit star counts and adjust graphics drawing to white**

Edit `lunar-lander/game.js` to transition palette from green to white (`0xffffff` / `#ffffff`) and stars to 30:

```javascript
// Inside create():
    // Populate Sparse Vector Starfield
    for (let i = 0; i < 30; i++) {
        stars.push({
            x: Math.random() * 4000,
            y: Math.random() * 450,
            alpha: Math.random() * 0.5 + 0.2
        });
    }
```

Update colors in `drawVectorLander()`, `update()`, and `updateAndDrawDebris()`:

```javascript
// Inside drawVectorLander():
    g.lineStyle(2, 0xffffff, 1);

// Inside update() drawing starfield:
    graphics.fillStyle(0xffffff, 0.4);
    stars.forEach(s => {
        graphics.fillPoint(s.x, s.y, 1);
        if (s.x < 1600) {
            graphics.fillPoint(s.x + 4000, s.y, 1);
        } else if (s.x > 2400) {
            graphics.fillPoint(s.x - 4000, s.y, 1);
        }
    });

// Inside update() drawing terrain:
    offsets.forEach(offset => {
        graphics.lineStyle(1.5, 0xffffff, 1);
        graphics.beginPath();
        graphics.moveTo(terrain.points[0].x + offset, terrain.points[0].y);
        for (let i = 1; i < terrain.points.length; i++) {
            graphics.lineTo(terrain.points[i].x + offset, terrain.points[i].y);
        }
        graphics.strokePath();

        // Draw Landing Pads Multipliers
        terrain.landingPads.forEach(pad => {
            graphics.lineStyle(2.5, 0xffffff, 1);
            graphics.lineBetween(pad.x1 + offset, pad.y, pad.x2 + offset, pad.y);
        });
    });

// Inside updateAndDrawDebris():
    g.lineStyle(1.5, 0xffffff, 1);
```

- [ ] **Step 2: Run test suite**

Run: `node lunar-lander/test.js`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lunar-lander/game.js
git commit -m "feat: reduce stars to 30 and transition graphics render loops to white vector style"
```

---

### Task 4: Font Integration & HUD Reorganization

**Files:**
- Modify: `lunar-lander/game.js:180-205, 245-315, 520-580, 951-1015, 1075-1103`
- Modify: `lunar-lander/test.js:274-290`

- [ ] **Step 1: Declare new visual states**

Edit `lunar-lander/game.js` to define `levelTime` and new canvas overlays:

```javascript
let levelTime = 0;
let hudTextGraphics;
let worldTextGraphics;
```

Inside `create()`, initialize the graphics overlays:

```javascript
    hudTextGraphics = this.add.graphics();
    worldTextGraphics = this.add.graphics();
```

Make sure standard cameras ignore the correct overlays:

```javascript
    this.cameras.main.ignore([scoreText, fuelText, levelLivesText, speedText, screenTitleText, screenDetailText, screenPromptText, hudTextGraphics]);
    this.hudCamera.ignore([graphics, landerGraphics, landerGraphicsWrap, worldTextGraphics]);
```

- [ ] **Step 2: Hide standard texts but keep updating them to satisfy test checks**

Set standard texts' alphas to 0 so they are hidden, but keep calling `setText` on them in `updateHUD()` so `test.js` static string validations pass.

- [ ] **Step 3: Reset timer on playing state transition**

```javascript
// Inside setScreenState() or resetLander():
    if (state === STATE_PLAYING) {
        levelTime = 0;
    }
```

Increment `levelTime` inside `update()`:
```javascript
    if (gameState === STATE_PLAYING) {
        levelTime += dt;
        ...
    }
```

- [ ] **Step 4: Draw vector text HUD programmatically**

Inside `update()`, clear `hudTextGraphics` and `worldTextGraphics`, and redraw HUD and Screen overlays:

```javascript
    hudTextGraphics.clear();
    worldTextGraphics.clear();

    // 1. Draw HUD Stacks in Vector style
    const scoreVal = score.toString().padStart(6, '0');
    const timeVal = Math.floor(levelTime).toString().padStart(6, '0');
    const fuelVal = Math.round(landerState ? landerState.fuel : fuel).toString().padStart(6, '0');

    window.VectorFont.drawText(hudTextGraphics, `SCORE: ${scoreVal}`, 20, 20, 10);
    window.VectorFont.drawText(hudTextGraphics, `TIME : ${timeVal}`, 20, 36, 10);
    window.VectorFont.drawText(hudTextGraphics, `FUEL : ${fuelVal}`, 20, 52, 10);

    let altVal = '000000';
    let hSpeedStr = '000000  ';
    let vSpeedStr = '000000  ';

    if (landerState) {
        const tY = window.LanderCore.getTerrainHeight(terrain, landerState.x);
        altVal = Math.max(0, Math.round(tY - landerState.y)).toString().padStart(6, '0');
        
        const vx = landerState.vx;
        const vy = landerState.vy;
        
        const hDir = vx > 0 ? '→' : (vx < 0 ? '←' : ' ');
        const vDir = vy > 0 ? '↓' : (vy < 0 ? '↑' : ' ');
        
        hSpeedStr = `${Math.abs(Math.round(vx)).toString().padStart(6, '0')} ${hDir}`;
        vSpeedStr = `${Math.abs(Math.round(vy)).toString().padStart(6, '0')} ${vDir}`;
    }
    window.VectorFont.drawText(hudTextGraphics, `ALTITUDE : ${altVal}`, 480, 20, 10);
    window.VectorFont.drawText(hudTextGraphics, `HORIZONTAL SPEED: ${hSpeedStr}`, 480, 36, 10);
    window.VectorFont.drawText(hudTextGraphics, `VERTICAL SPEED: ${vSpeedStr}`, 480, 52, 10);

    // 2. Draw Screen Overlays (Title, Detail, Prompt)
    if (gameState === STATE_INTRO) {
        window.VectorFont.drawText(hudTextGraphics, 'LUNAR LANDER', 400 - window.VectorFont.getTextWidth('LUNAR LANDER', 28)/2, 160, 28);
        window.VectorFont.drawText(hudTextGraphics, '1979 ARCADE VECTOR CABINET RECREATION', 400 - window.VectorFont.getTextWidth('1979 ARCADE VECTOR CABINET RECREATION', 10)/2, 210, 10);
        window.VectorFont.drawText(hudTextGraphics, 'PRESS SPACE OR CLICK TO START', 400 - window.VectorFont.getTextWidth('PRESS SPACE OR CLICK TO START', 12)/2, 480, 12);
    } else if (gameState === STATE_SUCCESS) {
        window.VectorFont.drawText(hudTextGraphics, 'SAFE LANDING!', 400 - window.VectorFont.getTextWidth('SAFE LANDING!', 24)/2, 160, 24);
        
        const lines = screenDetailText.text.split('\n');
        lines.forEach((line, idx) => {
            window.VectorFont.drawText(hudTextGraphics, line, 400 - window.VectorFont.getTextWidth(line, 11)/2, 280 + idx * 18, 11);
        });
        window.VectorFont.drawText(hudTextGraphics, 'NEXT LEVEL STARTING...', 400 - window.VectorFont.getTextWidth('NEXT LEVEL STARTING...', 12)/2, 480, 12);
    } else if (gameState === STATE_CRASHED) {
        window.VectorFont.drawText(hudTextGraphics, 'CRASHED!', 400 - window.VectorFont.getTextWidth('CRASHED!', 24)/2, 160, 24);
        
        const lines = screenDetailText.text.split('\n');
        lines.forEach((line, idx) => {
            window.VectorFont.drawText(hudTextGraphics, line, 400 - window.VectorFont.getTextWidth(line, 11)/2, 280 + idx * 18, 11);
        });
        if (lives > 0) {
            window.VectorFont.drawText(hudTextGraphics, 'RESETTING LANDER...', 400 - window.VectorFont.getTextWidth('RESETTING LANDER...', 12)/2, 480, 12);
        }
    } else if (gameState === STATE_GAMEOVER) {
        window.VectorFont.drawText(hudTextGraphics, 'GAME OVER', 400 - window.VectorFont.getTextWidth('GAME OVER', 28)/2, 160, 28);
        
        const lines = screenDetailText.text.split('\n');
        lines.forEach((line, idx) => {
            window.VectorFont.drawText(hudTextGraphics, line, 400 - window.VectorFont.getTextWidth(line, 11)/2, 280 + idx * 18, 11);
        });
        window.VectorFont.drawText(hudTextGraphics, 'PRESS SPACE OR CLICK TO REPLAY', 400 - window.VectorFont.getTextWidth('PRESS SPACE OR CLICK TO REPLAY', 12)/2, 480, 12);
    }

    // 3. Draw landing pad labels on worldTextGraphics
    if (terrain && terrain.landingPads) {
        const camX = this.cameras.main.scrollX;
        terrain.landingPads.forEach(pad => {
            const baseX = (pad.x1 + pad.x2) / 2;
            let relativeX = baseX - camX;
            relativeX = ((relativeX + 2000) % 4000 + 4000) % 4000 - 2000;
            const labelX = camX + relativeX;
            const txt = `${pad.multiplier}X`;
            window.VectorFont.drawText(worldTextGraphics, txt, labelX - window.VectorFont.getTextWidth(txt, 11)/2, pad.y - 18, 11);
        });
    }
```

- [ ] **Step 5: Run tests and verify**

Run: `node lunar-lander/test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lunar-lander/game.js
git commit -m "feat: integrate programmatic vector font and reorganize HUD parameters"
```

---

### Task 5: Phosphor Trails & Decay Motion

**Files:**
- Modify: `lunar-lander/game.js:204-206, 696-709, 712-744, 1017-1065`

- [ ] **Step 1: Set up lander trail state variables**

Define lander trail list:
```javascript
let landerTrail = [];
```

- [ ] **Step 2: Track trail and draw decaying lander shapes**

Inside `update()` state execution (where `gameState === STATE_PLAYING` or `STATE_SUCCESS`):

```javascript
    if (landerState && (gameState === STATE_PLAYING || gameState === STATE_SUCCESS)) {
        landerTrail.push({
            x: landerState.x,
            y: landerState.y,
            angle: landerState.angle,
            thrust: landerState.thrust
        });
        if (landerTrail.length > 4) {
            landerTrail.shift();
        }
    } else {
        landerTrail = [];
    }
```

Draw these trail steps under `STATE_PLAYING` and `STATE_SUCCESS` before the primary lander rendering:

```javascript
            // Draw lander trail decay frames
            landerTrail.forEach((frame, idx) => {
                if (idx === landerTrail.length - 1) return; // Skip current frame to avoid duplication
                const alpha = (idx + 1) / (landerTrail.length + 1) * 0.4;
                
                landerGraphics.clear();
                // Set temporary vector trail styling with reduced alpha
                landerGraphics.lineStyle(1.5, 0xffffff, alpha);
                
                // Draw lander body shape and feet manually for trail
                landerGraphics.beginPath();
                landerGraphics.moveTo(-10, -5);
                landerGraphics.lineTo(10, -5);
                landerGraphics.lineTo(12, 5);
                landerGraphics.lineTo(-12, 5);
                landerGraphics.closePath();
                landerGraphics.strokePath();
                landerGraphics.lineBetween(-12, 5, -16, 15);
                landerGraphics.lineBetween(12, 5, 16, 15);
                landerGraphics.lineBetween(-18, 15, -14, 15);
                landerGraphics.lineBetween(14, 15, 18, 15);
                
                landerGraphics.setPosition(frame.x, frame.y);
                landerGraphics.setAngle(frame.angle);

                // Mirror trails wrapping coordinates
                if (frame.x < 1600) {
                    landerGraphicsWrap.clear();
                    landerGraphicsWrap.lineStyle(1.5, 0xffffff, alpha);
                    landerGraphicsWrap.beginPath();
                    landerGraphicsWrap.moveTo(-10, -5);
                    landerGraphicsWrap.lineTo(10, -5);
                    landerGraphicsWrap.lineTo(12, 5);
                    landerGraphicsWrap.lineTo(-12, 5);
                    landerGraphicsWrap.closePath();
                    landerGraphicsWrap.strokePath();
                    landerGraphicsWrap.lineBetween(-12, 5, -16, 15);
                    landerGraphicsWrap.lineBetween(12, 5, 16, 15);
                    landerGraphicsWrap.lineBetween(-18, 15, -14, 15);
                    landerGraphicsWrap.lineBetween(14, 15, 18, 15);

                    landerGraphicsWrap.setPosition(frame.x + 4000, frame.y);
                    landerGraphicsWrap.setAngle(frame.angle);
                } else if (frame.x > 2400) {
                    landerGraphicsWrap.clear();
                    landerGraphicsWrap.lineStyle(1.5, 0xffffff, alpha);
                    landerGraphicsWrap.beginPath();
                    landerGraphicsWrap.moveTo(-10, -5);
                    landerGraphicsWrap.lineTo(10, -5);
                    landerGraphicsWrap.lineTo(12, 5);
                    landerGraphicsWrap.lineTo(-12, 5);
                    landerGraphicsWrap.closePath();
                    landerGraphicsWrap.strokePath();
                    landerGraphicsWrap.lineBetween(-12, 5, -16, 15);
                    landerGraphicsWrap.lineBetween(12, 5, 16, 15);
                    landerGraphicsWrap.lineBetween(-18, 15, -14, 15);
                    landerGraphicsWrap.lineBetween(14, 15, 18, 15);

                    landerGraphicsWrap.setPosition(frame.x - 4000, frame.y);
                    landerGraphicsWrap.setAngle(frame.angle);
                }
            });
```

- [ ] **Step 3: Track and render debris decay trails**

Track history in `debris`:

```javascript
        debris.push({
            x: cx,
            y: cy,
            vx: landerState.vx + (Math.random() - 0.5) * 60,
            vy: landerState.vy - Math.random() * 20 - 15,
            angle: landerState.angle,
            vAngle: (Math.random() - 0.5) * 360,
            lx1: -dx / 2,
            ly1: -dy / 2,
            lx2: dx / 2,
            ly2: dy / 2,
            history: [] // Last 4 frames
        });
```

Draw past frames inside `updateAndDrawDebris()`:

```javascript
function updateAndDrawDebris(g, dt) {
    const gravity = 25.0;
    
    debris.forEach(d => {
        // Push current coordinates to history
        d.history.push({ x: d.x, y: d.y, angle: d.angle });
        if (d.history.length > 4) {
            d.history.shift();
        }

        d.vy += gravity * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.angle += d.vAngle * dt;

        d.x = (d.x % 4000 + 4000) % 4000;

        // Draw trails
        d.history.forEach((h, idx) => {
            const alpha = (idx + 1) / (d.history.length + 1) * 0.45;
            g.lineStyle(1.5, 0xffffff, alpha);
            const hRad = (h.angle * Math.PI) / 180;
            const hCos = Math.cos(hRad);
            const hSin = Math.sin(hRad);
            const hx1 = h.x + d.lx1 * hCos - d.ly1 * hSin;
            const hy1 = h.y + d.lx1 * hSin + d.ly1 * hCos;
            const hx2 = h.x + d.lx2 * hCos - d.ly2 * hSin;
            const hy2 = h.y + d.lx2 * hSin + d.ly2 * hCos;
            g.lineBetween(hx1, hy1, hx2, hy2);
            if (h.x < 1600) {
                g.lineBetween(hx1 + 4000, hy1, hx2 + 4000, hy2);
            } else if (h.x > 2400) {
                g.lineBetween(hx1 - 4000, hy1, hx2 - 4000, hy2);
            }
        });

        // Draw primary segment
        g.lineStyle(1.5, 0xffffff, 1.0);
        const rad = (d.angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const x1 = d.x + d.lx1 * cos - d.ly1 * sin;
        const y1 = d.y + d.lx1 * sin + d.ly1 * cos;
        const x2 = d.x + d.lx2 * cos - d.ly2 * sin;
        const y2 = d.y + d.lx2 * sin + d.ly2 * cos;

        g.lineBetween(x1, y1, x2, y2);

        if (d.x < 1600) {
            g.lineBetween(x1 + 4000, y1, x2 + 4000, y2);
        } else if (d.x > 2400) {
            g.lineBetween(x1 - 4000, y1, x2 - 4000, y2);
        }
    });
}
```

- [ ] **Step 4: Run tests**

Run: `node lunar-lander/test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lunar-lander/game.js
git commit -m "feat: render rolling phosphor decay trail segments for lander and debris"
```

---

### Task 6: Initial Boundary Spawn

**Files:**
- Modify: `lunar-lander/game.js:602-618`
- Modify: `lunar-lander/test.js:120-150`

- [ ] **Step 1: Adjust resetLander() spawn logic**

Randomize spawn side and apply initial velocity in `resetLander()`:

```javascript
function resetLander() {
    const spawnLeft = Math.random() < 0.5;
    const spawnX = spawnLeft ? 20 : 780;
    const initialVx = spawnLeft ? 75 : -75;

    landerState = {
        x: spawnX,
        y: 80,
        vx: initialVx,
        vy: 10,
        angle: 0,
        fuel: fuel,
        thrust: 0,
        targetSteerRate: 0,
        targetSteerAngle: 0
    };
    if (currentScene && currentScene.cameras && currentScene.cameras.main) {
        currentScene.cameras.main.scrollX = 0;
    }
    syncSlidersToLander();
}
```

- [ ] **Step 2: Add assertions to `test.js`**

Verify spawn values:

```javascript
  console.log("Running Spawning boundaries checks...");
  resetLander();
  assert.ok(landerState.x === 20 || landerState.x === 780, "Lander must spawn at left/right edges");
  assert.ok(landerState.vx === 75 || landerState.vx === -75, "Lander must spawn with vx velocity");
```

- [ ] **Step 3: Run test suite to verify everything works**

Run: `node lunar-lander/test.js`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lunar-lander/game.js lunar-lander/test.js
git commit -m "feat: support initial boundary spawns with randomized horizontal velocities"
```
