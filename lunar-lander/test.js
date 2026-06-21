const assert = require('assert');
const Core = require('./lander-core.js');

console.log("Running Core logic tests...");

// Test landing rules
try {
  // VectorFont checks (Task 1 verification)
  console.log("Running VectorFont checks...");
  const VectorFont = require('./vector-font.js');
  assert.strictEqual(typeof VectorFont, 'object', "VectorFont should be exported as an object");
  assert.strictEqual(typeof VectorFont.drawText, 'function', "VectorFont.drawText should be a function");
  assert.strictEqual(typeof VectorFont.getTextWidth, 'function', "VectorFont.getTextWidth should be a function");
  
  // Test width calculations
  assert.strictEqual(VectorFont.getTextWidth("HELLO", 12), 60);
  assert.strictEqual(VectorFont.getTextWidth("A", 6), 6);
  assert.strictEqual(VectorFont.getTextWidth("", 6), 0);
  
  // Test glyph existence
  const testChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-/ ←→↑↓";
  for (let char of testChars) {
    assert.ok(VectorFont.glyphs[char], `Glyph for '${char}' should exist`);
  }

  assert.strictEqual(typeof Core.checkLandingCondition, 'function');
  assert.strictEqual(typeof Core.updatePhysicsState, 'function');
  assert.strictEqual(typeof Core.calculateLandingMultiplier, 'function');

  const perfectLanding = Core.checkLandingCondition(5, 10, 2);
  assert.deepStrictEqual(perfectLanding, { success: true, reason: null, quality: "good", message: "SAFE TOUCHDOWN.", fuelPenalty: 0, scoreBonus: 0 });

  const tooFastVertically = Core.checkLandingCondition(5, 35, 2);
  assert.deepStrictEqual(tooFastVertically, { success: false, reason: "speed", quality: "crash" });

  const tooCrooked = Core.checkLandingCondition(5, 10, 15);
  assert.deepStrictEqual(tooCrooked, { success: false, reason: "angle", quality: "crash" });

  // Test physics update
  const initialState = { x: 100, y: 100, vx: 10, vy: 0, angle: 0, fuel: 100, thrust: 0.2 };
  const nextState = Core.updatePhysicsState(initialState, 0.1); // 0.1s update
  // Lander points up (0 rad). Thrust moves it upwards (against gravity).
  // gravity is ~1.62 m/s^2 (scaled to pixels). Let's assert state changes.
  assert.ok(nextState.y > initialState.y); // gravity pulls it down if gravity > thrust
  assert.ok(nextState.fuel < initialState.fuel);

  // Test multiplier calculations
  assert.strictEqual(Core.calculateLandingMultiplier(20), 10); // Narrow pad
  assert.strictEqual(Core.calculateLandingMultiplier(140), 2);  // Wide pad

  // Test HTML and CSS setup (Task 2 verification)
  console.log("Running HTML/CSS structure checks...");
  const fs = require('fs');
  const path = require('path');

  const htmlPath = path.join(__dirname, 'index.html');
  const cssPath = path.join(__dirname, 'style.css');

  assert.ok(fs.existsSync(htmlPath), "index.html should exist");
  assert.ok(fs.existsSync(cssPath), "style.css should exist");

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Check key structure in index.html
  assert.ok(htmlContent.includes('id="game-wrapper"'), "HTML must contain game-wrapper id");
  assert.ok(htmlContent.includes('id="game-container"'), "HTML must contain game-container id");
  assert.ok(htmlContent.includes('class="gutter left-gutter"'), "HTML must contain left gutter class");
  assert.ok(htmlContent.includes('class="gutter right-gutter"'), "HTML must contain right gutter class");
  assert.ok(htmlContent.includes('href="style.css"'), "HTML must link to style.css");
  assert.ok(htmlContent.includes('src="lander-core.js"'), "HTML must reference lander-core.js");

  // Check CRT glow style rules in style.css
  assert.ok(cssContent.includes('#game-wrapper'), "CSS must define #game-wrapper");
  assert.ok(cssContent.includes('#game-container'), "CSS must define #game-container");
  assert.ok(cssContent.includes('.gutter'), "CSS must define .gutter class");
  assert.ok(cssContent.includes('drop-shadow'), "CSS must define drop-shadow for CRT glow");
  assert.ok(cssContent.includes('linear-gradient'), "CSS must define linear-gradient for scanlines");
  assert.ok(cssContent.includes('radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)'), "CSS must define radial-gradient vignette overlay");
  assert.ok(cssContent.includes('filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9))'), "CSS must define white vector glow drop-shadow");

  // Terrain generator tests
  console.log("Running Terrain generator tests...");
  const width = 800;
  const height = 600;
  const terrain = Core.generateTerrain(width, height, 8, 1.0);

  // Assert we got valid coordinates
  assert.ok(terrain.points.length > 50);
  assert.strictEqual(terrain.points[0].x, 0);
  assert.strictEqual(terrain.points[terrain.points.length - 1].x, width);

  // Assert landing pads exist
  assert.ok(terrain.landingPads.length >= 2);
  terrain.landingPads.forEach(pad => {
    assert.ok(pad.x1 < pad.x2);
    assert.strictEqual(pad.multiplier >= 2, true);
    // Find matching flat stretch in terrain points
    const padPoints = terrain.points.filter(p => p.x >= pad.x1 && p.x <= pad.x2);
    assert.ok(padPoints.length >= 2);
    // Verify flatness
    const yVal = padPoints[0].y;
    padPoints.forEach(p => assert.strictEqual(p.y, yVal));
  });

  // Phaser Vector Rendering Engine checks (Task 4 verification)
  console.log("Running Phaser Vector Rendering Engine checks...");
  assert.ok(fs.existsSync(path.join(__dirname, 'game.js')), "game.js should exist");
  const gamePathForV = path.join(__dirname, 'game.js');
  const gameContentForTask3 = fs.readFileSync(gamePathForV, 'utf8');
  assert.ok(gameContentForTask3.includes('landerGraphicsWrap.clear()'), "game.js must clear wrapping lander graphics");
  const updateIndex = gameContentForTask3.indexOf('function update(');
  let successIndex = -1;
  let searchPos = updateIndex;
  while (true) {
    const idx = gameContentForTask3.indexOf('gameState === STATE_SUCCESS', searchPos);
    if (idx === -1) break;
    const block = gameContentForTask3.slice(idx, idx + 2500);
    if (block.includes('landerGraphicsWrap.clear()')) {
      successIndex = idx;
      break;
    }
    searchPos = idx + 1;
  }
  assert.ok(successIndex !== -1, "game.js must define STATE_SUCCESS handling");
  const successBlock = gameContentForTask3.slice(successIndex, successIndex + 2500);
  assert.ok(successBlock.includes('landerGraphicsWrap.clear()'), "game.js must clear wrapping lander graphic in success state");
  assert.ok(successBlock.includes('landerState.x < 1600'), "game.js must double-draw near left edge in success state");
  assert.ok(successBlock.includes('landerState.x > 2400'), "game.js must double-draw near right edge in success state");

  // Web Audio Synth checks (Task 5 verification)
  console.log("Running Web Audio Synth checks...");
  const gamePath = path.join(__dirname, 'game.js');
  const gameContent = fs.readFileSync(gamePath, 'utf8');

  // Verify class SynthEngine is defined and instantiated
  assert.ok(gameContent.includes('class SynthEngine'), "game.js must define SynthEngine class");
  
  const expectedMethods = [
    'init()',
    'setThrust(',
    'playThrust(',
    'playLowFuelAlarm()',
    'playExplosion',
    'playSuccess',
    'startWarningAlarm()',
    'stopWarningAlarm()'
  ];
  
  expectedMethods.forEach(method => {
    assert.ok(gameContent.includes(method), `SynthEngine must define ${method}`);
  });

  assert.ok(
    gameContent.includes('const audio = new SynthEngine(') || 
    gameContent.includes('let audio = new SynthEngine(') || 
    gameContent.match(/(const|let|var)\s+audio\s*=\s*new\s+SynthEngine\(/),
    "game.js must instantiate SynthEngine as audio"
  );

  // Custom Inputs & Mirrored Mobile Gutters checks (Task 6 verification)
  console.log("Running Custom Inputs & Mirrored Mobile Gutters checks...");
  assert.ok(htmlContent.includes('id="thrust-left"'), "HTML must contain thrust-left input");
  assert.ok(htmlContent.includes('id="thrust-right"'), "HTML must contain thrust-right input");
  assert.ok(htmlContent.includes('id="steer-left"'), "HTML must contain steer-left input");
  assert.ok(htmlContent.includes('id="steer-right"'), "HTML must contain steer-right input");

  // Assert default/min/max attributes
  assert.ok(htmlContent.match(/id="thrust-left"[^>]*min="0"[^>]*max="100"[^>]*value="0"/), "thrust-left must have min=0, max=100, value=0");
  assert.ok(htmlContent.match(/id="thrust-right"[^>]*min="0"[^>]*max="100"[^>]*value="0"/), "thrust-right must have min=0, max=100, value=0");
  assert.ok(htmlContent.match(/id="steer-left"[^>]*min="-45"[^>]*max="45"[^>]*value="0"/), "steer-left must have min=-45, max=45, value=0");
  assert.ok(htmlContent.match(/id="steer-right"[^>]*min="-45"[^>]*max="45"[^>]*value="0"/), "steer-right must have min=-45, max=45, value=0");

  // Verify game.js contains wheel listener and slider sync/snapping logic
  assert.ok(gameContent.includes("this.input.on('wheel'"), "game.js must listen to wheel events");
  assert.ok(gameContent.includes("thrust-left"), "game.js must reference thrust-left slider");
  assert.ok(gameContent.includes("thrust-right"), "game.js must reference thrust-right slider");
  assert.ok(gameContent.includes("steer-left"), "game.js must reference steer-left slider");
  assert.ok(gameContent.includes("steer-right"), "game.js must reference steer-right slider");
  assert.ok(gameContent.includes("targetSteerAngle"), "game.js must use targetSteerAngle for smooth rotation");

  // Test collision detection logic
  console.log("Running Collision Detection tests...");
  assert.strictEqual(typeof Core.getTerrainHeight, 'function');
  assert.strictEqual(typeof Core.checkCollision, 'function');

  const mockTerrain = {
    points: [
      { x: 0, y: 500 },
      { x: 400, y: 400 },
      { x: 800, y: 500 }
    ],
    landingPads: [
      { x1: 300, x2: 500, y: 400, multiplier: 5 }
    ]
  };

  // Check terrain height calculations
  assert.strictEqual(Core.getTerrainHeight(mockTerrain, 0), 500);
  assert.strictEqual(Core.getTerrainHeight(mockTerrain, 200), 450);
  assert.strictEqual(Core.getTerrainHeight(mockTerrain, 400), 400);
  assert.strictEqual(Core.getTerrainHeight(mockTerrain, 600), 450);
  assert.strictEqual(Core.getTerrainHeight(mockTerrain, 800), 500);

  // Check collision results
  // Lander safe in air
  const airState = { x: 400, y: 100, vx: 0, vy: 10, angle: 0 };
  assert.deepStrictEqual(Core.checkCollision(airState, mockTerrain), { collided: false });

  // Lander colliding with terrain (left foot)
  const crashLeftState = { x: 384, y: 390, vx: 0, vy: 10, angle: 0 }; // left foot local lx=-16, ly=15 -> rx=368, ry=405. Terrain at 368 is 500 - 0.25*100 = 408 (Wait, 368/400 = 0.92, so 500 - 0.92 * 100 = 408). Wait, ry = 405 is less than terrainY = 408.
  // Wait, let's make sure the coordinate check is simple. If we put it at y: 395, left foot is at ry = 410, terrain at 384 is 404 (384/400 = 0.96, so 500 - 0.96 * 100 = 404). ry=410 > terrainY=404 -> collided.
  const crashState = { x: 400, y: 395, vx: 0, vy: 10, angle: 0 }; // feet are at y+15 = 410, terrain is at 400
  const collisionResult = Core.checkCollision(crashState, mockTerrain);
  assert.strictEqual(collisionResult.collided, true);
  assert.ok(collisionResult.collisionY >= 400);

  // Lander wraps around bounds horizontally (should not be collided at y: 100 in the air)
  const oobState = { x: -10, y: 100, vx: 0, vy: 10, angle: 0 };
  assert.strictEqual(Core.checkCollision(oobState, mockTerrain).collided, false);

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

  // Camera scroll tracking and wrapping simulation tests
  console.log("Running Camera scroll tracking & wrapping tests...");
  function simulateCameraScroll(landerX, currentScrollX, currentZoom = 1.0, worldWidth = 4000) {
    const W_world = 800 / currentZoom;
    const M_world = 120 / currentZoom;
    
    let screenX_world = landerX - currentScrollX;
    // Wrap screenX_world to [-worldWidth/2, worldWidth/2]
    const halfWidth = worldWidth / 2;
    screenX_world = ((screenX_world + halfWidth) % worldWidth + worldWidth) % worldWidth - halfWidth;
    
    let newScrollX = currentScrollX;
    if (screenX_world > W_world - M_world) {
        newScrollX = landerX - (W_world - M_world);
    } else if (screenX_world < M_world) {
        newScrollX = landerX - M_world;
    }
    
    let sX = newScrollX % worldWidth;
    if (sX < 0) sX += worldWidth;
    return sX;
  }

  // Test cases:
  // 1. Initial state (Lander at 400, Camera at 0) - should not scroll because 400 is between 120 and 680.
  assert.strictEqual(simulateCameraScroll(400, 0), 0);

  // 2. Lander moves past right margin (e.g. to 700, Camera at 0) - camera should scroll right.
  // Right margin is 800 - 120 = 680.
  // New scroll should be landerX - (W_world - M_world) = 700 - 680 = 20.
  assert.strictEqual(simulateCameraScroll(700, 0), 20);

  // 3. Lander moves past left margin (e.g. to 100, Camera at 20) - camera should scroll left.
  // Left margin is 120. Screen position is 100 - 20 = 80 < 120.
  // New scroll should be landerX - M_world = 100 - 120 = -20 (wraps to 3980).
  assert.strictEqual(simulateCameraScroll(100, 20), 3980);

  // 4. Wrap crossing: Lander at 10 (wrapped), Camera at 3330.
  // screenX_world = 10 - 3330 = -3320. Wrapped: (( -3320 + 2000 ) % 4000 ) = -1320 + 4000 - 2000 = 680.
  // This is exactly on the right margin. Let's move Lander to 20 (wrapped).
  // screenX_world = 20 - 3330 = -3310 -> wrapped to 690 > 680 (right margin).
  // New scroll = 20 - 680 = -660 -> wraps to 3340.
  assert.strictEqual(simulateCameraScroll(20, 3330), 3340);

  // 5. Wrap crossing: Lander moving right past wrap boundary. Lander at 100 (wrapped), Camera at 3330.
  // Screen relative position should be 100 - (3330 - 4000) = 770 > 680 (right margin).
  // New scroll = 100 - 680 = -580 -> wraps to 3420.
  assert.strictEqual(simulateCameraScroll(100, 3330), 3420);

  // 6. Wrap crossing: Lander moving left past wrap boundary. Lander at 3900, Camera at 50.
  // screenX_world = 3900 - 50 = 3850 -> wrapped to -150 < 120 (left margin).
  // New scroll = 3900 - 120 = 3780.
  assert.strictEqual(simulateCameraScroll(3900, 50), 3780);

  // Camera dynamic zoom checks (Task 4 verification)
  console.log("Running Camera dynamic zoom checks...");
  assert.ok(gameContent.includes('getTerrainHeight(terrain, landerState.x)'), "game.js must get terrain height directly below lander");
  assert.ok(gameContent.includes('targetZoom = (altitude < 200) ? 1.0 : 0.5') || gameContent.includes('targetZoom = altitude < 200 ? 1.0 : 0.5'), "game.js must determine target zoom based on altitude");
  assert.ok(gameContent.includes('cam.zoom += (targetZoom - cam.zoom) * (1 - Math.exp(-8 * dt))') || gameContent.includes('cam.zoom += (targetZoom - cam.zoom) * (1 - Math.exp(-8 * dt))'), "game.js must LERP/interpolate camera zoom");
  assert.ok(gameContent.includes('sX - (400 - 400 / currentZoom)') || gameContent.includes('sX - (400 - 400 / cam.zoom)'), "game.js must adjust camera scroll centered relative to zoom");

  // Camera Separation checks (Task 2 verification)
  console.log("Running HUD Camera separation checks...");
  assert.ok(gameContent.includes('this.hudCamera = this.cameras.add('), "game.js must add HUD camera");
  assert.ok(gameContent.includes('this.hudCamera.setScroll(0, 0)'), "game.js must set HUD camera scroll");
  assert.ok(gameContent.includes('this.cameras.main.ignore('), "game.js main camera must ignore HUD elements");
  assert.ok(gameContent.includes('this.hudCamera.ignore('), "game.js HUD camera must ignore game world graphics elements");
  assert.ok(gameContent.includes('activeScene.hudCamera.ignore(txt)'), "game.js must ignore pad multiplier labels on HUD camera");

  // Verify generateTerrain dynamic multipliers math
  const testTerrain = Core.generateTerrain(4000, 600, 12, 1.0);
  assert.strictEqual(testTerrain.landingPads[0].multiplier, Core.calculateLandingMultiplier(250));
  assert.strictEqual(testTerrain.landingPads[1].multiplier, Core.calculateLandingMultiplier(120));
  assert.strictEqual(testTerrain.landingPads[2].multiplier, Core.calculateLandingMultiplier(70));

  // Verify VectorFont HUD layout strings and graphics checks (Task 4)
  console.log("Running VectorFont HUD layout checks...");
  assert.ok(gameContent.includes('SCORE:'), "game.js must draw SCORE HUD string");
  assert.ok(gameContent.includes('TIME :'), "game.js must draw TIME HUD string");
  assert.ok(gameContent.includes('FUEL :'), "game.js must draw FUEL HUD string");
  assert.ok(gameContent.includes('ALTITUDE :'), "game.js must draw ALTITUDE HUD string");
  assert.ok(gameContent.includes('HORIZONTAL SPEED:'), "game.js must draw HORIZONTAL SPEED HUD string");
  assert.ok(gameContent.includes('VERTICAL SPEED:'), "game.js must draw VERTICAL SPEED HUD string");

  assert.ok(gameContent.includes('worldTextGraphics = this.add.graphics();'), "game.js must initialize worldTextGraphics");
  assert.ok(gameContent.includes('hudTextGraphics = this.add.graphics();'), "game.js must initialize hudTextGraphics");
  assert.ok(gameContent.includes('worldTextGraphics.clear()'), "game.js must clear worldTextGraphics");
  assert.ok(gameContent.includes('hudTextGraphics.clear()'), "game.js must clear hudTextGraphics");

  // Phosphor Trails & Decay Motion checks (Task 5 verification)
  console.log("Running Phosphor Trails & Decay Motion checks...");
  assert.ok(
    gameContent.includes('let landerTrail') || 
    gameContent.includes('var landerTrail') ||
    gameContent.match(/(let|var|const)\s+landerTrail\s*=\s*\[\]/),
    "game.js must define landerTrail variable"
  );
  assert.ok(
    gameContent.includes('history:') && gameContent.includes('debris.push('),
    "game.js must push debris items with a history attribute"
  );

  console.log("ALL TESTS PASSED!");
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exit(1);
}

