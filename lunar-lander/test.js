const assert = require('assert');
const Core = require('./lander-core.js');

console.log("Running Core logic tests...");

// Test landing rules
try {
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

  console.log("ALL TESTS PASSED!");
} catch (err) {
  console.error("TEST FAILED:", err);
  process.exit(1);
}
