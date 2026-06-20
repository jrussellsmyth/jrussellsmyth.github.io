const GRAVITY = 25.0; // Px/s^2
const THRUST_ACCEL = 60.0; // Max thrust accel px/s^2
const FUEL_BURN_RATE = 15.0; // Fuel units per second at 100% thrust

function checkLandingCondition(vx, vy, angle) {
  const maxSafeVx = 15;
  const maxSafeVy = 30;
  const maxSafeAngle = 5; // degrees

  if (Math.abs(vx) > maxSafeVx || Math.abs(vy) > maxSafeVy) {
    return { success: false, reason: "speed" };
  }
  if (Math.abs(angle) > maxSafeAngle) {
    return { success: false, reason: "angle" };
  }
  return { success: true, reason: null };
}

function updatePhysicsState(state, dt) {
  let fuel = state.fuel;
  let thrust = state.thrust;
  if (fuel <= 0) {
    fuel = 0;
    thrust = 0;
  }

  // Burn fuel
  const fuelBurned = thrust * FUEL_BURN_RATE * dt;
  fuel = Math.max(0, fuel - fuelBurned);

  // Thrust acceleration vector
  const rad = (state.angle * Math.PI) / 180;
  const ax = Math.sin(rad) * thrust * THRUST_ACCEL;
  const ay = -Math.cos(rad) * thrust * THRUST_ACCEL + GRAVITY;

  // Integrate velocity and position
  const vx = state.vx + ax * dt;
  const vy = state.vy + ay * dt;
  const x = state.x + vx * dt;
  const y = state.y + vy * dt;

  return {
    x,
    y,
    vx,
    vy,
    angle: state.angle,
    fuel,
    thrust
  };
}

function calculateLandingMultiplier(padWidth) {
  if (padWidth <= 25) return 10;
  if (padWidth <= 50) return 5;
  return 2;
}

module.exports = {
  checkLandingCondition,
  updatePhysicsState,
  calculateLandingMultiplier
};
