const assert = require('assert');
const Core = require('./lander-core.js');

console.log("Running Core logic tests...");

// Test landing rules
try {
  assert.strictEqual(typeof Core.checkLandingCondition, 'function');
  assert.strictEqual(typeof Core.updatePhysicsState, 'function');
  assert.strictEqual(typeof Core.calculateLandingMultiplier, 'function');

  const perfectLanding = Core.checkLandingCondition(5, 10, 2);
  assert.deepStrictEqual(perfectLanding, { success: true, reason: null });

  const tooFastVertically = Core.checkLandingCondition(5, 35, 2);
  assert.deepStrictEqual(tooFastVertically, { success: false, reason: "speed" });

  const tooCrooked = Core.checkLandingCondition(5, 10, 15);
  assert.deepStrictEqual(tooCrooked, { success: false, reason: "angle" });

  // Test physics update
  const initialState = { x: 100, y: 100, vx: 10, vy: 0, angle: 0, fuel: 100, thrust: 0.2 };
  const nextState = Core.updatePhysicsState(initialState, 0.1); // 0.1s update
  // Lander points up (0 rad). Thrust moves it upwards (against gravity).
  // gravity is ~1.62 m/s^2 (scaled to pixels). Let's assert state changes.
  assert.ok(nextState.y > initialState.y); // gravity pulls it down if gravity > thrust
  assert.ok(nextState.fuel < initialState.fuel);

  // Test multiplier calculations
  assert.strictEqual(Core.calculateLandingMultiplier(20), 10); // Narrow pad
  assert.strictEqual(Core.calculateLandingMultiplier(80), 2);  // Wide pad

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
    'playExplosion()',
    'playSuccess()',
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

  console.log("ALL TESTS PASSED!");
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exit(1);
}

